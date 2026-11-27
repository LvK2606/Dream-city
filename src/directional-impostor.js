import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Original WebGL2 azimuth/elevation atlas. No upstream shader copied.
// 8 azimuths x 4 elevations, one quad per instance; reflection uses its actual render camera.
export const AZIMUTHS=8,ELEVATIONS=[-30,0,35,70],TILE=256,GUTTER=2;
export function directionCell(yaw,elevation){
 const a=((yaw/(2*Math.PI)*AZIMUTHS)%AZIMUTHS+AZIMUTHS)%AZIMUTHS;
 let lo=0;while(lo<ELEVATIONS.length-2&&elevation>ELEVATIONS[lo+1])lo++;
 const w=Math.max(0,Math.min(1,(elevation-ELEVATIONS[lo])/(ELEVATIONS[lo+1]-ELEVATIONS[lo])));
 return {a0:Math.floor(a),a1:(Math.floor(a)+1)%AZIMUTHS,aw:a-Math.floor(a),e0:lo,e1:lo+1,ew:w};
}
// Original CPU alpha coverage filter; expands only from a neighboring covered sample.
// One texel at 256px, limited opacity, no filling of large gaps.
export function enhanceCoverage(bytes,w,h){
 const original=new Uint8ClampedArray(bytes);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=(y*w+x)*4;if(original[i+3]>=128)continue;
  let best=i;
  for(const off of [-w*4,-4,4,w*4])if(original[i+off+3]>original[best+3])best=i+off;
  if(best===i||original[best+3]<128)continue;
  const a=Math.round(original[best+3]*.55);if(a<=original[i+3])continue;
  for(let c=0;c<3;c++)bytes[i+c]=original[best+c];bytes[i+3]=a;
 }
 return bytes;
}
export function bakeDirectional(renderer,object,box){
 const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),extent=size.length()*.5*1.06;
 if(!Number.isFinite(extent)||extent<=0||extent>10)throw Error('invalid impostor extent');
 const tile=TILE,inside=tile-2*GUTTER,canvas=document.createElement('canvas');canvas.width=AZIMUTHS*tile;canvas.height=ELEVATIONS.length*tile;
 const ctx=canvas.getContext('2d'),target=new T.WebGLRenderTarget(inside,inside,{depthBuffer:true,stencilBuffer:false});target.texture.colorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.add(object);
 const range=extent*1.15,camera=new T.OrthographicCamera(-extent,extent,extent,-extent,20-range,20+range),coverage=[],enhancedCoverage=[],depthCoverage=[],depthRanges=[];
 const depthTarget=new T.WebGLRenderTarget(inside,inside,{depthBuffer:true,stencilBuffer:false});
 const depthBytes=new Uint8Array(canvas.width*canvas.height),materials=[];
 object.traverse(o=>{if(!o.isMesh)return;const source=o.material;
  const create=m=>new T.MeshDepthMaterial({depthPacking:T.BasicDepthPacking,map:m.map??null,alphaMap:m.alphaMap??null,alphaTest:m.alphaTest??0,side:m.side});
  const depth=Array.isArray(source)?source.map(create):create(source);materials.push({o,source,depth});
 });
 const prev=renderer.getRenderTarget(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear,shadow=renderer.shadowMap.enabled,xr=renderer.xr.enabled;
 try{
  renderer.xr.enabled=false;renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(target);
  for(let e=0;e<ELEVATIONS.length;e++)for(let a=0;a<AZIMUTHS;a++){
   const yaw=a*2*Math.PI/AZIMUTHS,pitch=ELEVATIONS[e]*Math.PI/180;
   camera.position.copy(center).addScaledVector(new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),20);camera.lookAt(center);camera.updateMatrixWorld();
   renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
   const bytes=new Uint8Array(inside*inside*4);renderer.readRenderTargetPixels(target,0,0,inside,inside,bytes);
   const im=ctx.createImageData(inside,inside);let count=0;
   for(let y=0;y<inside;y++){const start=(inside-y-1)*inside*4;im.data.set(bytes.subarray(start,start+inside*4),y*inside*4)}
   for(let j=3;j<im.data.length;j+=4)if(im.data[j]>100)count++;
   const c=count/(inside*inside);if(c<.008||c>.94)throw Error('invalid directional coverage '+c+' at '+a+'/'+e);coverage.push(c);
   // Fill one-pixel alpha gaps only inside this view. Preserve the original color of the selected adjacent leaf.
   enhanceCoverage(im.data,inside,inside);
   let weighted=0;for(let j=3;j<im.data.length;j+=4)weighted+=im.data[j]/255;
   enhancedCoverage.push(weighted/(inside*inside));
   ctx.putImageData(im,a*tile+GUTTER,(ELEVATIONS.length-1-e)*tile+GUTTER);
   // Same camera, alpha mask and mesh; record actual linear orthographic inverse depth.
   for(const m of materials)m.o.material=m.depth;
   const raw=new Uint8Array(inside*inside*4);
   try{renderer.setRenderTarget(depthTarget);renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(depthTarget,0,0,inside,inside,raw)}
   finally{for(const m of materials)m.o.material=m.source}
   let n=0,min=255,max=0;
   for(let y=0;y<inside;y++)for(let x=0;x<inside;x++){
    const i=(y*inside+x)*4,d=raw[i];if(raw[i+3]>100&&d>0){depthBytes[(e*tile+GUTTER+y)*canvas.width+a*tile+GUTTER+x]=d;n++;min=Math.min(min,d);max=Math.max(max,d)}
   }
   if(n<inside*inside*.008||max-min<3)throw Error('invalid rendered depth view '+a+'/'+e);
   depthCoverage.push(n/(inside*inside));depthRanges.push([min,max]);
  }
 }finally{renderer.setRenderTarget(prev);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;renderer.shadowMap.enabled=shadow;renderer.xr.enabled=xr;target.dispose();depthTarget.dispose();for(const m of materials){m.o.material=m.source;for(const d of (Array.isArray(m.depth)?m.depth:[m.depth]))d.dispose()}scene.remove(object)}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;
 const geometry=new T.PlaneGeometry(extent*2,extent*2);geometry.translate(center.x,center.y,center.z);geometry.computeBoundingSphere();geometry.boundingSphere.radius=extent*Math.SQRT2;
 const depthTexture=new T.DataTexture(depthBytes,canvas.width,canvas.height,T.RedFormat,T.UnsignedByteType);depthTexture.minFilter=depthTexture.magFilter=T.NearestFilter;depthTexture.generateMipmaps=false;depthTexture.needsUpdate=true;
 return {texture,depthTexture,depthBytes,geometry,coverage,enhancedCoverage,depthCoverage,depthRanges,depthRange:range,extent,center:center.toArray(),views:coverage.length,atlas:[canvas.width,canvas.height]};
}
// Use actual baked views, not an unrelated leaf collage, for volumetric mid-LOD.
// Four intersecting vertical planes plus a pitched canopy plane preserve aerial silhouettes.
export function volumeCards(bake,extra=false){
 const views=[{a:0,e:1},{a:1,e:1},{a:2,e:1},{a:3,e:1},{a:0,e:3}];
 if(extra)views.push({a:2,e:2},{a:0,e:2});
 const geos=views.map(({a,e})=>{
  const g=new T.PlaneGeometry(bake.extent*2,bake.extent*2),uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(a+(GUTTER+uv.getX(i)*(TILE-2*GUTTER))/TILE)/AZIMUTHS,(e+(GUTTER+uv.getY(i)*(TILE-2*GUTTER))/TILE)/ELEVATIONS.length);
  g.rotateX(-ELEVATIONS[e]*Math.PI/180);g.rotateY(a*2*Math.PI/AZIMUTHS);g.translate(...bake.center);return g;
 });
 const merged=mergeGeometries(geos,false);for(const g of geos)g.dispose();merged.computeBoundingSphere();return merged;
}
// Source-derived relief surface proxy for the external full tree. Each patch uses the
// same view texture and measured surface depth, not an unrelated procedural species.
export function reliefCards(bake){
 const views=Array.from({length:8},(_,a)=>({a,e:1})).concat([{a:0,e:2},{a:2,e:3}]);
 const [width,height]=bake.atlas,segments=8,geos=[];let sampled=0,total=0;
 if(!bake.depthBytes||bake.depthBytes.length!==width*height)throw Error('missing relief depth');
 for(const {a,e} of views){
  const g=new T.PlaneGeometry(bake.extent*2,bake.extent*2,segments,segments),p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
   const u=uv.getX(i),v=uv.getY(i),x=Math.round(GUTTER+u*(TILE-2*GUTTER-1)),y=Math.round(GUTTER+v*(TILE-2*GUTTER-1));
   let sum=0,count=0;
   for(let dy=-8;dy<=8;dy+=4)for(let dx=-8;dx<=8;dx+=4){
    const xx=x+dx,yy=y+dy;if(xx<GUTTER||xx>=TILE-GUTTER||yy<GUTTER||yy>=TILE-GUTTER)continue;
    const d=bake.depthBytes[(e*TILE+yy)*width+a*TILE+xx];if(d){sum+=d;count++}
   }
   total++;if(count){sampled++;p.setZ(i,Math.max(-bake.extent,Math.min(bake.extent,(sum/count/255*2-1)*bake.depthRange)))}
   uv.setXY(i,(a+(GUTTER+u*(TILE-2*GUTTER))/TILE)/AZIMUTHS,(e+(GUTTER+v*(TILE-2*GUTTER))/TILE)/ELEVATIONS.length);
  }
  g.computeVertexNormals();g.rotateX(-ELEVATIONS[e]*Math.PI/180);g.rotateY(a*2*Math.PI/AZIMUTHS);g.translate(...bake.center);geos.push(g);
 }
 const geometry=mergeGeometries(geos,false);for(const g of geos)g.dispose();geometry.computeBoundingSphere();
 if(!sampled||geometry.index.count/3>1600){geometry.dispose();throw Error('invalid relief proxy')}
 return {geometry,sampled,total};
}
// Disconnected, source-depth patches avoid stretching a continuous plane over empty canopy.
// Multi-view source geometry consistency, excludes four diagonal horizon
// holdouts. Mask neighborhood tolerates fine needles and pixel quantization.
export function patchConsistency(bake,center,right,up,half){
 const [width]=bake.atlas,inside=TILE-2*GUTTER,c=new T.Vector3(...bake.center),d=new T.Vector3(),p=new T.Vector3();let ok=0,total=0;
 for(const [a,e] of [[0,1],[2,1],[4,1],[6,1],[0,2],[2,2],[4,2],[6,2],[0,3],[2,3],[4,3],[6,3]]){
  const yaw=a*2*Math.PI/AZIMUTHS,pitch=ELEVATIONS[e]*Math.PI/180;
  const r=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),n=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),u=new T.Vector3().crossVectors(n,r);
  for(const [x,y] of [[0,0],[-.65,0],[.65,0],[0,-.65],[0,.65]]){
   p.copy(center).addScaledVector(right,x*half).addScaledVector(up,y*half);d.copy(p).sub(c);
   const px=Math.round((d.dot(r)/bake.extent*.5+.5)*(inside-1)),py=Math.round((d.dot(u)/bake.extent*.5+.5)*(inside-1));total++;
   if(px<0||py<0||px>=inside||py>=inside)continue;
   let hit=false;for(let yy=-3;yy<=3&&!hit;yy+=3)for(let xx=-3;xx<=3;xx+=3)if(px+xx>=0&&px+xx<inside&&py+yy>=0&&py+yy<inside&&bake.depthBytes[(e*TILE+GUTTER+py+yy)*width+a*TILE+GUTTER+px+xx]){hit=true;break}
   ok+=Number(hit);
  }
 }
 return ok/total;
}
export function sourcePatches(bake,patchScale=1,profile={}){
 const grid=profile.grid??12,step=profile.step??2,minimum=profile.minimum??3,voxelScale=profile.voxelScale??.8;
 if(![12,20,24,28,32].includes(grid)||![1,2].includes(step)||minimum<1||voxelScale<.5||voxelScale>1.2)throw Error('invalid patch profile');
 if(!Number.isFinite(patchScale)||patchScale<.7||patchScale>1)throw Error('invalid patch scale');
 const [width,height]=bake.atlas,inside=TILE-2*GUTTER,maxPatches=768,candidates=[];
 if(!bake.depthBytes||bake.depthBytes.length!==width*height)throw Error('missing source depth');
 const views=Array.from({length:8},(_,a)=>({a,e:1})).concat(profile.moreViews?Array.from({length:8},(_,a)=>({a,e:2})).concat([{a:0,e:3},{a:2,e:3},{a:4,e:3},{a:6,e:3}]):[{a:0,e:2},{a:2,e:2},{a:4,e:2},{a:6,e:2},{a:0,e:3}]);
 for(const {a,e} of views)for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
  const u0=x/grid,u1=(x+1)/grid,v0=y/grid,v1=(y+1)/grid;
  const ds=[];
  for(let yy=Math.floor(v0*inside);yy<Math.floor(v1*inside);yy+=step)
   for(let xx=Math.floor(u0*inside);xx<Math.floor(u1*inside);xx+=step){
    const d=bake.depthBytes[(e*TILE+GUTTER+yy)*width+a*TILE+GUTTER+xx];if(d)ds.push(d);
   }
  if(ds.length<minimum)continue;
  ds.sort((a,b)=>a-b);
  const median=ds[Math.floor(ds.length*.5)],spread=ds[Math.floor(ds.length*.9)]-ds[Math.floor(ds.length*.1)];
  const depth=Math.max(-bake.extent,Math.min(bake.extent,(median/255*2-1)*bake.depthRange));
  const yaw=a*2*Math.PI/AZIMUTHS,pitch=ELEVATIONS[e]*Math.PI/180;
  const right=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),normal=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),up=new T.Vector3().crossVectors(normal,right);
  const center=new T.Vector3(...bake.center).addScaledVector(right,((u0+u1)-1)*bake.extent).addScaledVector(up,((v0+v1)-1)*bake.extent).addScaledVector(normal,depth);
  // Sparse lower trunk patches are retained; reward well-supported foliage and coherent depth.
  const score=profile.moreViews?ds.length/(1+spread*.035)+(center.y<bake.center[1]*.8?3:0):ds.length/(1+spread*.015)+(center.y<bake.center[1]*.8?12:0);
  const coherence=profile.consistency?patchConsistency(bake,center,right,up,bake.extent/grid):1;
  if(profile.consistency&&coherence<profile.consistency)continue;
  candidates.push({a,e,u0,u1,v0,v1,center,right,up,normal,score:score*(.25+.75*coherence),spread,samples:ds.length});
 }
 candidates.sort((a,b)=>b.score-a.score);
 const selected=[],voxels=new Map(),cell=2*bake.extent/grid*voxelScale;
 for(const p of candidates){
  const key=p.center.toArray().map(v=>Math.floor(v/cell)).join(',');
  const normals=voxels.get(key)??[];
  // Keep at most two differently oriented patches per voxel; avoid repeated opaque layers.
  if(normals.length>=2||normals.some(n=>Math.abs(n.dot(p.normal))>.88))continue;
  normals.push(p.normal);voxels.set(key,normals);selected.push(p);if(selected.length>=maxPatches)break;
 }
 if(selected.length<24)throw Error('insufficient source patches '+selected.length);
 const pos=[],uv=[],idx=[],normal=[];
 for(const p of selected){
  const i=pos.length/3,half=bake.extent/grid*patchScale;
  for(const [x,y,u,v] of [[-1,-1,p.u0,p.v0],[1,-1,p.u1,p.v0],[1,1,p.u1,p.v1],[-1,1,p.u0,p.v1]]){
   const vtx=p.center.clone().addScaledVector(p.right,x*half).addScaledVector(p.up,y*half);
   pos.push(...vtx.toArray());normal.push(...p.normal.toArray());
   uv.push((p.a+(GUTTER+u*inside)/TILE)/AZIMUTHS,(p.e+(GUTTER+v*inside)/TILE)/ELEVATIONS.length);
  }
  idx.push(i,i+1,i+2,i,i+2,i+3);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geometry.setIndex(idx);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return {geometry,sampled:selected.length,total:candidates.length,voxels:voxels.size,depthSamples:selected.reduce((n,p)=>n+p.samples,0)};
}
// Actual source alpha mask vs actual proxy rendered alpha at matched orthographic views.
export function compareSourceSilhouette(renderer,bake,geometry,texture=bake.texture,side=T.DoubleSide,alphaTest=.28,views=[[0,1],[2,1],[4,1],[6,1],[1,2],[3,3]]){
 const material=new T.MeshBasicMaterial({map:texture,alphaTest,side,toneMapped:false}),object=new T.Mesh(geometry,material);
 try{return compareSourceObjectSilhouette(renderer,bake,object,views)}finally{material.dispose()}
}
export function compareSourceObjectSilhouette(renderer,bake,object,views=[[0,1],[2,1],[4,1],[6,1],[1,2],[3,3]]){
 const inside=TILE-2*GUTTER,[width]=bake.atlas,target=new T.WebGLRenderTarget(inside,inside,{depthBuffer:true,stencilBuffer:false}),scene=new T.Scene();scene.add(object);
 const camera=new T.OrthographicCamera(-bake.extent,bake.extent,bake.extent,-bake.extent,20-bake.depthRange,20+bake.depthRange),center=new T.Vector3(...bake.center),results=[];
 const prev=renderer.getRenderTarget(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear,shadow=renderer.shadowMap.enabled,xr=renderer.xr.enabled;
 try{
  renderer.xr.enabled=false;renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(target);
  for(const [a,e] of views){
   const yaw=a*2*Math.PI/AZIMUTHS,pitch=ELEVATIONS[e]*Math.PI/180;
   camera.position.copy(center).addScaledVector(new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),20);camera.lookAt(center);camera.updateMatrixWorld();
   renderer.clear();renderer.render(scene,camera);
   const bytes=new Uint8Array(inside*inside*4);renderer.readRenderTargetPixels(target,0,0,inside,inside,bytes);
   let source=0,proxy=0,intersection=0,union=0;
   for(let y=0;y<inside;y++)for(let x=0;x<inside;x++){
    const s=bake.depthBytes[(e*TILE+GUTTER+y)*width+a*TILE+GUTTER+x]>0,p=bytes[(y*inside+x)*4+3]>100;
    source+=Number(s);proxy+=Number(p);intersection+=Number(s&&p);union+=Number(s||p);
   }
   if(!source||!proxy||!union)throw Error('empty silhouette comparison');
   results.push({azimuth:a,elevation:e,source,proxy,intersection,union,iou:intersection/union,areaRatio:proxy/source});
  }
 }finally{renderer.setRenderTarget(prev);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;renderer.shadowMap.enabled=shadow;renderer.xr.enabled=xr;target.dispose();scene.remove(object)}
 return results;
}
// Reconstruct the original binary alpha mask from the matched depth pass.
 // Far-tree dilation is deliberately excluded from near proxy material.
