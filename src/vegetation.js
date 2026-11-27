import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rng,groundHeight} from './world.js';
import {createPrototype} from './tree-prototypes.js';
import {bakeDirectional,directionalMaterial,proceduralBakeObject,volumeCards,volumeMaterial,calibratedSourcePatches,silhouettePass} from './directional-impostor.js';
import {loadFullTree} from './full-tree.js';
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
// Seeded spatial ecology; preserves the original city and river exclusion boundaries.
export function forestPosition(x,z){
 const field=Math.sin(x*.038+z*.019)*Math.cos(z*.032-x*.013);
 const angle=Math.sin(x*.071-z*.047)*Math.PI;
 const nx=x+Math.cos(angle)*(1-field)*12,nz=z+Math.sin(angle)*(1-field)*12;
 if(Math.abs(nx)<24||(Math.abs(nx)<160&&Math.abs(nz)<123))return [x,z];
 return [Math.max(-237.5,Math.min(237.5,nx)),Math.max(-237.5,Math.min(237.5,nz))];
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
  if(lod===0&&j%2===0){const root=[.05,height*.3+height*.16*t,0],tip=[x,y-.18,z];limb(root,tip,.055,.017,4);const bend=[x*.70,y-.40,z*.70];limb(bend,[x+Math.cos(theta+.8)*.42,y+.30,z+Math.sin(theta+.8)*.42],.024,.007,3);}
  for(let k=0;k<cards;k++){
   const g=new T.PlaneGeometry(lod===3?radius*2.45:radius*(lod===2?1.65:1.10+rand()*.30),lod===3?height*.78:height*(lod===2?.49:.32+rand()*.10),lod===0?2:1,1);if(lod===0){const p=g.attributes.position;for(let q=0;q<p.count;q++)p.setZ(q,Math.abs(p.getX(q))*.22);g.computeVertexNormals();}
   g.rotateZ(lod===3?0:(rand()-.5)*.48);g.rotateX(lod===3?(k===2?.95:0):(rand()-.5)*.64);g.rotateY(theta+k*Math.PI/cards);
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
export function createVegetation(scene,rows,bark,renderer){
 let tex=leafTexture(),farTex=silhouette(tex);const depthMode={value:0};
 const mats=[tex,farTex].map(map=>new T.MeshStandardMaterial({map,color:0xffffff,alphaTest:.35,side:T.DoubleSide,roughness:.86}));
 // A subtle two-sided diffuse lift, not emission; neutral instance tint avoids multiplying green twice.
 for(const m of mats){m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.13;')};m.customProgramCacheKey=()=> 'foliage-soft-diffuse-v1'}
 const depths=[tex,farTex].map(map=>new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map,alphaTest:.35,side:T.DoubleSide}));
 const status={ready:false,loaded:false,source:'procedural-fallback'},pipeline={ready:false,loaded:false,library:'@dgreenheck/ez-tree@1.1.0',species:[],method:'hybrid-depth-relief-directional',cameraFacing:true,depthReprojection:true,fullModel:{loaded:false}};
 const task=photoAtlas().then(async a=>{const old=tex,oldFar=farTex;tex=a.tex;farTex=silhouette(tex);for(let i=0;i<2;i++){mats[i].map=depths[i].map=i?farTex:tex;mats[i].needsUpdate=depths[i].needsUpdate=true}old.dispose();oldFar.dispose();Object.assign(status,{loaded:true,source:a.id,coverage:a.coverage,bytes:a.bytes});await installPrototypes();status.ready=true;lastQuality='';}).catch(e=>{Object.assign(status,{ready:true,loaded:false,error:String(e)});Object.assign(pipeline,{ready:true,loaded:false,error:String(e)})});
 // 3 species x 4 tiers x 2 materials: max 24 main-pass tree submissions.
 // InstancedMesh avoids relying on WEBGL_multi_draw support; mobile compacts visible instances.
 const state=rows.map(()=>-1),drawnLod=rows.map(()=>-1),dummy=new T.Object3D(),color=new T.Color(),last=new T.Vector3(Infinity,Infinity,Infinity),lastRotation=new T.Quaternion(),frustum=new T.Frustum(),pv=new T.Matrix4(),bound=new T.Sphere();
 const plants=rows.map((r,i)=>({r,i,species:r.species??(r.c<.32?1:r.c<.64?0:2)}));
 const regions=new Set(rows.map(r=>Math.floor(r.x/128)+':'+Math.floor(r.z/128)));
 const geometry=Array.from({length:3},(_,s)=>Array.from({length:4},(_,l)=>makeTreeGeometry(s,l)));
 const batches=[];let lastQuality='',lastHeight=0,lastFov=0,lastAspect=0,stats;
 const understory=createUnderstory(scene,rows,mats[1]);
 for(let species=0;species<3;species++)for(let lod=0;lod<4;lod++){
  const geo=geometry[species][lod],capacity=plants.filter(p=>p.species===species).length,atlas=lod>=2?1:0;
  const wood=new T.InstancedMesh(geo.wood,bark,capacity),leaf=new T.InstancedMesh(geo.leaf,mats[atlas],capacity);
  for(const m of [wood,leaf]){m.count=0;m.visible=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.receiveShadow=true;scene.add(m)}
  leaf.customDepthMaterial=depths[atlas];wood.castShadow=leaf.castShadow=lod===0;
  batches.push({wood,leaf,count:0,triangles:(geo.wood.index.count+geo.leaf.index.count)/3,baked:false});
 }
 async function installPrototypes(){
  const pending=[];let full=null;
  try{
   try{full=await loadFullTree();pipeline.fullModel=full.report}catch(e){pipeline.fullModel={loaded:false,error:String(e)}}
   for(let s=0;s<3;s++){
    const p=await createPrototype(s);let source=null;
    try{
     source=s===0&&full?full:proceduralBakeObject(p,tex);
     const b=bakeDirectional(renderer,source.object,source.box);
     const relief=s===0&&full?calibratedSourcePatches(renderer,b):null;pending.push({p,b,relief,source:s===0&&full?'polyhaven-full-model':'ez-tree'});
    }catch(e){for(const g of [p.wood,p.leaf,p.nearWood,p.nearLeaf])g.dispose();throw e}
    finally{if(source&&source!==full)source.dispose()}
   }
   for(const {p,b,source,relief} of pending){const species=p.species,near=batches[species*4];near.wood.geometry.dispose();near.leaf.geometry.dispose();near.wood.geometry=p.nearWood;near.leaf.geometry=p.nearLeaf;near.triangles=p.reduced;
    const far=batches[species*4+3],midFar=batches[species*4+2],mid=batches[species*4+1],material=volumeMaterial(b);
    if(relief){near.wood.geometry.dispose();near.leaf.geometry.dispose();near.leaf.geometry=relief.geometry;const patchMaterial=volumeMaterial({...b,texture:relief.texture});patchMaterial.alphaTest=.5;patchMaterial.side=relief.frontOnly?T.FrontSide:T.DoubleSide;near.leaf.material=patchMaterial;near.leaf.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:relief.texture,alphaTest:.5,side:patchMaterial.side});near.baked=true;near.triangles=relief.geometry.index.count/3;}
    for(const batch of [mid,midFar,far]){
     const geo=batch===far?b.geometry:volumeCards(b,batch===mid);
     batch.leaf.geometry.dispose();batch.leaf.geometry=geo;batch.leaf.material=batch===far?directionalMaterial(b,depthMode):material;batch.leaf.customDepthMaterial=null;batch.leaf.receiveShadow=false;batch.baked=true;batch.triangles=geo.index.count/3;
    }
    pipeline.species.push({species,source,sourceTriangles:relief?full.report.renderedTriangles:p.detail,nearTriangles:near.triangles,farTriangles:far.triangles,midFarTriangles:midFar.triangles,midTriangles:mid.triangles,sharedFarAtlas:true,volumeCards:true,nearSource:source,reliefSamples:relief?.sampled??0,reliefVertices:relief?.total??0,nearMethod:relief?'source-depth-patches':'ez-tree-mesh',patchVoxels:relief?.voxels??0,patchDepthSamples:relief?.depthSamples??0,silhouette:relief?.silhouette??[],holdout:relief?.holdout??[],sourceAlphaPixels:relief?.covered??0,patchScale:relief?.scale??0,patchFrontOnly:relief?.frontOnly??false,patchTrials:relief?.trials??[],sourceMask:!!relief,silhouettePass:relief?silhouettePass(relief.silhouette):false,holdoutPass:relief?silhouettePass(relief.holdout):false,views:b.views,coverage:b.coverage,enhancedCoverage:b.enhancedCoverage,filteredMipmaps:b.texture.generateMipmaps,depthCoverage:b.depthCoverage,depthRanges:b.depthRanges,depthAtlasBytes:b.depthBytes.length,atlas:b.atlas,extent:b.extent,height:p.height});p.wood.dispose();p.leaf.dispose();
   }
   Object.assign(pipeline,{ready:true,loaded:true});
  }catch(e){for(const {p,b,relief} of pending){for(const g of [p.wood,p.leaf,p.nearWood,p.nearLeaf,b.geometry,relief?.geometry])g?.dispose();b.texture.dispose();b.depthTexture.dispose();relief?.texture.dispose()}Object.assign(pipeline,{ready:true,loaded:false,error:String(e)});}
  finally{full?.dispose()}
 }
 function update(camera,quality,viewportHeight){
  const pos=camera.position,fov=camera.fov,low=quality==='low';
  const sameView=!low||Math.abs(lastRotation.dot(camera.quaternion))>.99998;
  if(quality===lastQuality&&viewportHeight===lastHeight&&fov===lastFov&&camera.aspect===lastAspect&&sameView&&last.distanceToSquared(pos)<.16)return false;
  last.copy(pos);lastRotation.copy(camera.quaternion);lastQuality=quality;lastHeight=viewportHeight;lastFov=fov;lastAspect=camera.aspect;
  if(low){camera.updateMatrixWorld();pv.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(pv);}
  for(const b of batches)b.count=0;drawnLod.fill(-1);
  const counts=[0,0,0,0],visibleLevels=[0,0,0,0],nearSlots=[0,0,0];let triangles=0,activeBatches=0,culled=0;
  for(const {r,i,species} of (pipeline.loaded?[...plants].sort((a,b)=>Math.hypot(pos.x-a.r.x,pos.y-a.r.y,pos.z-a.r.z)-Math.hypot(pos.x-b.r.x,pos.y-b.r.y,pos.z-b.r.z)):plants)){
   const dist=Math.hypot(pos.x-r.x,pos.y-r.y-2*r.s,pos.z-r.z);let lod=pixelLOD(projectedTreePixels(r.s,dist,viewportHeight,fov),state[i],quality);state[i]=lod;if(pipeline.loaded&&lod===0){const cap=quality==='low'?2:quality==='high'?5:3;if(nearSlots[species]>=cap)lod=1;else nearSlots[species]++}counts[lod]++;
   // Low mode has neither reflection nor shadow passes; padded conservative sphere prevents edge popping.
   if(low){bound.center.set(r.x,r.y+2.7*r.s,r.z);bound.radius=4.4*r.s+1.2;if(!frustum.intersectsSphere(bound)){culled++;continue}}
   drawnLod[i]=lod;const b=batches[species*4+lod],index=b.count++;dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,r.a,0);dummy.scale.setScalar(r.s);dummy.updateMatrix();b.wood.setMatrixAt(index,dummy.matrix);b.leaf.setMatrixAt(index,dummy.matrix);
   const val=.88+r.c*.12;color.setRGB(val,val,val);b.leaf.setColorAt(index,color);visibleLevels[lod]++;triangles+=b.triangles;
  }
  for(const b of batches){if(b.count)activeBatches++;for(const m of [b.wood,b.leaf]){m.count=b.count;m.visible=b.count>0&&!(b.baked&&m===b.wood);if(m.visible){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere()}}}
  const lower=understory.update(camera,quality);stats={understory:lower,near:counts[0],mid:counts[1],far:counts[2]+counts[3],levels:counts,visibleLevels,total:rows.length,rendered:rows.length-culled,culled,triangles,source:status.source,species:3,legacyCanopy:false,regions:regions.size,activeBatches,mainPassDrawUpperBound:activeBatches*2,neutralTint:true,strategy:'global-species-lod/mobile-frustum'};
  return true;
 }
 return {update,setDepthMode:(enabled)=>{depthMode.value=enabled?1:0;return !!depthMode.value},qaTree:()=>{const candidates=plants.filter(p=>p.species===0&&p.r.x>165&&p.r.x<220&&Math.abs(p.r.z)<110);const score=p=>Math.min(...plants.filter(q=>q.i!==p.i).map(q=>Math.hypot(p.r.x-q.r.x,p.r.z-q.r.z)));const p=candidates.sort((a,b)=>score(b)-score(a))[0]??plants.find(p=>p.species===0);return p?{...p.r,index:p.i,species:p.species,lod:drawnLod[p.i]}:null},report:()=>({...stats,assets:{...status},pipeline:{...pipeline,depthEnabled:!!depthMode.value,defaultColorTaps:4,depthModeColorTaps:8,depthModeDepthTaps:4}})};
}

 // Original undergrowth: local seeded shrub clusters and grass tufts, two instanced draws.
