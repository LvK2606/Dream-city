import test from 'node:test';import assert from 'node:assert/strict';import {layout,groundHeight,roadXs,roadZs,bridges,roadAllowed} from '../src/world.js';import {textureSet} from '../src/materials.js';
test('deterministic separated lots and road clearance',()=>{const a=layout();assert.deepEqual(a,layout());assert.notDeepEqual(a,layout(5));assert.ok(a.length>150);assert.equal(new Set(a.map(x=>x.x+':'+x.z)).size,a.length);for(const l of a){assert.ok(roadXs.every(x=>Math.abs(x-l.x)>l.w/2+3.5));assert.ok(roadZs.every(z=>Math.abs(z-l.z)>l.d/2+3.5));assert.ok(l.floors>=1);assert.ok(groundHeight(l.x,l.z)>=0)}});
test('river and bridges',()=>{assert.equal(groundHeight(0,0),-5);assert.equal(groundHeight(24,0),0);assert.equal(roadAllowed(0,0),false);for(const z of bridges)assert.equal(roadAllowed(0,z),true)});
test('PBR maps have deterministic and packed channels',()=>{const a=textureSet('brick',1),b=textureSet('brick',1);assert.equal(a.map.image.width,256);assert.equal(a.metalnessMap,a.roughnessMap);assert.deepEqual(a.normalMap.image.data,b.normalMap.image.data);assert.ok(a.normalMap.image.data.some((v,i)=>i%4===2&&v<250));for(const m of [a,b]){for(const t of new Set([m.map,m.normalMap,m.roughnessMap,m.emissiveMap]))t.dispose();m.dispose()}});

import {cameraPresets,cameraClearance,terrainTint} from '../src/world.js';test('street camera stays on road and clear of buildings',()=>{assert.equal(cameraPresets.street[0][0],56);assert.ok(cameraClearance(cameraPresets.street[0]));assert.ok(cameraClearance(cameraPresets.street[1]));assert.equal(cameraClearance([layout()[0].x,2,layout()[0].z]),false)});test('terrain tint responds to slopes and height',()=>{assert.notDeepEqual(terrainTint(100,0,40,1),terrainTint(100,22,40,.7));for(const v of terrainTint(18,1,0,.9))assert.ok(Number.isFinite(v)&&v>0)});

import {chunkKey,carShell,carCabin,carWheel,gableRoof} from '../src/detail.js';test('spatial batches distinguish local and long geometry',()=>{assert.notEqual(chunkKey(1,2,4,5),chunkKey(90,2,94,5));assert.equal(chunkKey(1,2,100,5),'long')});test('vehicle and roof geometry is finite and nondegenerate',()=>{for(const g of [carShell(),carCabin(),carWheel(),gableRoof(10,9,2),gableRoof(10,9,2,true)]){g.computeBoundingBox();assert.ok(g.attributes.position.count>12);assert.ok([...g.attributes.position.array].every(Number.isFinite));assert.ok(g.boundingBox.max.y>g.boundingBox.min.y);g.dispose()}});

import {buildFacade,facadeStyle} from '../src/facade.js';test('modular facade deterministic, distinct, outward winding',()=>{const b={x:0,y:0,z:0,w:9,h:10.6,d:8,floors:4,kind:'apartment',style:0,seed:33};const a=buildFacade(b),c=buildFacade(b);assert.ok(a.windows>=40);assert.notEqual(facadeStyle('house',0).wall,facadeStyle('tower',0).wall);for(const [k,g] of Object.entries(a.geometries)){assert.deepEqual(g.attributes.position.array,c.geometries[k].attributes.position.array);const p=g.attributes.position.array,n=g.attributes.normal.array;for(let i=0;i<p.length;i+=12){const ax=p[i+3]-p[i],ay=p[i+4]-p[i+1],az=p[i+5]-p[i+2],bx=p[i+6]-p[i],by=p[i+7]-p[i+1],bz=p[i+8]-p[i+2];assert.ok((ay*bz-az*by)*n[i]+(az*bx-ax*bz)*n[i+1]+(ax*by-ay*bx)*n[i+2]>0)}g.dispose();c.geometries[k].dispose()}});

