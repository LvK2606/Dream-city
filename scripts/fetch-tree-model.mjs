import {mkdir,writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import validator from 'gltf-validator';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,simplify,meshopt} from '@gltf-transform/functions';
import {MeshoptSimplifier,MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
const id=process.argv[2]??'tree_small_02';if(!['tree_small_02','pine_sapling_small'].includes(id))throw Error('unsupported tree source');
const dir=id==='tree_small_02'?'public/tree-model':'public/tree-model/pine',temp=await mkdtemp(path.join(tmpdir(),'dream-tree-'));
await mkdir(dir,{recursive:true});let manifest={ready:false,id,license:'CC0',author:id==='tree_small_02'?'Rico Cilliers':'Rico Cilliers (model), Rob Tuytel (photography)',sourceType:'photoreal-authored-model; scan provenance unverified'},total=0;
const files={};
function safe(s){if(typeof s!=='string'||s.startsWith('/')||s.includes('\\')||s.split('/').some(p=>p==='..'||p==='.')||!/^[-a-zA-Z0-9_./% ]+$/.test(s))throw Error('invalid tree URI');return s}
async function get(name,info){name=safe(name);const u=new URL(info.url);if(u.protocol!=='https:'||u.hostname!=='dl.polyhaven.org')throw Error('invalid tree asset host');
 const r=await fetch(u,{signal:AbortSignal.timeout(90000),redirect:'error'});if(!r.ok)throw Error('tree asset HTTP '+r.status);
 const length=Number(r.headers.get('content-length')||0);if(length>128*1024*1024||total+length>192*1024*1024)throw Error('tree source download budget');
 const b=Buffer.from(await r.arrayBuffer());total+=b.length;if(!b.length||b.length>128*1024*1024||total>192*1024*1024)throw Error('tree source byte budget');
 if(info.md5&&createHash('md5').update(b).digest('hex')!==info.md5)throw Error('tree source MD5 mismatch');
 await mkdir(path.dirname(path.join(temp,name)),{recursive:true});await writeFile(path.join(temp,name),b);files[name]={bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};return b;
}
try{
 const r=await fetch('https://api.polyhaven.com/files/'+id,{headers:{'User-Agent':'DreamCity/0.4.10.10 (github.com/LvK2606/Dream-city)'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('tree metadata '+r.status);
 const m=await r.json(),entry=m.gltf?.['1k']?.gltf;if(!entry?.url)throw Error('no 1k tree glTF');
 const name=safe(decodeURIComponent(new URL(entry.url).pathname.split('/').pop())),json=JSON.parse((await get(name,entry)).toString('utf8'));
 const uris=[...new Set([...(json.buffers??[]),...(json.images??[])].map(x=>x.uri).filter(x=>x&&!x.startsWith('data:')))];
 for(const raw of uris){const uri=safe(decodeURIComponent(raw)),dep=entry.include?.[raw]??entry.include?.[uri];await get(uri,dep?.url?dep:{url:new URL(raw,entry.url).href})}
 await Promise.all([MeshoptSimplifier.ready,MeshoptEncoder.ready,MeshoptDecoder.ready]);
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
 const d=await io.read(path.join(temp,name));
 const count=()=>d.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((v,p)=>v+(p.getIndices()?.getCount()??p.getAttribute('POSITION')?.getCount()??0)/3,0),0);
 const before=count();if(before<100||before>4000000)throw Error('invalid source triangle budget '+before);
 await d.transform(dedup(),prune(),simplify({simplifier:MeshoptSimplifier,ratio:.16,error:.025}),prune());
 const after=count();if(!Number.isFinite(after)||after<=0||after>350000||after>before)throw Error('optimized tree triangle budget '+after);
 const plain=await io.writeBinary(d);
 const validate=async(bytes,uri)=>{const report=await validator.validateBytes(new Uint8Array(bytes),{uri,maxIssues:1000});return {validatorVersion:report.validatorVersion,errors:report.issues.numErrors,warnings:report.issues.numWarnings,infos:report.issues.numInfos,messages:report.issues.messages.map(({code,message,severity,pointer})=>({code,message,severity,pointer}))}};
 const uncompressed=await validate(plain,'tree-uncompressed.glb');
 await writeFile(dir+'/validation-uncompressed.json',JSON.stringify(uncompressed,null,2));
 if(uncompressed.errors)throw Error('uncompressed glTF validation errors '+uncompressed.errors);
 await d.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));
 const glb=Buffer.from(await io.writeBinary(d));if(glb.length>20*1024*1024||glb.length<1000)throw Error('optimized tree byte budget '+glb.length);
 const compressed=await validate(glb,'tree.glb');
 await writeFile(dir+'/validation-compressed.json',JSON.stringify(compressed,null,2));
 // Official validator may report unsupported extension, retain warnings. Never suppress errors.
 if(compressed.errors)throw Error('compressed glTF validation errors '+compressed.errors);
 const decoded=await io.readBinary(glb),decodedTriangles=decoded.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((v,p)=>v+(p.getIndices()?.getCount()??p.getAttribute('POSITION')?.getCount()??0)/3,0),0);
 if(decodedTriangles!==after)throw Error('meshopt roundtrip triangle mismatch');
 await writeFile(dir+'/tree.glb',glb);
 manifest={...manifest,ready:true,name:'tree.glb',sourceBytes:total,bytes:glb.length,beforeTriangles:before,afterTriangles:after,sha256:createHash('sha256').update(glb).digest('hex'),files,validation:{uncompressed:{errors:uncompressed.errors,warnings:uncompressed.warnings},compressed:{errors:compressed.errors,warnings:compressed.warnings},decodedTriangles},optimization:'gltf-transform/meshopt'};
 console.log('FULL_TREE_ASSET',JSON.stringify(manifest));
}catch(e){manifest.error=String(e);console.error('FULL_TREE_ASSET_FAILED',String(e));}
finally{await writeFile(dir+'/manifest.json',JSON.stringify(manifest,null,2));await rm(temp,{recursive:true,force:true})}
