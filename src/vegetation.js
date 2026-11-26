import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rng} from './world.js';
// Original geometry; optional CC0 photographic leaf atlas. Screen-space LOD with hysteresis.
export function treeLOD(distance,previous,quality){
 const [a,b]=quality==='high'?[55,135]:quality==='medium'?[38,95]:[23,58];
 const h=4;
 if(previous===0&&distance<a+h)return 0;
 if(previous===2&&distance>b-h)return 2;
 if(distance<a-(previous===1?h:0))return 0;
 if(distance>b+(previous===1?h:0))return 2;
 return 1;
}
export function projectedTreePixels(scale,distance,viewportHeight,fov){
 return 4.8*scale*viewportHeight/(2*Math.tan(fov*Math.PI/360)*Math.max(distance,1));
}
export function pixelLOD(p,previous,quality){
 const thresholds=quality==='high'?[100,48,19]:quality==='medium'?[125,58,23]:[165,76,30];
 let target=thresholds.findIndex(t=>p>=t);if(target<0)target=3;
 if(previous>=0&&previous<4&&target!==previous){
  if(target<previous&&p<thresholds[target]*1.12)return previous;
  if(target>previous&&p>thresholds[previous]*.88)return previous;
 }
 return target;
}
export function makeTreeGeometry(species,lod){
 const rand=rng(775+species*81), wood=[],leaf=[];
 const taper=species===1, height=taper?5.1:species===2?4.15:4.5, radius=taper?1.35:species===2?2.0:1.7;
 function limb(a,b,r0,r1,sides){
  const p=new T.Vector3(...a),q=new T.Vector3(...b),d=q.clone().sub(p);
  const g=new T.CylinderGeometry(r1,r0,d.length(),sides,1);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));
  g.translate(...p.add(q).multiplyScalar(.5).toArray());wood.push(g);
 }
 limb([0,0,0],[.09,height*.62,0],.18,.075,lod===0?7:lod===3?4:5);
 const clusters=lod===0?12:lod===1?6:lod===2?3:1, cards=lod===0?3:lod===1?2:lod===2?2:3;
 for(let j=0;j<clusters;j++){
  const theta=j*2.399963, t=(j+.5)/clusters, y=lod===3?height*.66:height*(.46+.48*t);
  const reach=lod===3?0:radius*(.25+.48*Math.sin(Math.PI*t))*(.85+rand()*.3);
  const x=Math.cos(theta)*reach,z=Math.sin(theta)*reach;
  if(lod===0&&j%2===0)limb([.05,height*.3+height*.16*t,0],[x,y-.18,z],.055,.017,4);
  for(let k=0;k<cards;k++){
   const g=new T.PlaneGeometry(lod===3?radius*2.45:radius*(lod===2?1.65:1.10+rand()*.30),lod===3?height*.78:height*(lod===2?.49:.32+rand()*.10));
   g.rotateZ(lod===3?0:(rand()-.5)*.48);g.rotateX(lod===3?0:(rand()-.5)*.64);g.rotateY(theta+k*Math.PI/cards);
   g.translate(x,y,z);leaf.push(g);
  }
 }
 const merge=a=>{const g=mergeGeometries(a,false);a.forEach(x=>x.dispose());g.computeBoundingSphere();return g};
 return {wood:merge(wood),leaf:merge(leaf)};
}
function leafTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),rand=rng(6617);
 // Layer irregular elliptical leaves, veins and thin twigs on transparent canvas.
 for(let j=0;j<21;j++){
  const a=j*2.399963,r=.78*Math.sqrt(rand()),x=128+Math.cos(a)*r*111,y=128+Math.sin(a)*r*111;
  c.strokeStyle='rgba(87,79,43,.8)';c.lineWidth=1.4;c.beginPath();c.moveTo(128,150);c.lineTo(x,y);c.stroke();
  for(let k=0;k<17;k++){
   const angle=rand()*Math.PI*2,dist=Math.sqrt(rand())*30,px=x+Math.cos(angle)*dist,py=y+Math.sin(angle)*dist;
   if(Math.hypot(px-128,py-128)>118)continue;
   c.save();c.translate(px,py);c.rotate(angle);
   const len=5+rand()*8,w=2.6+rand()*4,green=121+Math.floor(rand()*69);
   c.fillStyle='rgb('+Math.floor(green*.71)+','+green+','+Math.floor(green*.46)+')';
   c.beginPath();c.moveTo(-len,0);c.quadraticCurveTo(0,-w*1.7,len,0);c.quadraticCurveTo(0,w*1.7,-len,0);c.fill();
   c.strokeStyle='rgba(170,181,102,.38)';c.lineWidth=.65;c.beginPath();c.moveTo(-len+1,0);c.lineTo(len-1,0);c.stroke();c.restore();
  }
 }
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
// Build a full silhouette atlas from actual leaf/branch maps; alpha is composited in linear-independent byte space.
async function photoAtlas(){
 const r=await fetch('/vegetation-assets/manifest.json');if(!r.ok)throw Error('vegetation manifest HTTP '+r.status);
 const m=await r.json();if(!m.ready)throw Error(m.error||'photo leaves unavailable');
 const loader=new T.TextureLoader();
 const [diff,alpha]=await Promise.all([loader.loadAsync('/vegetation-assets/'+m.diff),loader.loadAsync('/vegetation-assets/'+m.alpha)]);
 try{
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(diff.image,0,0,512,512);const d=ctx.getImageData(0,0,512,512);
  ctx.clearRect(0,0,512,512);ctx.drawImage(alpha.image,0,0,512,512);const a=ctx.getImageData(0,0,512,512);
  let visible=0;for(let i=0;i<d.data.length;i+=4){d.data[i+3]=a.data[i];if(a.data[i]>100)visible++;}
  if(visible<512*512*.04||visible>512*512*.96)throw Error('invalid leaf opacity coverage');
  ctx.putImageData(d,0,0);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return {tex,coverage:visible/(512*512),bytes:m.bytes,id:m.id};
 }finally{diff.dispose();alpha.dispose()}
}
function silhouette(tex){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),rand=rng(279);
 for(let i=0;i<24;i++){const a=i*2.399963,r=Math.sqrt((i+.5)/24)*175,x=256+Math.cos(a)*r,y=252+Math.sin(a)*r*.88;
  ctx.save();ctx.translate(x,y);ctx.rotate((rand()-.5)*1.4);const w=152+rand()*72;ctx.drawImage(tex.image,-w/2,-w/2,w,w);ctx.restore()}
 const out=new T.CanvasTexture(c);out.colorSpace=T.SRGBColorSpace;out.anisotropy=4;return out;
}
export function createVegetation(scene,rows,bark){
 let tex=leafTexture(),farTex=silhouette(tex);
 const mats=[tex,farTex].map(map=>new T.MeshStandardMaterial({map,color:0xffffff,alphaTest:.35,side:T.DoubleSide,roughness:.86}));
 // A subtle two-sided diffuse lift, not emission; neutral instance tint avoids multiplying green twice.
 for(const m of mats){m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.13;')};m.customProgramCacheKey=()=> 'foliage-soft-diffuse-v1'}
 const depths=[tex,farTex].map(map=>new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map,alphaTest:.35,side:T.DoubleSide}));
 const status={ready:false,loaded:false,source:'procedural-fallback'};
 const task=photoAtlas().then(a=>{const old=tex,oldFar=farTex;tex=a.tex;farTex=silhouette(tex);for(let i=0;i<2;i++){mats[i].map=depths[i].map=i?farTex:tex;mats[i].needsUpdate=depths[i].needsUpdate=true}old.dispose();oldFar.dispose();Object.assign(status,{ready:true,loaded:true,source:a.id,coverage:a.coverage,bytes:a.bytes});lastQuality='';}).catch(e=>Object.assign(status,{ready:true,loaded:false,error:String(e)}));
 const groups=new Map(),state=rows.map(()=>-1),dummy=new T.Object3D(),color=new T.Color(),last=new T.Vector3(Infinity,Infinity,Infinity);let lastQuality='',lastHeight=0,lastFov=0,stats;
 // Spatial groups bound each instance buffer to its own region, allowing native camera and reflection frustum culling.
 rows.forEach((r,i)=>{const species=r.c<.32?1:r.c<.64?0:2,key=Math.floor(r.x/128)+':'+Math.floor(r.z/128)+':'+species;let g=groups.get(key);if(!g){g={species,rows:[],batches:[]};groups.set(key,g)}g.rows.push({r,i})});
 const geometry=Array.from({length:3},(_,s)=>Array.from({length:4},(_,l)=>makeTreeGeometry(s,l)));
 for(const g of groups.values())for(let lod=0;lod<4;lod++){
  const geo=geometry[g.species][lod],capacity=g.rows.length,atlas=lod>=2?1:0;
  const wood=new T.InstancedMesh(geo.wood,bark,capacity),leaf=new T.InstancedMesh(geo.leaf,mats[atlas],capacity);
  for(const m of [wood,leaf]){m.count=0;m.visible=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.receiveShadow=true;scene.add(m)}
  leaf.customDepthMaterial=depths[atlas];wood.castShadow=leaf.castShadow=lod===0;
  g.batches.push({wood,leaf,count:0,triangles:(geo.wood.index.count+geo.leaf.index.count)/3});
 }
 function update(camera,quality,viewportHeight){
  const pos=camera.position,fov=camera.fov;
  if(quality===lastQuality&&viewportHeight===lastHeight&&fov===lastFov&&last.distanceToSquared(pos)<1)return false;
  last.copy(pos);lastQuality=quality;lastHeight=viewportHeight;lastFov=fov;
  const counts=[0,0,0,0];let triangles=0,activeBatches=0;
  for(const g of groups.values()){
   for(const b of g.batches)b.count=0;
   for(const {r,i} of g.rows){
    const dist=Math.hypot(pos.x-r.x,pos.y-r.y-2*r.s,pos.z-r.z),lod=pixelLOD(projectedTreePixels(r.s,dist,viewportHeight,fov),state[i],quality);state[i]=lod;
    const b=g.batches[lod],index=b.count++;dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,r.a,0);dummy.scale.setScalar(r.s);dummy.updateMatrix();b.wood.setMatrixAt(index,dummy.matrix);b.leaf.setMatrixAt(index,dummy.matrix);
    const v=.88+r.c*.12;color.setRGB(v,v,v);b.leaf.setColorAt(index,color);counts[lod]++;triangles+=b.triangles;
   }
   for(const b of g.batches){if(b.count)activeBatches++;for(const m of [b.wood,b.leaf]){m.count=b.count;m.visible=b.count>0;if(b.count){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere()}}}
  }
  stats={near:counts[0],mid:counts[1],far:counts[2]+counts[3],levels:counts,total:rows.length,triangles,source:status.source,species:3,legacyCanopy:false,regions:groups.size,activeBatches,neutralTint:true};return true;
 }
 return {update,report:()=>({...stats,assets:{...status}})};
}
