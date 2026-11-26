import * as T from 'three';
// Original procedural room-box shader. One quad per window, no extra geometry or images.
export function windowMaterial(){const night={value:0};const mat=new T.MeshStandardMaterial({color:0xffffff,roughness:.43,metalness:.06,envMapIntensity:.42});mat.userData.night=night;mat.onBeforeCompile=s=>{
s.uniforms.dcNight=night;
s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
attribute vec3 roomData; varying vec2 dcUV; varying vec3 dcRay; varying vec3 dcRoom;`).replace('#include <begin_vertex>',`#include <begin_vertex>
dcUV=uv; dcRoom=roomData;
vec3 dcN=normalize(mat3(modelMatrix)*normal);
vec3 dcD=cameraPosition-(modelMatrix*vec4(position,1.0)).xyz;
vec3 dcT=vec3(dcN.z,0.0,-dcN.x);
dcRay=vec3(-dot(dcD,dcT),-dcD.y,max(dot(dcD,dcN),0.001));`);
s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
varying vec2 dcUV; varying vec3 dcRay; varying vec3 dcRoom; uniform float dcNight;
float dcPane; vec3 dcEmit;`).replace('#include <color_fragment>',`#include <color_fragment>
vec2 uvRoom=clamp((dcUV-0.10)/0.80,0.001,0.999);
vec2 edge=min(dcUV,1.0-dcUV);
float border=smoothstep(0.078,0.105,min(edge.x,edge.y));
float mull=1.0;
if(dcRoom.z>0.5)mull*=smoothstep(0.010,0.025,abs(dcUV.x-0.5));
if(dcRoom.z>1.5)mull*=smoothstep(0.010,0.025,abs(dcUV.y-0.63));
dcPane=border*mull;
vec3 roomCol=vec3(0.16,0.21,0.25);
float dist=length(dcRay);
if(dist<125.0&&dcPane>0.01){
vec3 ray=normalize(dcRay);
vec2 sx=vec2(ray.x>=0.0?1.0:-1.0,ray.y>=0.0?1.0:-1.0);
vec2 side=(mix(vec2(0.0),vec2(1.0),step(vec2(0.0),ray.xy))-uvRoom)/(sx*max(abs(ray.xy),vec2(0.0001)));
float back=1.30/max(ray.z,0.0001);
float hit=min(back,min(side.x,side.y));
vec3 hp=vec3(uvRoom,0.0)+ray*hit;
vec3 wall=vec3(0.22,0.21,0.18);
if(side.y<min(back,side.x))wall=ray.y<0.0?vec3(0.12,0.09,0.067):vec3(0.31,0.30,0.26);
if(back<min(side.x,side.y)){float shelf=step(0.68,hp.x)*step(hp.y,0.54);float desk=step(0.21,hp.x)*step(hp.x,0.58)*step(hp.y,0.27);wall*=1.0-0.48*max(shelf,desk);}
float corner=0.65+0.35*smoothstep(0.0,0.15,min(min(hp.x,1.0-hp.x),min(hp.y,1.0-hp.y)));
float fres=pow(1.0-clamp(ray.z,0.0,1.0),2.0);
roomCol=mix(wall*corner,vec3(0.18,0.27,0.34),0.32+fres*0.58);
roomCol=mix(roomCol,vec3(0.16,0.21,0.25),smoothstep(85.0,125.0,dist));
}
if(dcRoom.y>0.5){roomCol=mix(roomCol,vec3(0.34,0.35,0.32)*(0.84+0.16*cos(dcUV.x*100.0)),0.85);}
roomCol*=mix(1.15,0.48,dcNight);
vec3 frameCol=mix(vec3(0.25,0.27,0.28),vec3(0.12,0.13,0.14),smoothstep(0.025,0.10,min(edge.x,edge.y)));
diffuseColor.rgb=mix(frameCol,roomCol,dcPane);
dcEmit=dcPane*dcRoom.x*dcNight*vec3(0.85,0.48,0.19)*mix(0.70,1.0,smoothstep(0.0,0.32,uvRoom.y));`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
totalEmissiveRadiance+=dcEmit;`);
};mat.customProgramCacheKey=()=> 'dream-window-room-v1';return mat}
