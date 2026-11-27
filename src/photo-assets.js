import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
// Assets are downloaded at build time, served same-origin. Fallback is deterministic.
export async function loadPhotoAssets({T,mat,groundMat,scene,renderer,HDRLoader,photoStatus,onEnv}){let manifest;try{const r=await fetch('/photo-assets/manifest.json');if(!r.ok)throw Error('asset manifest '+r.status);manifest=await r.json()}catch(e){photoStatus.failed.push(String(e));photoStatus.ready=true;return}
photoStatus.failed.push(...manifest.failed);const loader=new T.TextureLoader();async function tex(name,colorSpace){const t=await loader.loadAsync('/photo-assets/'+name);t.colorSpace=colorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}
const ktx=new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);photoStatus.ktx2={loaded:false,manifest:manifest.ktx2??null,maps:{},failures:[]};
async function pbr(key,channel,name,colorSpace){
 const id=key+'/'+channel,entry=manifest.ktx2?.maps?.[id];
 if(entry?.ready){try{const t=await ktx.loadAsync('/photo-assets/'+entry.name);
  t.colorSpace=colorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(t.image.width!==entry.width||t.image.height!==entry.height||t.mipmaps.length!==entry.levels){t.dispose();throw Error('decoded texture dimensions/mips')}
  photoStatus.ktx2.maps[id]={loaded:true,compressed:!!t.isCompressedTexture,format:t.format,width:t.image.width,height:t.image.height,mipmaps:t.mipmaps.length,colorSpace:channel==='diff'?'srgb':'linear'};return t
 }catch(e){photoStatus.ktx2.failures.push(id+': '+String(e))}}
 else photoStatus.ktx2.failures.push(id+': missing encoded map');
 return tex(name,colorSpace)
}
const jobs=manifest.loaded.map(async key=>{try{if(key==='sky'){const hdr=await new HDRLoader().loadAsync('/photo-assets/sky.hdr');hdr.mapping=T.EquirectangularReflectionMapping;const gen=new T.PMREMGenerator(renderer),env=gen.fromEquirectangular(hdr);gen.dispose();onEnv(env.texture,hdr)}else{const filename=channel=>{const name=Object.keys(manifest.files).find(n=>n.startsWith(key+'-'+channel+'.'));if(!name)throw Error('missing manifest '+channel);return name};const [map,normal,rough]=await Promise.all([pbr(key,'diff',filename('diff'),T.SRGBColorSpace),pbr(key,'nor_gl',filename('nor_gl'),T.NoColorSpace),pbr(key,'rough',filename('rough'),T.NoColorSpace)]);const m=key==='grass'?groundMat:mat[key];m.map=map;m.normalMap=normal;m.roughnessMap=rough;m.metalnessMap=null;m.metalness=0;m.roughness=1;m.normalScale.set(.65,.65);m.needsUpdate=true}photoStatus.loaded.push(key)}catch(e){photoStatus.failed.push(key+': '+String(e))}});await Promise.all(jobs);photoStatus.ktx2.loaded=Object.keys(photoStatus.ktx2.maps).length===15&&photoStatus.ktx2.failures.length===0;ktx.dispose();photoStatus.ready=true}