test('one window module per opening, room attributes valid',()=>{const r=buildFacade({x:0,y:0,z:0,w:9,h:10.6,d:8,floors:4,kind:'apartment',style:0,seed:33});assert.deepEqual(Object.keys(r.geometries),['windowModule']);const g=r.geometries.windowModule;assert.equal(g.attributes.position.count,r.windows*4);assert.equal(g.attributes.roomData.count,r.windows*4);assert.equal(g.index.count,r.windows*6);assert.ok([...g.attributes.roomData.array].every(v=>v>=0&&v<=2));g.dispose()});

import {buildFarFacade,chooseFacadeLOD,windowFlags} from '../src/facade-lod.js';test('facade LOD uses four quads and preserves grid and window light seeds',()=>{const b={x:0,y:0,z:0,w:9,h:10.6,d:8,floors:4,kind:'apartment',style:0,seed:33};const a=buildFacade(b),far=buildFarFacade({...b,spec:facadeStyle(b.kind,b.style)});assert.equal(far.geometry.index.count,24);assert.equal(far.windows,a.windows);assert.deepEqual([...a.geometries.windowModule.attributes.roomData.array.slice(0,2)],windowFlags(b.seed,0,0,0).map(Number));assert.equal(chooseFacadeLOD(88,'near','medium'),'near');assert.equal(chooseFacadeLOD(88,'far','medium'),'far');assert.equal(chooseFacadeLOD(200,'near','medium'),'far');assert.equal(chooseFacadeLOD(10,'far','medium'),'near');a.geometries.windowModule.dispose();far.geometry.dispose()});

import {panelCandidate} from '../src/architectural-assets.js';test('model ingestion rejects whole kits and overly complex panels',()=>{assert.ok(panelCandidate({x:2,y:2.5,z:.25},900,'window panel')>0);assert.equal(panelCandidate({x:8,y:3,z:8},1000,'kit'),-1);assert.equal(panelCandidate({x:2,y:2.5,z:.25},50000,'window'),-1)});

import {makeTreeGeometry,treeLOD} from '../src/vegetation.js';
test('vegetation LOD keeps hysteresis and strictly reduces geometry',()=>{assert.equal(treeLOD(39,0,'medium'),0);assert.equal(treeLOD(39,1,'medium'),1);assert.equal(treeLOD(500,0,'medium'),2);assert.equal(treeLOD(0,2,'low'),0);for(let species=0;species<2;species++){let prev=Infinity;for(let lod=0;lod<3;lod++){const g=makeTreeGeometry(species,lod),n=(g.wood.index.count+g.leaf.index.count)/3;assert.ok(n<prev);prev=n;for(const part of Object.values(g)){assert.ok([...part.attributes.position.array].every(Number.isFinite));assert.ok(part.boundingSphere.radius>0);part.dispose()}}}});

import {pixelLOD,projectedTreePixels} from '../src/vegetation.js';
test('projected vegetation LOD responds to scale and viewport, four decreasing tiers',()=>{assert.equal(pixelLOD(200,-1,'medium'),0);assert.equal(pixelLOD(80,-1,'medium'),1);assert.equal(pixelLOD(35,-1,'medium'),2);assert.equal(pixelLOD(10,-1,'medium'),3);assert.equal(pixelLOD(60,2,'medium'),2);assert.ok(projectedTreePixels(2,50,800,48)>projectedTreePixels(1,50,800,48));assert.ok(projectedTreePixels(1,50,800,48)>projectedTreePixels(1,100,800,48));for(let s=0;s<3;s++){let prev=Infinity;for(let l=0;l<4;l++){const g=makeTreeGeometry(s,l),n=(g.wood.index.count+g.leaf.index.count)/3;assert.ok(n<prev);prev=n;for(const x of Object.values(g))x.dispose()}}});

