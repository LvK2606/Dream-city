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
 const range=extent*1.15,camera=new T.OrthographicCamera(-extent,extent,extent,-extent,20-range,20+range),coverage=[],depthCoverage=[],depthRanges=[];
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
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
 const geometry=new T.PlaneGeometry(extent*2,extent*2);geometry.translate(center.x,center.y,center.z);geometry.computeBoundingSphere();geometry.boundingSphere.radius=extent*Math.SQRT2;
 const depthTexture=new T.DataTexture(depthBytes,canvas.width,canvas.height,T.RedFormat,T.UnsignedByteType);depthTexture.minFilter=depthTexture.magFilter=T.NearestFilter;depthTexture.generateMipmaps=false;depthTexture.needsUpdate=true;
 return {texture,depthTexture,depthBytes,geometry,coverage,depthCoverage,depthRanges,depthRange:range,extent,center:center.toArray(),views:coverage.length,atlas:[canvas.width,canvas.height]};
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
export function volumeMaterial(bake){
 const m=new T.MeshStandardMaterial({map:bake.texture,color:0xffffff,alphaTest:.28,side:T.DoubleSide,roughness:.92});
 m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.08;')};
 m.customProgramCacheKey=()=> 'tree-volume-atlas-v1';return m;
}
export function directionalMaterial(bake){
 const mat=new T.MeshStandardMaterial({map:bake.texture,color:0xffffff,alphaTest:.35,side:T.DoubleSide,roughness:.95});
 mat.onBeforeCompile=s=>{
  s.uniforms.dreamCenter={value:new T.Vector3(...bake.center)};s.uniforms.dreamDepth={value:bake.depthTexture};s.uniforms.dreamDepthScale={value:bake.depthRange/bake.extent};
  s.vertexShader='uniform vec3 dreamCenter; varying vec2 dreamAngles;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`
   vec4 centerWorld=modelMatrix*instanceMatrix*vec4(dreamCenter,1.0);
   vec3 dir=normalize(cameraPosition-centerWorld.xyz);
   vec3 axisX=normalize((modelMatrix*instanceMatrix*vec4(1.,0.,0.,0.)).xyz);
   vec3 axisZ=normalize((modelMatrix*instanceMatrix*vec4(0.,0.,1.,0.)).xyz);
   float yaw=atan(dot(dir,axisX),dot(dir,axisZ));
   dreamAngles=vec2(yaw,asin(clamp(dir.y,-1.,1.)));
   vec3 right=cross(vec3(0.,1.,0.),dir);
   if(dot(right,right)<0.000001)right=axisX;else right=normalize(right);
   vec3 up=normalize(cross(dir,right));
   float instanceScale=length((modelMatrix*instanceMatrix*vec4(1.,0.,0.,0.)).xyz);
   vec3 offset=transformed-dreamCenter;
   vec4 mvPosition=viewMatrix*vec4(centerWorld.xyz+(right*offset.x+up*offset.y)*instanceScale,1.);
   gl_Position=projectionMatrix*mvPosition;
  `);
  s.vertexShader=s.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\ntransformedNormal=normalize(vec3(0.0,0.45,1.0));');
  s.fragmentShader=`
  varying vec2 dreamAngles;
  uniform sampler2D dreamDepth;
  uniform float dreamDepthScale;
  vec3 treeDir(float yaw,float pitch){return vec3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch));}
  vec3 treeRight(float yaw){return vec3(cos(yaw),0.,-sin(yaw));}
  vec2 treeCell(vec2 uv,float a,float e){return (vec2(a,e)+vec2(2./256.)+clamp(uv,0.,1.)*(252./256.))/vec2(8.,4.);}
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
   float av=mod(dreamAngles.x/6.28318530718*8.0+8.0,8.0);
   float a0=floor(av),a1=mod(a0+1.0,8.0),aw=fract(av);
   float elev=degrees(dreamAngles.y);
   float e0=0.0,ew=clamp((elev+30.0)/30.0,0.0,1.0);
   if(elev>=0.0){e0=1.0;ew=clamp(elev/35.0,0.0,1.0);}
   if(elev>=35.0){e0=2.0;ew=clamp((elev-35.0)/35.0,0.0,1.0);}
   vec4 t0=texture2D(map,treeCell(treeReproject(vMapUv,a0,e0),a0,e0));
   vec4 t1=texture2D(map,treeCell(treeReproject(vMapUv,a1,e0),a1,e0));
   vec4 t2=texture2D(map,treeCell(treeReproject(vMapUv,a0,e0+1.),a0,e0+1.));
   vec4 t3=texture2D(map,treeCell(treeReproject(vMapUv,a1,e0+1.),a1,e0+1.));
   // Disocclusion guard: if warped samples lose coverage, recover same-cell unwarped color.
   vec4 u0=texture2D(map,treeCell(vMapUv,a0,e0)),u1=texture2D(map,treeCell(vMapUv,a1,e0));
   vec4 u2=texture2D(map,treeCell(vMapUv,a0,e0+1.)),u3=texture2D(map,treeCell(vMapUv,a1,e0+1.));
   if(t0.a<u0.a*.5)t0=u0;if(t1.a<u1.a*.5)t1=u1;if(t2.a<u2.a*.5)t2=u2;if(t3.a<u3.a*.5)t3=u3;
   t0.rgb*=t0.a;t1.rgb*=t1.a;t2.rgb*=t2.a;t3.rgb*=t3.a;
   vec4 texel=mix(mix(t0,t1,aw),mix(t2,t3,aw),ew);
   // Preserve expected silhouette coverage using ordered screen-space alpha testing.
   // Unlike a fixed cutoff, a single contributing view can retain thin foliage.
   float coverage=clamp(max(texel.a,0.65*max(max(t0.a,t1.a),max(t2.a,t3.a))),0.0,1.0);
   vec2 pixel=mod(floor(gl_FragCoord.xy),4.0);
   float x0=mod(pixel.x,2.0),y0=mod(pixel.y,2.0);
   float x1=floor(pixel.x/2.0),y1=floor(pixel.y/2.0);
   float threshold=(4.0*(2.0*mod(x0+y0,2.0)+y0)+2.0*mod(x1+y1,2.0)+y1+0.5)/16.0;
   if(coverage<=threshold)discard;
   // If blended view has no visible sample, keep color from the strongest neighbor.
   vec4 strongest=t0;if(t1.a>strongest.a)strongest=t1;if(t2.a>strongest.a)strongest=t2;if(t3.a>strongest.a)strongest=t3;
   vec3 rgb=texel.a>0.02?texel.rgb/max(texel.a,0.00001):strongest.rgb/max(strongest.a,0.00001);
   diffuseColor*=vec4(rgb,1.0);
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.13;');
 };
 mat.customProgramCacheKey=()=> 'directional-tree-depth-reproject-v5';return mat;
}
export function proceduralBakeObject(p,photo){
 const o=new T.Group(),wood=new T.MeshBasicMaterial({color:0x786b52,toneMapped:false}),leaf=new T.MeshBasicMaterial({map:photo,alphaTest:.35,side:T.DoubleSide,toneMapped:false});
 o.add(new T.Mesh(p.wood,wood),new T.Mesh(p.leaf,leaf));return {object:o,box:new T.Box3().setFromObject(o),dispose:()=>{wood.dispose();leaf.dispose()}};
}
