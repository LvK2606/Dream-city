import {mkdir,copyFile,stat} from 'node:fs/promises';
const dir='public/basis';await mkdir(dir,{recursive:true});
for(const name of ['basis_transcoder.js','basis_transcoder.wasm']){
 const src='node_modules/three/examples/jsm/libs/basis/'+name;
 const info=await stat(src);if(info.size<=0||info.size>4*1024*1024)throw Error('invalid local basis decoder '+name);
 await copyFile(src,dir+'/'+name);
}
