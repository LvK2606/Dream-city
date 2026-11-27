import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const dir='public/photo-assets',manifestPath=dir+'/manifest.json',m=JSON.parse(await readFile(manifestPath,'utf8'));
const keys=['asphalt','grass','paving','brickWall','panelWall'],channels=['diff','nor_gl','rough'],maps={},failures=[];
for(const key of keys)for(const channel of channels){
 try{
  const name=Object.keys(m.files).find(n=>n.startsWith(key+'-'+channel+'.')&&!n.endsWith('.ktx2'));
  if(!name)throw Error('missing input');
  const out=key+'-'+channel+'.ktx2',src=path.resolve(dir,name),dst=path.resolve(dir,out);
  const flags=channel==='diff'?[]:['-linear'];
  const normal=channel==='nor_gl',codec=normal?'UASTC':'ETC1S',profile=normal?['-uastc','-uastc_level','2']:['-q',channel==='diff'?'190':'128','-comp_level','2'];
  execFileSync(path.resolve('node_modules/.bin/basisu'),['-ktx2',...profile,'-mipmap','-y_flip',...flags,'-file',src,'-output_file',dst],{timeout:120000,stdio:'inherit'});
  const bytes=await readFile(dst),magic='ab4b5458203230bb0d0a1a0a';
  if(bytes.length<80||bytes.length>4*1024*1024||bytes.subarray(0,12).toString('hex')!==magic)throw Error('invalid KTX2 output');
  const w=bytes.readUInt32LE(20),h=bytes.readUInt32LE(24),levels=bytes.readUInt32LE(40),format=bytes.readUInt32LE(12),scheme=bytes.readUInt32LE(44);
  if(w!==1024||h!==1024||levels<2||format!==0||(!normal&&scheme!==1)||(normal&&scheme!==0&&scheme!==2))throw Error('invalid Basis KTX2 dimensions/mips/format');
  maps[key+'/'+channel]={ready:true,key,channel,name:out,source:name,sourceBytes:m.files[name].bytes,bytes:bytes.length,width:w,height:h,levels,colorSpace:channel==='diff'?'srgb':'linear',codec,scheme,encoder:'basisu@1.16.3/'+codec,sha256:createHash('sha256').update(bytes).digest('hex')};
  console.log('KTX2_ASSET',JSON.stringify(maps[key+'/'+channel]));
 }catch(e){failures.push(key+'/'+channel+': '+String(e));console.error('KTX2_ASSET_FAILED',failures.at(-1))}
}
m.ktx2={ready:failures.length===0&&Object.keys(maps).length===15,maps,failures,sourceBytes:Object.values(maps).reduce((a,b)=>a+b.sourceBytes,0),bytes:Object.values(maps).reduce((a,b)=>a+b.bytes,0)};
await writeFile(manifestPath,JSON.stringify(m,null,2));
if(process.env.REQUIRE_PHOTO_ASSETS==='1'&&(!m.ktx2.ready||m.ktx2.bytes>10000000))process.exitCode=1;