function createUnderstory(scene,rows,leafMat){
 const rand=rng(81273),positions=[];
 for(const r of rows){if(Math.abs(r.x)<24||(Math.abs(r.x)<160&&Math.abs(r.z)<123)||rand()>.48)continue;
  for(let i=0;i<2;i++){const x=r.x+(rand()-.5)*3.8,z=r.z+(rand()-.5)*3.8;
   if(Math.abs(x)<24||(Math.abs(x)<160&&Math.abs(z)<123))continue;
   positions.push({x,z,y:Math.max(0,groundHeight(x,z)),s:.55+rand()*.7,a:rand()*Math.PI*2,c:rand()});
  }}
 const cards=[];for(let i=0;i<3;i++){const g=new T.PlaneGeometry(1.6,.9);g.rotateY(i*Math.PI/3);g.translate(0,.45,0);cards.push(g)}
 const shrubGeo=mergeGeometries(cards,false);cards.forEach(g=>g.dispose());
 const p=[],indices=[];for(let i=0;i<5;i++){const a=i*2.399963,r=.12+i*.035,x=Math.cos(a)*r,z=Math.sin(a)*r,j=p.length/3;
  p.push(x-.035,0,z,x+.035,0,z,x+.10*Math.cos(a),.35+i*.035,z+.14*Math.sin(a));indices.push(j,j+1,j+2)}
 const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute(p,3));grassGeo.setIndex(indices);grassGeo.computeVertexNormals();
 const grassMat=new T.MeshStandardMaterial({color:0x718d43,roughness:.95,side:T.DoubleSide});
 const shrubs=new T.InstancedMesh(shrubGeo,leafMat,positions.length),grass=new T.InstancedMesh(grassGeo,grassMat,positions.length);
 for(const m of [shrubs,grass]){m.count=0;m.visible=false;m.receiveShadow=true;m.castShadow=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(m)}
 const dummy=new T.Object3D(),c=new T.Color();
 function update(camera,quality){let a=0,b=0;const radius=quality==='low'?45:quality==='high'?105:78;
  for(const r of positions){if(Math.hypot(camera.position.x-r.x,camera.position.y-r.y,camera.position.z-r.z)>radius)continue;
   dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,r.a,0);dummy.scale.setScalar(r.s);dummy.updateMatrix();
   const m=r.c<.55?shrubs:grass,i=r.c<.55?a++:b++;m.setMatrixAt(i,dummy.matrix);c.setScalar(.83+r.c*.17);m.setColorAt(i,c);
  }
  for(const [m,n] of [[shrubs,a],[grass,b]]){m.count=n;m.visible=n>0;if(n){m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;m.computeBoundingSphere()}}
  return {population:positions.length,shrubs:a,grass:b,drawUpperBound:Number(a>0)+Number(b>0),triangles:a*6+b*5};
 }
 return {update};
}
