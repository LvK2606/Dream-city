import * as T from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
// Keep original vertex attributes and topology seams. Reject high error or ineffective simplification.
export async function simplifyPanel(g,ratio=.55,maxError=.008){
 const old=g.index?.count??0;
 if(old<60||!g.attributes.position||g.attributes.position.isInterleavedBufferAttribute)return {before:old/3,after:old/3,error:0,applied:false};
 await MeshoptSimplifier.ready;
 const pos=g.attributes.position,uv=g.attributes.uv,normal=g.attributes.normal,n=pos.count;
 const indices=Uint32Array.from(g.index.array),positions=Float32Array.from(pos.array),target=Math.max(12,Math.floor(old*ratio/3)*3);
 const attrs=new Float32Array(n*5);
 for(let i=0;i<n;i++){attrs[i*5]=normal?.getX(i)??0;attrs[i*5+1]=normal?.getY(i)??1;attrs[i*5+2]=normal?.getZ(i)??0;attrs[i*5+3]=uv?.getX(i)??0;attrs[i*5+4]=uv?.getY(i)??0}
 const [next,error]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attrs,5,[.6,.6,.6,1.5,1.5],null,target,maxError,['LockBorder']);
 const applied=next.length>=12&&next.length<old&&Number.isFinite(error)&&error<=maxError;
 if(applied)g.setIndex(new T.BufferAttribute(next,1));
 return {before:old/3,after:(applied?next.length:old)/3,error,applied};
}
