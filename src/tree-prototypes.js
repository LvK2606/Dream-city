import * as T from 'three';
import {Tree} from '@dgreenheck/ez-tree';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Original adapter: seeded EZ-Tree skeleton, bounded prototype meshes, photographic host textures.
// Three axial views are genuinely rendered from the source mesh, not painted foliage collages.
// Fixed crossed cards work in reflection passes too; not a camera-facing octahedral impostor.
export const TREE_ANGLES=[0,Math.PI/3,2*Math.PI/3];
export const TREE_TILE=256;
export function atlasUV(u,v,view,tiles=TREE_ANGLES.length,tile=TREE_TILE){
 const pad=2;return [(view*tile+pad+u*(tile-2*pad))/(tiles*tile),(pad+v*(tile-2*pad))/tile];
}
export function prototypeOptions(tree,species){
 const o=tree.options,h=[14,17,12][species],length=[8,5,9][species];
 o.seed=775+81*species;o.bark.textured=false;o.branch.levels=2;
 Object.assign(o.branch.children,{0:7,1:3,2:0});
 Object.assign(o.branch.length,{0:h,1:length,2:3.5});
 Object.assign(o.branch.radius,{0:.50,1:.43,2:.40});
 Object.assign(o.branch.sections,{0:8,1:5,2:3});
 Object.assign(o.branch.segments,{0:6,1:4,2:3});
 Object.assign(o.branch.start,{1:.36,2:.25});
 Object.assign(o.branch.angle,{1:[49,35,61][species],2:55});
 Object.assign(o.branch.gnarliness,{0:.09,1:.12,2:.13});
 o.leaves.count=9;o.leaves.size=[2.8,2.3,3.0][species];o.leaves.sizeVariance=.35;o.leaves.start=.15;o.leaves.billboard='double';
 return tree;
}
function bounds(wood,leaf){wood.computeBoundingBox();leaf.computeBoundingBox();return wood.boundingBox.clone().union(leaf.boundingBox)}
function normalizedPair(wood,leaf,b,scale){const center=b.getCenter(new T.Vector3());return [wood,leaf].map(g=>{const x=g.clone();x.translate(-center.x,-b.min.y,-center.z);x.scale(scale,scale,scale);x.computeBoundingBox();x.computeBoundingSphere();return x})}
export function createPrototype(species){
 const tree=prototypeOptions(new Tree(),species);
 try{
  tree.generateLODs([{distance:0,detail:{}},{distance:1,detail:{sectionStride:3,segmentFactor:.6,leafStride:3,leafScale:1.55,billboard:'single'}}]);
  const full=tree.lod.levels[0].object.children,near=tree.lod.levels[1].object.children;
  const b=bounds(full[0].geometry,full[1].geometry),height=[4.5,5.1,4.15][species],scale=height/(b.max.y-b.min.y);
  if(!Number.isFinite(scale)||scale<=0)throw Error('invalid EZ-Tree bounds');
  const [wood,leaf]=normalizedPair(full[0].geometry,full[1].geometry,b,scale);
  const [nearWood,nearLeaf]=normalizedPair(near[0].geometry,near[1].geometry,b,scale);
  const tri=(w,l)=>(w.index.count+l.index.count)/3;
  const detail=tri(wood,leaf),reduced=tri(nearWood,nearLeaf),bb=bounds(wood,leaf);
  const radius=Math.max(Math.abs(bb.min.x),Math.abs(bb.max.x),Math.abs(bb.min.z),Math.abs(bb.max.z));
  if(!(detail>reduced&&reduced>0&&reduced<=1600&&radius>0&&radius<6))throw Error('EZ-Tree prototype budget '+detail+'/'+reduced+' r='+radius);
  return {wood,leaf,nearWood,nearLeaf,height,radius,detail,reduced,species};
 }finally{
  const gs=new Set(),ms=new Set();tree.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material)}});for(const g of gs)g.dispose();for(const m of ms)m.dispose();
 }
}
export function makeBakedCards(radius,height,views=TREE_ANGLES){
 const gs=views.map((a,i)=>{const g=new T.PlaneGeometry(radius*2,height);const uv=g.attributes.uv;
  for(let j=0;j<uv.count;j++){const p=atlasUV(uv.getX(j),uv.getY(j),i,views.length);uv.setXY(j,...p)}
  g.rotateY(a);g.translate(0,height/2,0);return g;
 });const g=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());g.computeBoundingSphere();return g;
}
export function bakePrototype(renderer,p,photo){
 const tile=TREE_TILE,inside=tile-4,canvas=document.createElement('canvas');canvas.width=tile*TREE_ANGLES.length;canvas.height=tile;
 const ctx=canvas.getContext('2d'),target=new T.WebGLRenderTarget(inside,inside,{depthBuffer:true,stencilBuffer:false});
 target.texture.colorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),woodMat=new T.MeshBasicMaterial({color:0x786b52,toneMapped:false}),leafMat=new T.MeshBasicMaterial({map:photo,alphaTest:.35,side:T.DoubleSide,toneMapped:false});
 scene.add(new T.Mesh(p.wood,woodMat),new T.Mesh(p.leaf,leafMat));
 const radius=p.radius*1.12,height=p.height*1.08,centerY=p.height/2;
 const camera=new T.OrthographicCamera(-radius,radius,height/2,-height/2,.1,100);
 const previous=renderer.getRenderTarget(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear,shadow=renderer.shadowMap.enabled,xr=renderer.xr.enabled;
 const coverage=[];
 try{
  renderer.xr.enabled=false;renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(target);
  for(const [i,a] of TREE_ANGLES.entries()){
   camera.position.set(Math.sin(a)*20,centerY,Math.cos(a)*20);camera.lookAt(0,centerY,0);camera.updateMatrixWorld();
   renderer.clear();renderer.render(scene,camera);
   const buf=new Uint8Array(inside*inside*4);renderer.readRenderTargetPixels(target,0,0,inside,inside,buf);
   const im=ctx.createImageData(inside,inside);let nonzero=0;
   for(let y=0;y<inside;y++){const start=(inside-y-1)*inside*4;im.data.set(buf.subarray(start,start+inside*4),y*inside*4)}
   for(let j=3;j<im.data.length;j+=4)if(im.data[j]>100)nonzero++;
   const c=nonzero/(inside*inside);if(c<.025||c>.94)throw Error('invalid baked coverage '+c);coverage.push(c);
   ctx.putImageData(im,i*tile+2,2);
  }
 }finally{renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;renderer.shadowMap.enabled=shadow;renderer.xr.enabled=xr;target.dispose();woodMat.dispose();leafMat.dispose();}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;tex.minFilter=T.LinearFilter;tex.generateMipmaps=false;
 const g=makeBakedCards(radius,height);g.translate(0,(p.height-height)/2,0);g.computeBoundingSphere();
 return {texture:tex,geometry:g,coverage,radius,height};
}
