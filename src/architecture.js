// Deterministic, original building massing. Width/depth remain within the original lot.
export function planBuilding(l){
 const variant=(l.seed%5+5)%5,parts=[],floor=2.65;
 let y=.68,remaining=l.floors;
 const push=(n,w,d,dx=0,dz=0,kind=l.kind,style=l.style)=>{
  if(n<=0)return;parts.push({x:l.x+dx,z:l.z+dz,y,w,d,h:n*floor,floors:n,kind,style});y+=n*floor;remaining-=n;
 };
 if(l.kind==='tower'){
  push(2,l.w+1,l.d+1,0,0,'office',l.style);
  const w=l.w*[.83,.71,.87,.78,.8][variant],d=l.d*[.82,.86,.71,.79,.9][variant];
  const stepped=variant===1||variant===3||variant===4;
  const n=stepped?Math.max(1,Math.floor(remaining*.64)):remaining;
  push(n,w,d,0,0,'tower',l.style);
  if(remaining)push(remaining,w*.70,d*.72,variant===3?w*.11:0,variant===4?-d*.10:0,'tower',(l.style+1)%4);
 }else if(l.kind!=='house'&&variant>=3&&l.floors>=4){
  const n=l.floors-1;push(n,l.w,l.d);push(1,l.w*.76,l.d*.78,0,0,l.kind,(l.style+1)%4);
 }else push(remaining,l.w,l.d);
 const top=parts[parts.length-1];return {variant,parts,top,roofY:y};
}
export function decorateBuilding(l,plan,{box,plane,add,roof}){
 const {top,roofY:y,variant}=plan,{x,z,w,d}=top;
 if(l.kind==='house'){
  if(variant===0||variant===3){box('tile',x,y,z,w+.35,.22,d+.35,3,3);box('tile',x,y+.22,z,w*.8,.30,d*.8,3,3);box('trim',x-w*.25,y+.48,z+d*.2,.55,1.0,.55);}
  else{const g=roof(w+.6,d+.6,1.45+variant*.30,variant%2===1);g.translate(x,y,z);add(g,'tile');box('trim',x+w*.24,y+1.0,z-d*.18,.52,1.5,.58);}
  box('trim',l.x,.68,l.z+l.d/2+.10,1.1,2.2,.14);box('concrete',l.x,2.78,l.z+l.d/2+.55,1.75,.16,1.35);
  return;
 }
 box('roof',x,y,z,w+.16,.24,d+.16,3,3);
 // Low parapets, staggered utility penthouses and crown profiles.
 for(const s of [-1,1]){
  box('concrete',x+s*(w/2-.10),y+.24,z,.16,.42,d);
  box('concrete',x,y+.24,z+s*(d/2-.10),w,.42,.16);
 }
 if(l.kind==='tower'&&variant===2){
  box('trim',x,y+.24,z,w*.55,2.7,d*.56);box('roof',x,y+2.94,z,w*.6,.24,d*.61);box('metal',x,y+3.18,z,.16,3.1,.16);
 }else if(l.kind==='tower'&&variant===4){
  box('towerWall',x,y+.24,z,w*.52,1.9,d*.63);box('trim',x,y+2.14,z,w*.68,.27,d*.74);
 }else{
  box('trim',x-w*.19,y+.24,z-d*.18,w*.24,.74,d*.27);
  box('metal',x+w*.19,y+.24,z+d*.12,w*.18,.65,d*.20);
 }
 for(let i=1;i<plan.parts.length;i++){
  const p=plan.parts[i-1];box('trim',p.x,p.y+p.h-.12,p.z,p.w+.06,.14,p.d+.06);
 }
 // Ground-floor entrance canopy and horizontal bands reuse the existing material batches.
 box('concrete',l.x,2.85,l.z+l.d/2+.47,l.w*.73,.17,1.32);
 if(l.kind==='apartment'){for(let i=1;i<l.floors;i+=2){const p=plan.parts.find(p=>.68+i*2.65<p.y+p.h);if(!p)continue;box('concrete',p.x,.68+i*2.65,p.z+p.d/2+.38,p.w*.62,.16,.82);box('metal',p.x,1.25+i*2.65,p.z+p.d/2+.72,p.w*.62,.09,.07);}}
}
