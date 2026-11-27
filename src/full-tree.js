import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
export async function loadFullTree(species=0){
 if(species!==0&&species!==1)throw Error('unsupported full tree species');const root=species===0?'/tree-model':'/tree-model/pine';
 const r=await fetch(root+'/manifest.json');if(!r.ok)throw Error('full tree manifest '+r.status);
 const m=await r.json();if(!m.ready)throw Error(m.error||'full tree asset unavailable');
 if(m.id!==(species===0?'tree_small_02':'pine_sapling_small')||m.name!=='tree.glb'||m.bytes>20*1024*1024||m.afterTriangles>350000)throw Error('invalid tree manifest');
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(root+'/'+m.name),object=gltf.scene;
 object.updateMatrixWorld(true);const box=new T.Box3().setFromObject(object),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=(species===0?4.5:5.1)/size.y;
 if(!Number.isFinite(scale)||scale<=0)throw Error('invalid full tree bounds');
 const group=new T.Group();group.add(object);object.scale.multiplyScalar(scale);object.position.sub(new T.Vector3(center.x,box.min.y,center.z).multiplyScalar(scale));group.updateMatrixWorld(true);
 const oldMaterials=new Set(),materials=new Set(),geometries=new Set(),textures=new Set();let meshes=0,triangles=0;
 object.traverse(o=>{if(!o.isMesh)return;meshes++;geometries.add(o.geometry);triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
  const replace=old=>{oldMaterials.add(old);for(const v of Object.values(old))if(v?.isTexture)textures.add(v);const mat=new T.MeshBasicMaterial({map:old.map??null,alphaMap:old.alphaMap??null,color:old.color??0xffffff,alphaTest:old.alphaTest>0?old.alphaTest:(old.transparent?.35:0),side:old.side,toneMapped:false});materials.add(mat);return mat};
  o.material=Array.isArray(o.material)?o.material.map(replace):replace(o.material);
 });
 if(!meshes||triangles<=0||triangles>500000)throw Error('full tree runtime triangle budget '+triangles);
 return {object:group,box:new T.Box3().setFromObject(group),report:{...m,meshes,renderedTriangles:triangles,loaded:true},dispose:()=>{for(const g of geometries)g.dispose();for(const mat of [...oldMaterials,...materials])mat.dispose();for(const t of textures)t.dispose()}};
}
