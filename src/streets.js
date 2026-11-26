import {rng,roadXs,roadZs,bridges} from './world.js';
// Original street kit. Keep all structures out of the carriageway except paint.
export function buildStreetDetails({box,plane}){
 let markings=0,furniture=0,signals=0;
 for(const x of roadXs)for(const side of [-1,1]){
  for(const z of roadZs.slice(0,-1)){plane('paint',x+side*3.05,.071,z+16,.075,20);markings++}
 }
 for(const z of roadZs)for(const sign of [-1,1])for(const side of [-1,1]){
  for(let x=40;x<=136;x+=32){plane('paint',sign*x,.078,z+side*3.03,20,.075);markings++}
 }
 // Stop bars placed before crossings rather than across opposing traffic.
 for(const x of [-120,-56,56,120])for(const z of [-80,-16,48,112]){
  plane('paint',x-1.7,.081,z-6.1,2.6,.17);plane('paint',x+1.7,.081,z+6.1,2.6,.17);markings+=2;
  for(const sign of [-1,1]){
   const px=x+sign*4.45,pz=z+sign*6.5;
   box('metal',px,.12,pz,.10,2.9,.10);
   box('black',px,2.76,pz,.34,.64,.28);
   box('lamp',px,2.89,pz,.18,.15,.295);
   signals++;
  }
 }
 // Six compact shelter/bench assemblies, on the sidewalk verge, not on road lanes.
 for(const [x,z] of [[-56,-40],[-120,24],[-24,24],[56,-40],[120,24],[24,24]]){
  const px=x+(Math.abs(x)===24?(x<0?-4.55:4.55):(x<0?4.55:-4.55));
  for(const q of [-1,1])box('metal',px,.10,z+q*1.35,.08,2.45,.08);
  box('trim',px,2.55,z,1.3,.13,3.0);
  box('metal',px,.12,z,.55,.35,1.8);box('roof',px,.47,z,.58,.12,1.9);
  box('glass',px+(x<0?.45:-.45),.65,z,.065,1.6,2.55);
  furniture++;
 }
 return {markings,furniture,signals};
}
export function laneCatalog(){
 const lanes=[];
 for(const x of roadXs)for(const sign of [-1,1])lanes.push({axis:1,x,z:0,sign,start:-112,end:112,length:224});
 for(const z of roadZs)for(const sign of [-1,1]){
  if(bridges.includes(z))lanes.push({axis:0,x:0,z,sign,start:-152,end:152,length:304});
  else for(const side of [-1,1]){const start=side<0?-152:24,end=side<0?-24:152;lanes.push({axis:0,x:0,z,sign,start,end,length:end-start})}
 }
 return lanes;
}
export function createTraffic(count,seed=1107){
 const lanes=laneCatalog(),rand=rng(seed),cars=[],counts=lanes.map((_,i)=>Math.floor(count/lanes.length)+(i<count%lanes.length?1:0));
 for(let i=0;i<lanes.length;i++){const lane=lanes[i],n=counts[i],phase=rand(),speed=lane.axis?7.2:6.4;
  for(let j=0;j<n;j++)cars.push({...lane,lane:i,t:(phase+j/n)%1,speed,variant:Math.floor(rand()*4)});
 }
 return cars;
}
export function vehiclePose(c){
 const along=c.start+c.length*(c.sign>0?c.t:1-c.t);
 return c.axis?{x:c.x+c.sign*1.6,z:along,a:c.sign>0?0:Math.PI}:{x:along,z:c.z-c.sign*1.6,a:c.sign>0?Math.PI/2:-Math.PI/2};
}
