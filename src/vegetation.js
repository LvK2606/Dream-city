import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rng} from './world.js';
// Original procedural foliage cards, not scanned assets. Distance LOD with hysteresis.
export function treeLOD(distance,previous,quality){
 const [a,b]=quality==='high'?[55,135]:quality==='medium'?[38,95]:[23,58];
 const h=4;
 if(previous===0&&distance<a+h)return 0;
 if(previous===2&&distance>b-h)return 2;
 if(distance<a-(previous===1?h:0))return 0;
 if(distance>b+(previous===1?h:0))return 2;
 return 1;
}
export function makeTreeGeometry(species,lod){
 const rand=rng(775+species*81), wood=[],leaf=[];
 const taper=species===1, height=taper?5.1:4.5, radius=taper?1.35:1.7;
 function limb(a,b,r0,r1,sides){
  const p=new T.Vector3(...a),q=new T.Vector3(...b),d=q.clone().sub(p);
  const g=new T.CylinderGeometry(r1,r0,d.length(),sides,1);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));
  g.translate(...p.add(q).multiplyScalar(.5).toArray());wood.push(g);
 }
 limb([0,0,0],[.09,height*.62,0],.18,.075,lod===0?7:5);
 const clusters=lod===0?12:lod===1?6:1, cards=lod===0?3:lod===1?2:3;
 for(let j=0;j<clusters;j++){
  const theta=j*2.399963, t=(j+.5)/clusters, y=lod===2?height*.66:height*(.46+.48*t);
  const reach=lod===2?0:radius*(.25+.48*Math.sin(Math.PI*t))*(.85+rand()*.3);
  const x=Math.cos(theta)*reach,z=Math.sin(theta)*reach;
  if(lod===0&&j%2===0)limb([.05,height*.3+height*.16*t,0],[x,y-.18,z],.055,.017,4);
  for(let k=0;k<cards;k++){
   const g=new T.PlaneGeometry(lod===2?radius*2.2:radius*(1.05+rand()*.30),lod===2?height*.72:height*(.28+rand()*.10));
   g.rotateZ(lod===2?0:(rand()-.5)*.48);g.rotateX(lod===2?0:(rand()-.5)*.64);g.rotateY(theta+k*Math.PI/cards);
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
   const len=5+rand()*8,w=2.6+rand()*4,green=91+Math.floor(rand()*56);
   c.fillStyle='rgb('+Math.floor(green*.60)+','+green+','+Math.floor(green*.37)+')';
   c.beginPath();c.moveTo(-len,0);c.quadraticCurveTo(0,-w*1.7,len,0);c.quadraticCurveTo(0,w*1.7,-len,0);c.fill();
   c.strokeStyle='rgba(170,181,102,.38)';c.lineWidth=.65;c.beginPath();c.moveTo(-len+1,0);c.lineTo(len-1,0);c.stroke();c.restore();
  }
 }
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
export function createVegetation(scene,rows,bark){
 const tex=leafTexture(),leafMat=new T.MeshStandardMaterial({map:tex,color:0xffffff,alphaTest:.35,side:T.DoubleSide,roughness:.88});
 // Alpha-tested depth material is required to avoid opaque rectangular leaf shadows.
 const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:tex,alphaTest:.35,side:T.DoubleSide});
 const batches=[],state=rows.map(()=>-1),dummy=new T.Object3D(),color=new T.Color(),last=new T.Vector3(Infinity,Infinity,Infinity);let lastQuality='',stats;
 for(let species=0;species<2;species++)for(let lod=0;lod<3;lod++){
  const geo=makeTreeGeometry(species,lod),capacity=rows.length;
  const wood=new T.InstancedMesh(geo.wood,bark,capacity),leaf=new T.InstancedMesh(geo.leaf,leafMat,capacity);
  for(const m of [wood,leaf]){m.count=0;m.visible=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.receiveShadow=true;scene.add(m)}
  leaf.customDepthMaterial=depth;wood.castShadow=leaf.castShadow=lod===0;
  batches.push({wood,leaf,count:0,triangles:(geo.wood.index.count+geo.leaf.index.count)/3});
 }
 function update(camera,quality){
  if(quality===lastQuality&&last.distanceToSquared(camera)<4)return false;
  last.copy(camera);lastQuality=quality;for(const b of batches)b.count=0;
  const counts=[0,0,0];let triangles=0;
  rows.forEach((r,i)=>{
   const dist=Math.hypot(camera.x-r.x,camera.y-r.y,camera.z-r.z),lod=treeLOD(dist,state[i],quality);state[i]=lod;
   const species=r.c<.42?1:0,b=batches[species*3+lod],index=b.count++;
   dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,r.a,0);dummy.scale.setScalar(r.s);dummy.updateMatrix();
   b.wood.setMatrixAt(index,dummy.matrix);b.leaf.setMatrixAt(index,dummy.matrix);
   color.setHSL(.22+r.c*.08,.20+r.c*.10,.61+r.c*.14);b.leaf.setColorAt(index,color);
   counts[lod]++;triangles+=b.triangles;
  });
  for(const b of batches)for(const m of [b.wood,b.leaf]){m.count=b.count;m.visible=b.count>0;if(b.count){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere()}}
  stats={near:counts[0],mid:counts[1],far:counts[2],total:rows.length,triangles,source:'original-alpha-cutout',species:2,legacyCanopy:false};return true;
 }
 return {update,report:()=>stats};
}
