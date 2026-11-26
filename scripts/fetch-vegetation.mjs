import {mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const id='tree_small_02',dir='public/vegetation-assets';await mkdir(dir,{recursive:true});let manifest;
function entries(obj,trail=[]){if(!obj||typeof obj!=='object')return [];if(typeof obj.url==='string')return [{...obj,trail:trail.join('/')}];return Object.entries(obj).flatMap(([k,v])=>entries(v,[...trail,k]))}
async function getMap(meta,channel){
 const options=entries(meta).filter(e=>{const p=(e.trail+' '+e.url).toLowerCase();return p.includes(channel)&&/(1k|1024)/.test(p)&&/\.(png|jpg|jpeg)(\?|$)/i.test(e.url)});
 options.sort((a,b)=>Number(!a.url.endsWith('.png'))-Number(!b.url.endsWith('.png')));
 if(!options.length)throw Error('no 1k photo map '+channel);
 const entry=options[0],u=new URL(entry.url);if(u.protocol!=='https:'||u.hostname!=='dl.polyhaven.org')throw Error('unexpected asset host');
 const r=await fetch(u,{signal:AbortSignal.timeout(40000),redirect:'error'});if(!r.ok)throw Error('map HTTP '+r.status);
 const buf=Buffer.from(await r.arrayBuffer());if(!buf.length||buf.length>8*1024*1024)throw Error('map byte budget');
 if(entry.md5&&createHash('md5').update(buf).digest('hex')!==entry.md5)throw Error('MD5 mismatch');
 const name=channel+(u.pathname.endsWith('.png')?'.png':'.jpg');await writeFile(dir+'/'+name,buf);
 return {name,bytes:buf.length,sha256:createHash('sha256').update(buf).digest('hex'),source:u.href};
}
try{
 const r=await fetch('https://api.polyhaven.com/files/'+id,{headers:{'User-Agent':'DreamCity/0.4.4.1 (github.com/LvK2606/Dream-city)'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('metadata '+r.status);
 const meta=await r.json(),diff=await getMap(meta,'leaves_diff'),alpha=await getMap(meta,'leaves_alpha');
 manifest={ready:true,id,license:'CC0',diff:diff.name,alpha:alpha.name,bytes:diff.bytes+alpha.bytes,files:[diff,alpha]};console.log('VEGETATION_ASSET',JSON.stringify(manifest));
}catch(e){manifest={ready:false,id,error:String(e)};console.error('VEGETATION_ASSET_FAILED',String(e));if(process.env.REQUIRE_PHOTO_ASSETS==='1')process.exitCode=1}
await writeFile(dir+'/manifest.json',JSON.stringify(manifest,null,2));