import {forestPosition} from '../src/vegetation.js';
test('forest grouping preserves river, developed area and world bounds',()=>{for(let x=-235;x<=235;x+=5)for(let z=-235;z<=235;z+=5){if(Math.abs(x)<24||(Math.abs(x)<160&&Math.abs(z)<123))continue;const [a,b]=forestPosition(x,z);assert.ok(Math.abs(a)>=24);assert.ok(Math.abs(a)>=160||Math.abs(b)>=123);assert.ok(Math.abs(a)<=237.5&&Math.abs(b)<=237.5);assert.deepEqual([a,b],forestPosition(x,z));}});

import {reflectionDecision,subtractPass,summarizeFrames} from '../src/render-budget.js';
test('reflection cache distinguishes motion, idle, invalidation and low mode',()=>{assert.equal(reflectionDecision({elapsed:1,moved:true,quality:'medium'}),false);assert.equal(reflectionDecision({elapsed:300,moved:true,quality:'medium'}),true);assert.equal(reflectionDecision({elapsed:300,moved:false,quality:'medium'}),false);assert.equal(reflectionDecision({elapsed:0,moved:false,quality:'high',invalid:true}),true);assert.equal(reflectionDecision({elapsed:9000,moved:true,quality:'low',invalid:true}),false);assert.deepEqual(subtractPass({calls:463,triangles:420000},{calls:225,triangles:210000}),{calls:238,triangles:210000});assert.equal(summarizeFrames([{calls:10,mainCalls:7,reflectionCalls:3},{calls:8,mainCalls:8,reflectionCalls:0}]).reflectionSamples,1)});
import {simplifyPanel} from '../src/mesh-optimization.js';
import {PlaneGeometry} from 'three';
test('meshoptimizer reduces indexed geometry and retains UVs under error budget',async()=>{const g=new PlaneGeometry(10,10,16,16),old=g.index.count,uv=g.attributes.uv;const s=await simplifyPanel(g);assert.ok(s.applied);assert.ok(g.index.count<old);assert.equal(g.attributes.uv,uv);assert.ok(s.error<=.008);g.dispose()});

import {buildShadowProxies} from '../src/shadow-batching.js';
import {Scene,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
test('shadow-only batching keeps identical static triangle count and hides proxies from main pass',()=>{const s=new Scene(),meshes=[];for(let i=0;i<8;i++){const g=new BoxGeometry(2,3,4);g.translate(i*3,0,0);const m=new Mesh(g,new MeshBasicMaterial());m.castShadow=true;s.add(m);meshes.push(m)}const a=buildShadowProxies(s,meshes);assert.equal(a.sourceTriangles,96);assert.equal(a.triangles,96);assert.equal(a.proxyMeshes,1);assert.ok(meshes.every(m=>!m.castShadow));assert.ok(a.proxies.every(m=>m.castShadow&&!m.visible))});

import {planBuilding} from '../src/architecture.js';
test('architecture massing preserves floor totals, contiguous heights and bounded setbacks',()=>{const variants=new Set();for(const l of layout()){const p=planBuilding(l);variants.add(l.kind+':'+p.variant);assert.deepEqual(p,planBuilding(l));assert.equal(p.parts.reduce((n,x)=>n+x.floors,0),l.floors);let y=.68;for(const a of p.parts){assert.ok(Math.abs(a.y-y)<1e-8);assert.ok(a.w/2+Math.abs(a.x-l.x)<=l.w/2+.501);assert.ok(a.d/2+Math.abs(a.z-l.z)<=l.d/2+.501);y+=a.h;}assert.ok(Math.abs(y-p.roofY)<1e-8)}assert.ok(variants.size>=16)});

import {buildStreetDetails,createTraffic,vehiclePose,laneCatalog} from '../src/streets.js';
test('street kit has bounded furniture and lane traffic stays off unbridged river',()=>{const kit=buildStreetDetails({box:()=>{},plane:()=>{}});assert.ok(kit.markings>100&&kit.furniture===6&&kit.signals>20);const cars=createTraffic(100);assert.deepEqual(cars,createTraffic(100));assert.equal(cars.length,100);assert.ok(laneCatalog().length>30);for(const c of cars){for(const t of [0,.25,.5,.75,.999]){const p=vehiclePose({...c,t});assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));if(c.axis===0&&!bridges.includes(c.z))assert.ok(Math.abs(p.x)>=24);}}for(const id of new Set(cars.map(c=>c.lane))){const lane=cars.filter(c=>c.lane===id);if(lane.length>1){const t=lane.map(c=>c.t).sort((a,b)=>a-b);for(let i=0;i<t.length;i++)assert.ok(((t[(i+1)%t.length]-t[i]+1)%1)*lane[0].length>7);}}});

