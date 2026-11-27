import * as T from 'three';
import {enhanceCoverage} from './directional-impostor.js';
// Original WebGL2 implementation of hemisphere octahedral direction mapping.
// A 7x7 vertex grid (49 genuine source render directions), 128px slots in a 1024px atlas.
// Grid interpolation uses a triangle within each square, not four-view bilinear blending.
export const OCT_GRID=6,OCT_STRIDE=7,OCT_TILE=128,OCT_SIZE=1024,OCT_PAD=4;
export function hemiDirection(u,v){
 const x=u-v,z=u+v-1,y=Math.max(0,1-Math.abs(x)-Math.abs(z)),n=Math.hypot(x,y,z);
 return [x/n,y/n,z/n];
}
export function hemiUV(x,y,z){
 y=Math.max(0,y);const n=Math.abs(x)+y+Math.abs(z);
 if(n<1e-9)return [.5,.5];
 return [((x+z)/n+1)*.5,((-x+z)/n+1)*.5];
}
export function hemiSample(x,y,z){
 const [u,v]=hemiUV(x,y,z),gx=T.MathUtils.clamp(u*OCT_GRID,0,OCT_GRID),gy=T.MathUtils.clamp(v*OCT_GRID,0,OCT_GRID),ix=Math.min(OCT_GRID-1,Math.floor(gx)),iy=Math.min(OCT_GRID-1,Math.floor(gy)),a=gx-ix,b=gy-iy;
 const q=(x,y)=>[ix+x,iy+y];return a+b<=1?{cells:[q(0,0),q(1,0),q(0,1)],weights:[1-a-b,a,b]}:{cells:[q(1,1),q(0,1),q(1,0)],weights:[a+b-1,1-a,1-b]};
}
// Color-dilate transparent texels without changing their alpha. This prevents
// black fringes during alpha-weighted mip filtering, while silhouette remains bounded.
export function padTransparentRGB(data,w,h,iterations=3){
 let known=new Uint8Array(w*h);for(let i=0;i<known.length;i++)known[i]=data[i*4+3]>0?1:0;
 for(let k=0;k<iterations;k++){const next=known.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x;if(known[i])continue;
  let sum=[0,0,0],n=0;for(const j of [i-1,i+1,i-w,i+w])if(known[j]){for(let c=0;c<3;c++)sum[c]+=data[j*4+c];n++}
  if(n){for(let c=0;c<3;c++)data[i*4+c]=Math.round(sum[c]/n);next[i]=1}
 }known=next}return data;
}
export function bakeHemiOctahedral(renderer,object,box){
 const center=box.getCenter(new T.Vector3()),extent=box.getSize(new T.Vector3()).length()*.5*1.06,inside=OCT_TILE-OCT_PAD*2,coverage=[];
 const data=new Uint8Array(OCT_SIZE*OCT_SIZE*4),target=new T.WebGLRenderTarget(inside,inside,{depthBuffer:true,stencilBuffer:false});
 target.texture.colorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.add(object);const range=extent*1.15,camera=new T.OrthographicCamera(-extent,extent,extent,-extent,20-range,20+range);
 const prev=renderer.getRenderTarget(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear,shadow=renderer.shadowMap.enabled,xr=renderer.xr.enabled;
 try{
  renderer.xr.enabled=false;renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(target);
  for(let y=0;y<OCT_STRIDE;y++)for(let x=0;x<OCT_STRIDE;x++){
   const dir=new T.Vector3(...hemiDirection(x/OCT_GRID,y/OCT_GRID));camera.up.set(0,1,0);if(dir.y>.999999)camera.up.set(0,0,-1);
   camera.position.copy(center).addScaledVector(dir,20);camera.lookAt(center);camera.updateMatrixWorld();renderer.clear();renderer.render(scene,camera);
   const bytes=new Uint8Array(inside*inside*4);renderer.readRenderTargetPixels(target,0,0,inside,inside,bytes);
   let n=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>100)n++;const c=n/(inside*inside);if(c<.008||c>.94)throw Error('invalid octahedral coverage '+x+'/'+y+' '+c);coverage.push(c);
   enhanceCoverage(bytes,inside,inside);padTransparentRGB(bytes,inside,inside);
   for(let row=0;row<inside;row++)data.set(bytes.subarray(row*inside*4,(row+1)*inside*4),((y*OCT_TILE+OCT_PAD+row)*OCT_SIZE+x*OCT_TILE+OCT_PAD)*4);
  }
 }finally{renderer.setRenderTarget(prev);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;renderer.shadowMap.enabled=shadow;renderer.xr.enabled=xr;target.dispose();scene.remove(object)}
 const texture=new T.DataTexture(data,OCT_SIZE,OCT_SIZE,T.RGBAFormat,T.UnsignedByteType);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return {texture,coverage,views:coverage.length,atlas:[OCT_SIZE,OCT_SIZE],bytes:data.byteLength,grid:OCT_GRID,slot:OCT_TILE};
}
