import * as T from 'three';
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
 const scene=new T.Scene();scene.add(object);const camera=new T.OrthographicCamera(-extent,extent,extent,-extent,.1,100),coverage=[];
 const prev=renderer.getRenderTarget(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear,shadow=renderer.shadowMap.enabled,xr=renderer.xr.enabled;
 try{
  renderer.xr.enabled=false;renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(target);
  for(let e=0;e<ELEVATIONS.length;e++)for(let a=0;a<AZIMUTHS;a++){
   const yaw=a*2*Math.PI/AZIMUTHS,pitch=ELEVATIONS[e]*Math.PI/180;
   camera.position.copy(center).addScaledVector(new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),20);camera.lookAt(center);camera.updateMatrixWorld();
   renderer.clear();renderer.render(scene,camera);
   const bytes=new Uint8Array(inside*inside*4);renderer.readRenderTargetPixels(target,0,0,inside,inside,bytes);
   const im=ctx.createImageData(inside,inside);let count=0;
   for(let y=0;y<inside;y++){const start=(inside-y-1)*inside*4;im.data.set(bytes.subarray(start,start+inside*4),y*inside*4)}
   for(let j=3;j<im.data.length;j+=4)if(im.data[j]>100)count++;
   const c=count/(inside*inside);if(c<.008||c>.94)throw Error('invalid directional coverage '+c+' at '+a+'/'+e);coverage.push(c);
   // Fill one-pixel alpha gaps only inside this view. Preserve the original color of the selected adjacent leaf.
   enhanceCoverage(im.data,inside,inside);
   ctx.putImageData(im,a*tile+GUTTER,(ELEVATIONS.length-1-e)*tile+GUTTER);
  }
 }finally{renderer.setRenderTarget(prev);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;renderer.shadowMap.enabled=shadow;renderer.xr.enabled=xr;target.dispose();scene.remove(object)}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
 const geometry=new T.PlaneGeometry(extent*2,extent*2);geometry.translate(center.x,center.y,center.z);geometry.computeBoundingSphere();geometry.boundingSphere.radius=extent*Math.SQRT2;
 return {texture,geometry,coverage,extent,center:center.toArray(),views:coverage.length,atlas:[canvas.width,canvas.height]};
}
export function directionalMaterial(bake){
 const mat=new T.MeshStandardMaterial({map:bake.texture,color:0xffffff,alphaTest:.35,side:T.DoubleSide,roughness:.95});
 mat.onBeforeCompile=s=>{
  s.uniforms.dreamCenter={value:new T.Vector3(...bake.center)};
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
  s.fragmentShader='varying vec2 dreamAngles;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
   float av=mod(dreamAngles.x/6.28318530718*8.0+8.0,8.0);
   float a0=floor(av),a1=mod(a0+1.0,8.0),aw=fract(av);
   float elev=degrees(dreamAngles.y);
   float e0=0.0,ew=clamp((elev+30.0)/30.0,0.0,1.0);
   if(elev>=0.0){e0=1.0;ew=clamp(elev/35.0,0.0,1.0);}
   if(elev>=35.0){e0=2.0;ew=clamp((elev-35.0)/35.0,0.0,1.0);}
   vec2 cell=vec2(8.0,4.0),uv=vec2(2.0/256.0)+vMapUv*(252.0/256.0);
   vec4 t0=texture2D(map,(vec2(a0,e0)+uv)/cell);
   vec4 t1=texture2D(map,(vec2(a1,e0)+uv)/cell);
   vec4 t2=texture2D(map,(vec2(a0,e0+1.0)+uv)/cell);
   vec4 t3=texture2D(map,(vec2(a1,e0+1.0)+uv)/cell);
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
 mat.customProgramCacheKey=()=> 'directional-tree-atlas-v4';return mat;
}
export function proceduralBakeObject(p,photo){
 const o=new T.Group(),wood=new T.MeshBasicMaterial({color:0x786b52,toneMapped:false}),leaf=new T.MeshBasicMaterial({map:photo,alphaTest:.35,side:T.DoubleSide,toneMapped:false});
 o.add(new T.Mesh(p.wood,wood),new T.Mesh(p.leaf,leaf));return {object:o,box:new T.Box3().setFromObject(o),dispose:()=>{wood.dispose();leaf.dispose()}};
}
