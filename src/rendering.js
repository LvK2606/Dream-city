import * as T from 'three';
// Linear-light profiles; no invented HDR asset. Day uses the licensed photo sky, sunset uses Sky,
// night uses an original procedural gradient and sparse stars.
const PROFILES={
 day:{elevation:40,azimuth:225,sun:2.8,hemi:.74,sunColor:0xffe9d1,fogColor:0x9cb5c6,exposure:.94,fog:.00085,environment:.62,water:0x244d5a,rayleigh:2.1,turbidity:3.0},
 sunset:{elevation:9,azimuth:245,sun:2.35,hemi:.47,sunColor:0xffb478,fogColor:0xbfa19b,exposure:.94,fog:.00125,environment:.38,water:0x304b54,rayleigh:2.7,turbidity:4.1},
 night:{elevation:38,azimuth:210,sun:.18,hemi:.25,sunColor:0xa5bbeb,fogColor:0x17293c,exposure:.92,fog:.0017,environment:.16,water:0x142b43,rayleigh:.25,turbidity:2.4}
};
export function lightingProfile(mode){return {...(PROFILES[mode]||PROFILES.day)}}
export function resolutionScale(quality,dpr,width,height){
 const max=quality==='high'?1.6:quality==='medium'?1.15:.75,pixels=quality==='high'?3000000:quality==='medium'?1800000:500000;
 return Math.min(Math.max(.35,dpr),max,Math.sqrt(pixels/Math.max(1,width*height)));
}
export function createNightSky(){
 const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:true,fog:false,toneMapped:false,uniforms:{},vertexShader:`
 varying vec3 dir;
 void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
 `,fragmentShader:`
 varying vec3 dir;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){
  vec3 d=normalize(dir);float h=max(d.y,0.0);
  vec3 color=mix(vec3(.028,.048,.078),vec3(.0045,.010,.025),smoothstep(0.0,.8,h));
  vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);
  vec2 cell=floor(uv*vec2(360.,180.)),f=fract(uv*vec2(360.,180.))-.5;
  float star=step(.993,hash(cell))*(1.0-smoothstep(.015,.12,length(f)))*smoothstep(.06,.22,h);
  color+=star*vec3(.40,.47,.62);
  gl_FragColor=vec4(color,1.);
  #include <colorspace_fragment>
 }
 `});
 const mesh=new T.Mesh(new T.SphereGeometry(850,24,16),mat);mesh.visible=false;mesh.renderOrder=-10;mesh.frustumCulled=false;return mesh;
}
