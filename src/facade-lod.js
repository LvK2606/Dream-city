import * as T from 'three';
// Stable small integer hash, reproduced exactly in GLSL using integer arithmetic.
export function windowFlags(seed,face,col,row){const v=((seed+face*71+col*23+row*43)%997+997)%997;const hash=(v*v*17+v*13+19)%997;return [hash<239,hash>=239&&hash<330]}
export function chooseFacadeLOD(distance,current,quality){const limit={low:42,medium:88,high:135}[quality]??88;const band=limit*.12;return current==='near'?(distance>limit+band?'far':'near'):(distance<limit-band?'near':'far')}
export function buildFarFacade({x,y,z,w,h,d,floors,style,kind,seed,spec}){const p=[],n=[],uv=[],idx=[],grid=[],meta=[];let windows=0;const floorH=h/Math.max(1,floors),s=((seed+Math.round(y*100))%997+997)%997;
for(const [face,[nx,nz]] of [[0,1],[0,-1],[1,0],[-1,0]].entries()){const length=nx?d:w,bays=Math.max(2,Math.round(length/(spec.width+spec.trim*2+.35))),pitch=length/bays,ww=(Math.min(pitch-.26,spec.width)+spec.trim*2)/pitch,hh=(Math.min(floorH-.36,spec.height)+spec.trim*2)/floorH,offset=.032,cx=x+nx*((nx?w:d)/2+offset),cz=z+nz*((nx?w:d)/2+offset),base=p.length/3;
for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){p.push(cx+nz*(u-.5)*length,y+v*h,cz-nx*(u-.5)*length);n.push(nx,0,nz);uv.push(u,v);grid.push(bays,floors,ww,hh);meta.push(s,face,kind==='tower'&&style!==1?0:style%2===0?2:1)}
idx.push(base,base+1,base+2,base,base+2,base+3);windows+=bays*floors}
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('facadeGrid',new T.Float32BufferAttribute(grid,4));g.setAttribute('facadeMeta',new T.Float32BufferAttribute(meta,3));g.setIndex(idx);return {geometry:g,windows}}
export function farFacadeMaterial(){const night={value:0};const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.43,metalness:.06,envMapIntensity:.42});m.userData.night=night;m.onBeforeCompile=s=>{s.uniforms.dcNight=night;s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
attribute vec4 facadeGrid; attribute vec3 facadeMeta; varying vec4 vGrid; varying vec3 vMeta; varying vec2 vFace;`).replace('#include <begin_vertex>',`#include <begin_vertex>
vGrid=facadeGrid;vMeta=facadeMeta;vFace=uv;`);s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
varying vec4 vGrid; varying vec3 vMeta; varying vec2 vFace; uniform float dcNight; vec3 dcEmit;`).replace('#include <color_fragment>',`#include <color_fragment>
vec2 cell=clamp(vFace,0.0,0.99999)*vGrid.xy;
vec2 id=floor(cell);
vec2 q=(fract(cell)-vec2(0.5,0.53))/vGrid.zw+0.5;
if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0) discard;
vec2 edge=min(q,1.0-q);
float pane=smoothstep(0.078,0.105,min(edge.x,edge.y));
if(vMeta.z>0.5)pane*=smoothstep(0.010,0.025,abs(q.x-0.5));
if(vMeta.z>1.5)pane*=smoothstep(0.010,0.025,abs(q.y-0.63));
int v=int(mod(vMeta.x+vMeta.y*71.0+id.x*23.0+id.y*43.0,997.0));
int hash=(v*v*17+v*13+19)%997;
vec3 room=hash>=239&&hash<330?vec3(0.34,0.35,0.32):vec3(0.16,0.21,0.25);
room*=mix(1.15,0.48,dcNight);
vec3 frame=mix(vec3(0.25,0.27,0.28),vec3(0.12,0.13,0.14),smoothstep(0.025,0.10,min(edge.x,edge.y)));
diffuseColor.rgb=mix(frame,room,pane);
dcEmit=pane*(hash<239?1.0:0.0)*dcNight*vec3(0.85,0.48,0.19);`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
totalEmissiveRadiance+=dcEmit;`);};m.customProgramCacheKey=()=> 'dream-far-facade-v1';return m}
