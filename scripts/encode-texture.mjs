import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const dir='public/photo-assets',manifestPath=dir+'/manifest.json',m=JSON.parse(await readFile(manifestPath,'utf8'));
try{
 const name=Object.keys(m.files).find(n=>n.startsWith('grass-diff.')&&!n.endsWith('.ktx2'));
 if(!name)throw Error('missing grass diffuse input');
 const out='grass-diff.ktx2',src=path.resolve(dir,name),dst=path.resolve(dir,out);
 execFileSync(path.resolve('node_modules/.bin/basisu'),['-ktx2','-uastc','-uastc_level','2','-mipmap','-y_flip','-file',src,'-output_file',dst],{timeout:120000,stdio:'inherit'});
 const bytes=await readFile(dst),magic='ab4b5458203230bb0d0a1a0a';
 if(bytes.length<80||bytes.length>4*1024*1024||bytes.subarray(0,12).toString('hex')!==magic)throw Error('invalid KTX2 output');
 const w=bytes.readUInt32LE(20),h=bytes.readUInt32LE(24),levels=bytes.readUInt32LE(40),format=bytes.readUInt32LE(12);
 if(w!==1024||h!==1024||levels<2||format!==0)throw Error('invalid Basis KTX2 dimensions/mips/format');
 m.ktx2={ready:true,key:'grass',channel:'diff',name:out,source:name,sourceBytes:m.files[name].bytes,bytes:bytes.length,width:w,height:h,levels,encoder:'basisu@1.16.3/UASTC',sha256:createHash('sha256').update(bytes).digest('hex')};
 console.log('KTX2_ASSET',JSON.stringify(m.ktx2));
}catch(e){m.ktx2={ready:false,error:String(e)};console.error('KTX2_ASSET_FAILED',String(e));}
await writeFile(manifestPath,JSON.stringify(m,null,2));
