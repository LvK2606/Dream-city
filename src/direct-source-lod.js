import * as T from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
import {compareSourceObjectSilhouette,silhouettePass} from './directional-impostor.js';
const TRI_CAP=1536;
function triangleCount(g){return (g.index?.count??g.attributes.position.count)/3}
export function allocateTriangleBudgets(counts,cap=TRI_CAP){
 if(!counts.length||counts.some(n=>!Number.isInteger(n)||n<1)||!Number.isInteger(cap)||cap<counts.length)throw Error('invalid source triangle allocation');
 const total=counts.reduce((a,b)=>a+b,0),target=Math.min(total,cap),out=counts.map(n=>Math.min(n,Math.max(1,Math.floor(target*n/total))));
 while(out.reduce((a,b)=>a+b,0)<target){let i=-1;for(let j=0;j<counts.length;j++)if(out[j]<counts[j]&&(i<0||counts[j]/(out[j]+1)>counts[i]/(out[i]+1)))i=j;if(i<0)break;out[i]++}
 while(out.reduce((a,b)=>a+b,0)>target){let i=-1;for(let j=0;j<out.length;j++)if(out[j]>1&&(i<0||out[j]>out[i]))i=j;if(i<0)throw Error('allocation overflow');out[i]--}
 return out;
}
function sourceGroups(source){
 const groups=new Map();
 source.object.updateMatrixWorld(true);
 source.object.traverse(o=>{
  if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,ix=g.index;
  if(!p||!uv)throw Error('source mesh missing position/UV');
  const materials=Array.isArray(o.material)?o.material:[o.material],ranges=Array.isArray(o.material)?g.groups:[{start:0,count:ix?.count??p.count,materialIndex:0}],normalMatrix=new T.Matrix3().getNormalMatrix(o.matrixWorld);
  for(const range of ranges){
   const m=materials[range.materialIndex],key=[m.map?.uuid??'',m.alphaMap?.uuid??'',m.color.getHex(),m.alphaTest,m.side].join(':');
   if(!groups.has(key))groups.set(key,{material:m,position:[],normal:[],uv:[],indices:[],weld:new Map()});
   const out=groups.get(key),a=new T.Vector3(),b=new T.Vector3();
   for(let j=range.start;j<range.start+range.count;j++){
    const i=ix?ix.getX(j):j;a.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(n)b.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();else b.set(0,1,0);
    const u=uv.getX(i),v=uv.getY(i),key=[...a.toArray(),...b.toArray(),u,v].map(v=>Math.round(v*100000)).join(',');
    let k=out.weld.get(key);if(k===undefined){k=out.position.length/3;out.weld.set(key,k);out.position.push(...a.toArray());out.normal.push(...b.toArray());out.uv.push(u,v)}out.indices.push(k);
   }
  }
 });
 return [...groups.values()].map(({material,position,normal,uv,indices})=>({material,position:new Float32Array(position),normal:new Float32Array(normal),uv:new Float32Array(uv),indices:new Uint32Array(indices)}));
}
function compactGeometry(group,index){
 const remap=new Map(),p=[],n=[],uv=[],ix=[];
 for(const j of index){let i=remap.get(j);if(i===undefined){i=p.length/3;remap.set(j,i);p.push(...group.position.subarray(j*3,j*3+3));n.push(...group.normal.subarray(j*3,j*3+3));uv.push(...group.uv.subarray(j*2,j*2+2))}ix.push(i)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeBoundingBox();g.computeBoundingSphere();return g;
}
// When source seams prevent meshopt reaching the target, retain original
// triangles across spatial cells rather than arbitrarily taking a prefix.
export function spatialTriangleSubset(position,indices,target){
 const count=indices.length/3;if(count<=target)return indices;
 const box=new T.Box3();for(let i=0;i<position.length;i+=3)box.expandByPoint(new T.Vector3(position[i],position[i+1],position[i+2]));
 const size=box.getSize(new T.Vector3()),cell=Math.max(size.x,size.y,size.z)/Math.max(2,Math.cbrt(target)*1.4),buckets=new Map();
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),center=new T.Vector3();
 for(let i=0;i<count;i++){a.fromArray(position,indices[i*3]*3);b.fromArray(position,indices[i*3+1]*3);c.fromArray(position,indices[i*3+2]*3);center.copy(a).add(b).add(c).multiplyScalar(1/3);const area=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length();if(area<=1e-12)continue;const key=center.sub(box.min).toArray().map(v=>Math.floor(v/cell)).join(',');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({i,area})}
 const lists=[...buckets.values()];for(const list of lists)list.sort((a,b)=>b.area-a.area||a.i-b.i);lists.sort((a,b)=>b[0].area-a[0].area||a[0].i-b[0].i);
 const out=[];for(let k=0;out.length/3<target;k++){let more=false;for(const list of lists){if(!list[k])continue;more=true;const i=list[k].i*3;out.push(indices[i],indices[i+1],indices[i+2]);if(out.length/3===target)break}if(!more)break}
 return new Uint32Array(out);
}
export async function directSourceLOD(renderer,source,bake){
 await MeshoptSimplifier.ready;
 const groups=sourceGroups(source);if(!groups.length||groups.length>2)return {ready:false,reason:'source material batches '+groups.length,trials:[]};
 const counts=groups.map(g=>g.indices.length/3),budgets=allocateTriangleBudgets(counts),trials=[];let best=null,bestRank=-Infinity;
 try{
  for(const profile of [{error:.08,uv:1,normal:.2},{error:.2,uv:.35,normal:.15},{error:.5,uv:.08,normal:.05}]){
   const parts=[],object=new T.Group();
   try{
    for(let i=0;i<groups.length;i++){
     const g=groups[i],attrs=new Float32Array(g.position.length/3*5);
     for(let j=0;j<g.position.length/3;j++){attrs.set(g.uv.subarray(j*2,j*2+2),j*5);attrs.set(g.normal.subarray(j*3,j*3+3),j*5+2)}
     let [ix,error]=MeshoptSimplifier.simplifyWithAttributes(g.indices,g.position,3,attrs,5,[profile.uv,profile.uv,profile.normal,profile.normal,profile.normal],null,budgets[i]*3,profile.error);
     const simplifiedTriangles=ix.length/3;
     ix=spatialTriangleSubset(g.position,ix,budgets[i]);
     if(!ix.length)throw Error('empty direct source geometry');
     const geometry=compactGeometry(g,ix),m=g.material;
     // Preserve original cutout, color, UV, sides and texture; QA uses the same
     // alpha inputs as runtime. Source texture clones survive source disposal.
     const map=m.map?.clone()??null,alphaMap=m.alphaMap?.clone()??null;
     if(map)map.needsUpdate=true;if(alphaMap)alphaMap.needsUpdate=true;
     const material=new T.MeshStandardMaterial({map,alphaMap,color:m.color,alphaTest:m.alphaTest,side:m.side,roughness:.9});
     const depthMaterial=new T.MeshDepthMaterial({map,alphaMap,alphaTest:m.alphaTest,side:m.side,depthPacking:T.RGBADepthPacking});
     const mask=new T.MeshBasicMaterial({map,alphaMap,color:m.color,alphaTest:m.alphaTest,side:m.side,toneMapped:false});
     object.add(new T.Mesh(geometry,mask));parts.push({geometry,material,depthMaterial,mask,sourceTriangles:counts[i],simplifiedTriangles,error,triangles:triangleCount(geometry)});
    }
    const triangles=parts.reduce((n,p)=>n+p.triangles,0);if(triangles>TRI_CAP)throw Error('direct source cap');
    const silhouette=compareSourceObjectSilhouette(renderer,bake,object),pass=silhouettePass(silhouette),mean=silhouette.reduce((n,s)=>n+s.iou,0)/6;
    const violation=silhouette.reduce((n,s)=>n+Math.max(0,s.areaRatio-1.55,.65-s.areaRatio)+Math.max(0,.4-s.iou),0),rank=(pass?10:0)+mean-violation;
    trials.push({profile,triangles,mean,pass,silhouette,parts:parts.map(p=>({triangles:p.triangles,sourceTriangles:p.sourceTriangles,simplifiedTriangles:p.simplifiedTriangles,error:p.error}))});
    if(rank>bestRank){disposeDirect(best);best={parts,object,triangles,silhouette,profile};bestRank=rank}else disposeDirect({parts});
    if(pass)break;
   }catch(e){disposeDirect({parts});trials.push({profile,error:String(e)})}
  }
  if(!best)return {ready:false,reason:'no valid direct source candidate',trials};
  const holdout=compareSourceObjectSilhouette(renderer,bake,best.object,[[1,1],[3,1],[5,1],[7,1]]),ready=silhouettePass(best.silhouette)&&silhouettePass(holdout);
  const result={...best,holdout,ready,trials,materialBatches:groups.length};
  if(!ready){disposeDirect(result);return {ready:false,reason:'direct source silhouette gates failed',trials,holdout,materialBatches:groups.length}}
  for(const p of best.parts)p.mask.dispose();
  return result;
 }catch(e){disposeDirect(best);return {ready:false,reason:String(e),trials}}
}
export function disposeDirect(x){for(const p of x?.parts??[]){p.geometry.dispose();p.material.map?.dispose();p.material.alphaMap?.dispose();p.material.dispose();p.depthMaterial.dispose();p.mask.dispose()}}
