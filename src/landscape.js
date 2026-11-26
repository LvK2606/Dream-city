import * as T from 'three';
import {rng,groundHeight} from './world.js';
export const parks=[[-72,0],[72,0],[-136,-64],[136,-64]];
export function parkTreePosition(cx,cz,x,z){
 let dx=x-cx,dz=z-cz;
 if(Math.abs(dx)<2.8)dx=(dx<0?-1:1)*3.7;
 if(Math.abs(dz)<2.8)dz=(dz<0?-1:1)*3.7;
 return [cx+dx,cz+dz];
}
export function landscapeDetails({box,plane}){
 let paths=0,benches=0;
 for(const [x,z] of parks){
  plane('paving',x,.075,z,2.0,22,1,12);plane('paving',x,.079,z,22,2.0,12,1);paths+=2;
  plane('paving',x,.084,z,4.5,4.5,2,2);paths++;
  for(const s of [-1,1]){
   box('concrete',x+s*4.1,.08,z+1.6,1.8,.40,.55);box('metal',x+s*4.1,.48,z+1.6,1.85,.10,.57);benches++;
  }
 }
 return {parks:parks.length,paths,benches};
}
export function rockPositions(seed=5837){
 const rand=rng(seed),out=[];
 for(let i=0;i<480&&out.length<112;i++){
  const x=(rand()-.5)*500,z=(rand()-.5)*500;
  if(Math.abs(x)<28||(Math.abs(x)<166&&Math.abs(z)<128))continue;
  const y=groundHeight(x,z);if(y<2||rand()>.72)continue;
  const slope=Math.hypot(groundHeight(x+1,z)-groundHeight(x-1,z),groundHeight(x,z+1)-groundHeight(x,z-1))*.5;
  if(slope<.12&&rand()>.35)continue;
  out.push({x,y:y+.04,z,s:.45+rand()*1.9,a:rand()*Math.PI*2,t:rand()});
 }
 return out;
}
export function createRockScatter(scene){
 const rows=rockPositions(),geo=new T.IcosahedronGeometry(1,0),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),w=.85+.15*Math.sin(x*13+y*9+z*11);p.setXYZ(i,x*w,y*w,z*w)}
 geo.computeVertexNormals();const mesh=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:0xffffff,roughness:.96,flatShading:true}),rows.length),dummy=new T.Object3D(),c=new T.Color();
 rows.forEach((r,i)=>{dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(.11*Math.sin(r.a),r.a,.13*Math.cos(r.a));dummy.scale.set(r.s,r.s*.48,r.s*.72);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);c.setRGB(.31+r.t*.13,.29+r.t*.12,.25+r.t*.10);mesh.setColorAt(i,c)});
 mesh.receiveShadow=true;mesh.castShadow=false;mesh.computeBoundingSphere();scene.add(mesh);
 return {rocks:rows.length,triangles:rows.length*p.count/3,drawUpperBound:1};
}
