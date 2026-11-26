// Independent accounting for nested Water renders; counts are draw submissions, not GPU time.
export function reflectionDecision({elapsed,moved,quality,invalid=false}){
 if(quality==='low')return false;
 if(invalid)return true;
 return elapsed >= (moved?(quality==='high'?100:240):(quality==='high'?1800:4000));
}
export function subtractPass(total,reflection){
 return {calls:Math.max(0,total.calls-reflection.calls),triangles:Math.max(0,total.triangles-reflection.triangles)};
}
export function summarizeFrames(frames){
 const max=(key)=>Math.max(0,...frames.map(x=>x[key]??0));
 return {samples:frames.length,reflectionSamples:frames.filter(x=>x.reflectionCalls>0).length,mainCalls:max('mainCalls'),reflectionCalls:max('reflectionCalls'),totalCalls:max('calls'),mainTriangles:max('mainTriangles'),reflectionTriangles:max('reflectionTriangles'),totalTriangles:max('triangles')};
}
