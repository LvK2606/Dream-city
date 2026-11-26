// Test completed frames AFTER each user action, not an older render.
export function trafficTransition(before,after,paused,minFrames=2){
 const a=before.motion?.trafficSample,b=after.motion?.trafficSample;
 const valid=Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&a<1&&b>=0&&b<1;
 const delta=valid?(b-a+1)%1:null;
 const frames=after.frames-before.frames;
 const ok=valid&&Number.isFinite(frames)&&frames>=minFrames&&before.motion.paused===paused&&after.motion.paused===paused&&(paused?Math.abs(b-a)<1e-10:delta>1e-8&&delta<.5);
 return {ok,frames,delta,paused,before:a,after:b};
}
export function interactionResult(name,checks,evidence,error=null){
 return {name,passed:!error&&checks.length>0&&checks.every(x=>x.ok===true),checks,evidence,...(error?{error}:{})};
}
