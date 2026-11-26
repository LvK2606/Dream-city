import {chunkKey} from './detail.js';
// Coalesce lightweight static detail only; keep facade LOD and heavy surface spatial granularity.
// Geometry/material/UV remain unchanged. Shadow proxies use the resulting geometry.
const coarse=new Set(['paint','metal','trim','lamp','black']);
export function staticBatchKey(material,b,region){
 return material+'|'+(region??chunkKey(b.min.x,b.min.z,b.max.x,b.max.z,coarse.has(material)?192:96));
}
export function batchInventory(batches){
 const byMaterial={};for(const [key,gs] of batches){const k=key.split('|')[0],row=byMaterial[k]??(byMaterial[k]={batches:0,triangles:0});row.batches++;for(const g of gs)row.triangles+=(g.index?.count??g.attributes.position.count)/3}
 return {byMaterial,batches:batches.size,triangles:Object.values(byMaterial).reduce((n,x)=>n+x.triangles,0),strategy:'coarse-lightweight-static-detail-v1'};
}