import {rockPositions,parkTreePosition,parks,landscapeDetails} from '../src/landscape.js';
test('landscape preserves flat city, river, park paths and outcrop exclusion',()=>{for(let x=-160;x<=160;x+=8)for(let z=-120;z<=120;z+=8)if(Math.abs(x)>=24)assert.equal(groundHeight(x,z),0);assert.deepEqual(rockPositions(),rockPositions());assert.ok(rockPositions().length>=40);for(const p of rockPositions()){assert.ok(Math.abs(p.x)>=28&&(Math.abs(p.x)>=166||Math.abs(p.z)>=128));assert.ok(p.y>2&&Number.isFinite(p.s))}for(const [x,z] of parks){const [a,b]=parkTreePosition(x,z,x+.2,z-.1);assert.ok(Math.abs(a-x)>=2.8&&Math.abs(b-z)>=2.8)}const k=landscapeDetails({box:()=>{},plane:()=>{}});assert.equal(k.parks,4);assert.equal(k.paths,12)});

import {lightingProfile,resolutionScale,createNightSky} from '../src/rendering.js';
test('lighting profiles and pixel budgets remain deterministic, night sky is isolated',()=>{const day=lightingProfile('day'),night=lightingProfile('night');assert.ok(day.sun>night.sun&&day.environment>night.environment);for(const q of ['low','medium','high']){const d=resolutionScale(q,3,3840,2160);assert.ok(d>0&&d*d*3840*2160<=(q==='high'?3000000:q==='medium'?1800000:500000)+1)}assert.equal(resolutionScale('low',1,390,844),.75);const sky=createNightSky();assert.equal(sky.visible,false);assert.equal(sky.material.depthWrite,false);sky.geometry.dispose();sky.material.dispose()});

import {staticBatchKey,batchInventory} from '../src/static-batching.js';
test('static coalescing preserves explicit facade regions and groups lightweight details only',()=>{const a={min:{x:10,z:10},max:{x:11,z:11}},b={min:{x:110,z:10},max:{x:111,z:11}};assert.equal(staticBatchKey('paint',a),staticBatchKey('paint',b));assert.notEqual(staticBatchKey('brickWall',a),staticBatchKey('brickWall',b));assert.equal(staticBatchKey('windowModule',a,'region-X'),'windowModule|region-X');const g=new BoxGeometry(1,1,1),s=batchInventory(new Map([['paint|0,0',[g,g]]]));assert.equal(s.triangles,24);assert.equal(s.byMaterial.paint.batches,1);g.dispose()});

import {trafficTransition,interactionResult} from './interaction-checks.mjs';
test('traffic QA uses fresh frames and distinguishes freeze, resume and wraparound',()=>{
 const snap=(frames,paused,trafficSample)=>({frames,motion:{paused,trafficSample}});
 assert.equal(trafficTransition(snap(3,true,.5),snap(5,true,.5),true).ok,true);
 assert.equal(trafficTransition(snap(3,true,.5),snap(5,true,.51),true).ok,false);
 assert.equal(trafficTransition(snap(6,false,.5),snap(6,false,.51),false).ok,false);
 assert.equal(trafficTransition(snap(6,false,.5),snap(8,false,.5),false).ok,false);
 assert.equal(trafficTransition(snap(6,false,.5),snap(8,true,.51),false).ok,false);
 assert.equal(trafficTransition(snap(6,false,.99),snap(8,false,.01),false).ok,true);
 assert.equal(trafficTransition(snap(6,false,NaN),snap(8,false,.01),false).ok,false);
});
test('interaction report cannot pass with a failed assertion, exception or empty checks',()=>{
 assert.equal(interactionResult('mobile',[{ok:true}],{}).passed,true);
 assert.equal(interactionResult('mobile',[{ok:true},{ok:false}],{}).passed,false);
 assert.equal(interactionResult('mobile',[{ok:true}],{},'timeout').passed,false);
 assert.equal(interactionResult('mobile',[],{}).passed,false);
});