export function restoreSourceAlpha(rgba,depth,width,height){
 if(rgba.length!==width*height*4||depth.length!==width*height)throw Error('source alpha dimensions');
 let count=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const covered=depth[(height-1-y)*width+x]>0;
  rgba[(y*width+x)*4+3]=covered?255:0;count+=Number(covered);
 }
 return count;
}
export function sourceMaskTexture(bake){
 const [w,h]=bake.atlas,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');ctx.drawImage(bake.texture.image,0,0);
 const pixels=ctx.getImageData(0,0,w,h),covered=restoreSourceAlpha(pixels.data,bake.depthBytes,w,h);
 if(!covered)throw Error('empty source alpha');
 ctx.putImageData(pixels,0,0);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;
 return {texture,covered};
}
export function silhouettePass(results){
 return results.length>0&&results.every(s=>s.iou>=.4&&s.areaRatio>=.65&&s.areaRatio<=1.55)&&results.reduce((n,s)=>n+s.iou,0)/results.length>=.55;
}
// Small deterministic bounded candidate set. Render and measure each candidate;
// never change acceptance limits to fit output. Independent diagonal views are
// evaluated only after selection and cannot influence the selected profile.
export function calibratedSourcePatches(renderer,bake,additional=false){
 const {texture,covered}=sourceMaskTexture(bake),trials=[];
 let best=null,score=-Infinity;
 try{
  const profiles=additional?[[1,false,24,.35],[1,false,28,.4],[1,false,32,.45],[1,false,32,.55],[.95,false,28,.4],[1,true,24,.35],[1,false,24,0],[1,false,12,0]]:[[1,false,12],[.9,false,12],[.8,false,12],[1,true,12]];
  for(const [scale,frontOnly,grid,consistency=0] of profiles){
   const profile=grid===12?{}:{grid,step:1,minimum:2,voxelScale:.85,moreViews:true,consistency};
   let candidate;try{candidate=sourcePatches(bake,scale,profile)}catch(e){trials.push({scale,frontOnly,grid,consistency,error:String(e),pass:false});continue}const side=frontOnly?T.FrontSide:T.DoubleSide;
   candidate.silhouette=compareSourceSilhouette(renderer,bake,candidate.geometry,texture,side,.5);
   const pass=silhouettePass(candidate.silhouette),mean=candidate.silhouette.reduce((n,s)=>n+s.iou,0)/6;
   const violation=candidate.silhouette.reduce((n,s)=>n+Math.max(0,s.areaRatio-1.55,.65-s.areaRatio)+Math.max(0,.4-s.iou),0);
   const rank=(pass?10:0)+mean-violation;
   trials.push({scale,frontOnly,grid,consistency,triangles:candidate.geometry.index.count/3,mean,pass,views:candidate.silhouette});
   if(rank>score){best?.geometry.dispose();best={...candidate,scale,frontOnly,grid};score=rank}else candidate.geometry.dispose();
   if(pass)break;
  }
  if(!best)throw Error('missing source patch candidate');
  best.holdout=compareSourceSilhouette(renderer,bake,best.geometry,texture,best.frontOnly?T.FrontSide:T.DoubleSide,.5,[[1,1],[3,1],[5,1],[7,1]]);
  return {...best,texture,covered,trials};
 }catch(e){best?.geometry.dispose();texture.dispose();throw e}
}
export function volumeMaterial(bake){
 const m=new T.MeshStandardMaterial({map:bake.texture,color:0xffffff,alphaTest:.28,side:T.DoubleSide,roughness:.92});
 m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.08;')};
 m.customProgramCacheKey=()=> 'tree-volume-atlas-v1';return m;
}
export function directionalMaterial(bake,depthMode={value:0},octMode={value:1},oct=null){
 const mat=new T.MeshStandardMaterial({map:bake.texture,color:0xffffff,alphaTest:.35,side:T.DoubleSide,roughness:.95});
 mat.onBeforeCompile=s=>{
  s.uniforms.dreamCenter={value:new T.Vector3(...bake.center)};s.uniforms.dreamDepth={value:bake.depthTexture};s.uniforms.dreamDepthScale={value:bake.depthRange/bake.extent};s.uniforms.dreamDepthEnabled=depthMode;s.uniforms.dreamOct={value:oct?.texture??bake.texture};s.uniforms.dreamOctEnabled=octMode;
  s.vertexShader='uniform vec3 dreamCenter; varying vec2 dreamAngles; varying vec2 dreamOctUV;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`
   vec4 centerWorld=modelMatrix*instanceMatrix*vec4(dreamCenter,1.0);
   vec3 dir=normalize(cameraPosition-centerWorld.xyz);
   vec3 axisX=normalize((modelMatrix*instanceMatrix*vec4(1.,0.,0.,0.)).xyz);
   vec3 axisZ=normalize((modelMatrix*instanceMatrix*vec4(0.,0.,1.,0.)).xyz);
   float yaw=atan(dot(dir,axisX),dot(dir,axisZ));
   dreamAngles=vec2(yaw,asin(clamp(dir.y,-1.,1.)));
   vec3 localDir=vec3(dot(dir,axisX),max(0.,dir.y),dot(dir,axisZ));localDir/=max(.0001,abs(localDir.x)+localDir.y+abs(localDir.z));dreamOctUV=vec2(localDir.x+localDir.z,-localDir.x+localDir.z)*.5+.5;
   vec3 right=cross(vec3(0.,1.,0.),dir);
   if(dot(right,right)<0.000001)right=axisX;else right=normalize(right);
   vec3 up=normalize(cross(dir,right));
   float instanceScale=length((modelMatrix*instanceMatrix*vec4(1.,0.,0.,0.)).xyz);
   vec3 offset=transformed-dreamCenter;
   vec4 mvPosition=viewMatrix*vec4(centerWorld.xyz+(right*offset.x+up*offset.y)*instanceScale,1.);
   gl_Position=projectionMatrix*mvPosition;
  `);
  s.vertexShader=s.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\ntransformedNormal=normalize(mat3(viewMatrix)*vec3(0.0,1.0,0.0));');
  s.fragmentShader=`
  varying vec2 dreamAngles;
  uniform sampler2D dreamDepth;
  uniform float dreamDepthScale;
  uniform float dreamDepthEnabled;
  uniform sampler2D dreamOct;
  uniform float dreamOctEnabled;
  varying vec2 dreamOctUV;
  vec4 octTap(vec2 cell,vec2 uv,float mip){float pad=max(4.,exp2(mip)*.5+1.);vec2 p=clamp(4.+uv*120.,vec2(pad),vec2(128.-pad));return textureLod(dreamOct,(cell*128.+p)/1024.,mip);}
  vec3 treeDir(float yaw,float pitch){return vec3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch));}
  vec3 treeRight(float yaw){return vec3(cos(yaw),0.,-sin(yaw));}
  vec2 treeCell(vec2 uv,float a,float e){return (vec2(a,e)+vec2(2./256.)+clamp(uv,0.,1.)*(252./256.))/vec2(8.,4.);}
  vec2 treeFilteredCell(vec2 uv,float a,float e,float mip){float pad=max(2.,exp2(mip)*.5+1.);vec2 p=clamp(2.+clamp(uv,0.,1.)*252.,vec2(pad),vec2(256.-pad));return (vec2(a,e)+p/256.)/vec2(8.,4.);}
  float treeElev(float e){return radians(e<.5?-30.:e<1.5?0.:e<2.5?35.:70.);}
  vec2 treeReproject(vec2 uv,float a,float e){
   float yaw=a*0.78539816339,pitch=treeElev(e);
   vec3 source=treeDir(yaw,pitch),right=treeRight(yaw),up=cross(source,right);
   vec3 current=treeDir(dreamAngles.x,dreamAngles.y),cr=treeRight(dreamAngles.x),cu=cross(current,cr);
   vec2 xy=uv*2.-1.;vec3 p=cr*xy.x+cu*xy.y;
   vec2 initial=vec2(dot(p,right),dot(p,up))*.5+.5;
   if(any(lessThan(initial,vec2(0.)))||any(greaterThan(initial,vec2(1.))))return uv;
   float dep=texture2D(dreamDepth,treeCell(initial,a,e)).r;
   if(dep<=.001)return uv;
   float z=(dep*2.-1.)*dreamDepthScale;
   float t=clamp((z-dot(p,source))/max(.35,dot(current,source)),-1.,1.);
   vec3 hit=p+current*t;
   vec2 corrected=vec2(dot(hit,right),dot(hit,up))*.5+.5;
   if(any(lessThan(corrected,vec2(0.)))||any(greaterThan(corrected,vec2(1.))))return uv;
   return mix(uv,corrected,.75);
  }
  `+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
   vec4 texel,strongest;float coverage;
   float footprint=max(length(dFdx(vMapUv)),length(dFdy(vMapUv)));
   if(dreamOctEnabled>.5&&dreamDepthEnabled<.5&&dreamAngles.y>=0.&&dreamAngles.y<1.48){
    vec2 grid=clamp(dreamOctUV*6.,0.,6.),cell=min(floor(grid),vec2(5.)),p=grid-cell;
    vec2 c0,c1,c2;vec3 w;
    if(p.x+p.y<=1.){c0=cell;c1=cell+vec2(1.,0.);c2=cell+vec2(0.,1.);w=vec3(1.-p.x-p.y,p.x,p.y);}
    else{c0=cell+1.;c1=cell+vec2(0.,1.);c2=cell+vec2(1.,0.);w=vec3(p.x+p.y-1.,1.-p.x,1.-p.y);}
    float mip=clamp(log2(max(footprint*120.,1.)),0.,3.);
    vec4 a=octTap(c0,vMapUv,mip),b=octTap(c1,vMapUv,mip),c=octTap(c2,vMapUv,mip);a.rgb*=a.a;b.rgb*=b.a;c.rgb*=c.a;
    texel=a*w.x+b*w.y+c*w.z;
    // Only contributing frames can boost the coverage, ensuring continuity on triangle edges.
    vec3 contribution=clamp(w*3.,0.,1.);vec3 alphas=vec3(a.a,b.a,c.a)*contribution;
    coverage=clamp(max(texel.a,.86*max(alphas.x,max(alphas.y,alphas.z)))*mix(1.,1.4,mip/3.),0.,1.);
    strongest=a*w.x;if(b.a*w.y>strongest.a)strongest=b*w.y;if(c.a*w.z>strongest.a)strongest=c*w.z;
   }else{
   float av=mod(dreamAngles.x/6.28318530718*8.0+8.0,8.0);
   float a0=floor(av),a1=mod(a0+1.0,8.0),aw=fract(av);
   float elev=degrees(dreamAngles.y);
   float e0=0.0,ew=clamp((elev+30.0)/30.0,0.0,1.0);
   if(elev>=0.0){e0=1.0;ew=clamp(elev/35.0,0.0,1.0);}
   if(elev>=35.0){e0=2.0;ew=clamp((elev-35.0)/35.0,0.0,1.0);}
   // Default path uses four filtered color taps. Bound mip level to avoid mixing atlas cells.
   float mip=clamp(log2(max(footprint*252.,1.)),0.,4.);
   vec4 t0=textureLod(map,treeFilteredCell(vMapUv,a0,e0,mip),mip);
   vec4 t1=textureLod(map,treeFilteredCell(vMapUv,a1,e0,mip),mip);
   vec4 t2=textureLod(map,treeFilteredCell(vMapUv,a0,e0+1.,mip),mip);
   vec4 t3=textureLod(map,treeFilteredCell(vMapUv,a1,e0+1.,mip),mip);
   // Explicit, uniform QA-only A/B toggle, rather than expensive depth taps on every tree.
   if(dreamDepthEnabled>.5){
    vec4 u0=textureLod(map,treeFilteredCell(treeReproject(vMapUv,a0,e0),a0,e0,mip),mip);
    vec4 u1=textureLod(map,treeFilteredCell(treeReproject(vMapUv,a1,e0),a1,e0,mip),mip);
    vec4 u2=textureLod(map,treeFilteredCell(treeReproject(vMapUv,a0,e0+1.),a0,e0+1.,mip),mip);
    vec4 u3=textureLod(map,treeFilteredCell(treeReproject(vMapUv,a1,e0+1.),a1,e0+1.,mip),mip);
    if(u0.a>=t0.a*.5)t0=u0;if(u1.a>=t1.a*.5)t1=u1;if(u2.a>=t2.a*.5)t2=u2;if(u3.a>=t3.a*.5)t3=u3;
   }
   t0.rgb*=t0.a;t1.rgb*=t1.a;t2.rgb*=t2.a;t3.rgb*=t3.a;
   texel=mix(mix(t0,t1,aw),mix(t2,t3,aw),ew);
   // Preserve expected silhouette coverage using ordered screen-space alpha testing.
   // Unlike a fixed cutoff, a single contributing view can retain thin foliage.
   coverage=clamp(max(texel.a,0.78*max(max(t0.a,t1.a),max(t2.a,t3.a)))*mix(1.,1.45,mip/4.),0.0,1.0);
   strongest=t0;if(t1.a>strongest.a)strongest=t1;if(t2.a>strongest.a)strongest=t2;if(t3.a>strongest.a)strongest=t3;
   }
   vec2 pixel=mod(floor(gl_FragCoord.xy),4.0);
   float x0=mod(pixel.x,2.0),y0=mod(pixel.y,2.0);
   float x1=floor(pixel.x/2.0),y1=floor(pixel.y/2.0);
   float threshold=(4.0*(2.0*mod(x0+y0,2.0)+y0)+2.0*mod(x1+y1,2.0)+y1+0.5)/16.0;
   if(coverage<=threshold)discard;
   // If blended view has no visible sample, keep color from the strongest neighbor.
   
   vec3 rgb=texel.a>0.02?texel.rgb/max(texel.a,0.00001):strongest.rgb/max(strongest.a,0.00001);
   diffuseColor*=vec4(rgb,1.0);
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.13;');
 };
 mat.customProgramCacheKey=()=> 'directional-tree-octahedral-v9';return mat;
}
export function proceduralBakeObject(p,photo){
 const o=new T.Group(),wood=new T.MeshBasicMaterial({color:0x786b52,toneMapped:false}),leaf=new T.MeshBasicMaterial({map:photo,alphaTest:.35,side:T.DoubleSide,toneMapped:false});
 o.add(new T.Mesh(p.wood,wood),new T.Mesh(p.leaf,leaf));return {object:o,box:new T.Box3().setFromObject(o),dispose:()=>{wood.dispose();leaf.dispose()}};
}
