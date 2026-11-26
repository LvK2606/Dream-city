import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Preserve the identical static caster positions, but merge their depth-only submissions.
// Proxies are visible only inside the pinned Three.js r180 shadowMap.render call.
export function buildShadowProxies(scene,meshes){
 const regions=new Map(),material=new T.MeshBasicMaterial({color:0xffffff});
 let sourceTriangles=0;
 for(const mesh of meshes){
  const g=mesh.geometry,position=g.attributes.position;
  const depth=new T.BufferGeometry();depth.setAttribute('position',position.clone());
  depth.setIndex(g.index?g.index.clone():new T.BufferAttribute(Uint32Array.from({length:position.count},(_,i)=>i),1));
  sourceTriangles+=depth.index.count/3;
  g.computeBoundingBox();const b=g.boundingBox,c=b.getCenter(new T.Vector3());
  const key=b.max.x-b.min.x>192||b.max.z-b.min.z>192?'long':Math.floor(c.x/192)+':'+Math.floor(c.z/192);
  if(!regions.has(key))regions.set(key,[]);regions.get(key).push(depth);mesh.castShadow=false;
 }
 const proxies=[];let triangles=0;
 for(const items of regions.values()){
  const g=mergeGeometries(items,false);items.forEach(x=>x.dispose());if(!g)throw Error('shadow proxy merge failed');
  g.computeBoundingSphere();triangles+=g.index.count/3;
  const m=new T.Mesh(g,material);m.castShadow=true;m.visible=false;scene.add(m);proxies.push(m);
 }
 if(triangles!==sourceTriangles)throw Error('shadow proxy lost geometry');
 return {proxies,sourceMeshes:meshes.length,sourceTriangles,triangles,proxyMeshes:proxies.length};
}
export function trackShadowPass(renderer,proxies,onWork){
 const render=renderer.shadowMap.render;
 renderer.shadowMap.render=function(...args){
  const before={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  try{for(const m of proxies)m.visible=true;return render.apply(this,args)}
  finally{for(const m of proxies)m.visible=false;onWork({calls:Math.max(0,renderer.info.render.calls-before.calls),triangles:Math.max(0,renderer.info.render.triangles-before.triangles)})}
 };
}