import {atlasUV,makeBakedCards,TREE_ANGLES,thinLeafPairs,createPrototype} from '../src/tree-prototypes.js';
test('baked cards use separate atlas cells with gutters and six triangles',()=>{const g=makeBakedCards(2,5);assert.equal(g.index.count/3,6);for(let i=0;i<3;i++){const a=atlasUV(0,0,i),b=atlasUV(1,1,i);assert.ok(a[0]>i/3&&b[0]<(i+1)/3&&a[1]>0&&b[1]<1)}assert.equal(TREE_ANGLES.length,3);g.dispose()});

test('Node can import asset adapter without browser-only texture loads',async()=>{await assert.rejects(()=>createPrototype(0),/require browser DOM/)});
test('released EZ-Tree double-leaf topology reduction preserves indexed pairs and UVs',()=>{const g=makeBakedCards(2,5,[0,1,2,3]);const t=thinLeafPairs(g);assert.equal(g.index.count,24);assert.equal(t.index.count,12);assert.equal(t.attributes.position.count,8);assert.equal(t.attributes.uv.count,8);assert.ok(t.attributes.position.array.every(Number.isFinite));assert.throws(()=>thinLeafPairs(makeBakedCards(2,5)),/unexpected EZ-Tree leaf topology/);t.dispose();g.dispose()});

import {directionCell,AZIMUTHS,ELEVATIONS} from '../src/directional-impostor.js';
test('directional atlas wraps yaw and brackets elevation',()=>{const a=directionCell(-.01,17.5);assert.equal(a.a0,7);assert.equal(a.a1,0);assert.ok(a.aw>.9);assert.equal(a.e0,1);assert.equal(a.ew,.5);assert.equal(directionCell(0,-90).ew,0);assert.equal(directionCell(0,89).ew,1);assert.equal(AZIMUTHS*ELEVATIONS.length,32)});

import {enhanceCoverage,TILE} from '../src/directional-impostor.js';
test('impostor coverage expansion is limited to one texel and preserves original covered samples',()=>{const p=new Uint8ClampedArray(7*7*4),i=(3*7+3)*4;p.set([20,80,30,255],i);enhanceCoverage(p,7,7);assert.deepEqual(Array.from(p.slice(i,i+4)),[20,80,30,255]);assert.deepEqual(Array.from(p.slice(i+4,i+8)),[20,80,30,140]);assert.equal(p[i+11],0);assert.equal(p[i+7*4+7],0);assert.equal(TILE,256)});

import {volumeCards} from '../src/directional-impostor.js';
test('hybrid foliage uses baked view cells and actual intersecting geometry',()=>{for(const extra of [false,true]){const g=volumeCards({extent:3,center:[0,2,0]},extra);assert.equal(g.index.count/3,extra?14:10);const p=g.attributes.position,uv=g.attributes.uv;let z=0;for(let i=0;i<p.count;i++){z=Math.max(z,Math.abs(p.getZ(i)));assert.ok(uv.getX(i)>0&&uv.getX(i)<1&&uv.getY(i)>0&&uv.getY(i)<1)}assert.ok(z>2);assert.ok(g.boundingSphere.radius>3);g.dispose()}});

import {reliefCards} from '../src/directional-impostor.js';
test('source-depth relief proxy has bounded triangles and actual displaced positions',()=>{const data=new Uint8Array(2048*1024);data.fill(190);const b={extent:3,center:[0,2,0],atlas:[2048,1024],depthBytes:data,depthRange:3.45};const r=reliefCards(b);assert.equal(r.geometry.index.count/3,1280);assert.equal(r.sampled,r.total);assert.ok(r.geometry.attributes.position.array.every(Number.isFinite));r.geometry.dispose();assert.throws(()=>reliefCards({...b,depthBytes:new Uint8Array(1)}),/missing relief depth/)});
