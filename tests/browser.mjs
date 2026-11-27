import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {trafficTransition,interactionResult} from './interaction-checks.mjs';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const out=process.env.QA_DIR||'qa',reports=[],failures=[],interactions=[],lodSweep=[],depthAB=[],closeViews=[],captures=[],octAB=[];mkdirSync(out,{recursive:true});
async function capture(page,options){
 const info=await page.evaluate(()=>window.__DREAM_QA__.freezeCapture(true));
 try{await page.screenshot({...options,timeout:90000});captures.push({file:options.path.split('/').at(-1),...info});}
 finally{await page.evaluate(()=>window.__DREAM_QA__.freezeCapture(false))}
}
const cases=[['aerial','day'],['street','day'],['river','sunset'],['aerial','night']];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};
function validate(s,name,cam,light,high){
 const k=name+'/'+cam+'/'+light+(high?'/high':''),v=s.vegetation,p=s.passes.window;
 const ck=(ok,msg)=>check(ok,k+' '+msg);
 ck(s.version==='0.4.10.10','version');if(process.env.EXPECT_BUILD_SHA)ck(s.buildSha===process.env.EXPECT_BUILD_SHA,'SHA');
 ck(s.architecture.variants>=16&&s.architecture.volumes>s.buildings&&s.architecture.buildings===s.buildings,'architecture massing');
 ck(s.streets.markings>100&&s.streets.furniture===6&&s.streets.signals>20&&s.streets.lanes>30&&s.cars===100,'street detail and traffic');
 ck(s.landscape.parks===4&&s.landscape.paths===12&&s.landscape.rocks>=40&&s.landscape.triangles<=2240&&s.landscape.drawUpperBound===1,'landscape kit');
 ck(s.rendering.profile===light&&s.rendering.nightSky===(light==='night')&&s.rendering.roofEmission.every(v=>v===0)&&s.rendering.dpr>0&&s.rendering.dpr<=(high?1.6:name==='mobile'?.75:1.15),'lighting and resolution profile');
 ck(s.staticBatch.strategy==='coarse-lightweight-static-detail-v1'&&s.staticBatch.batches===s.chunks&&s.staticBatch.triangles>1000,'static batching inventory');
 ck(s.ready&&s.buildings>150&&s.trees>500,'population');ck(s.facadeQuads===s.facadeWindows&&s.facadeWindows>3000&&s.facadeStyles>=12&&s.chunks>20,'facades');
 ck(v.total===s.trees&&v.near+v.mid+v.far===s.trees&&v.levels.length===4&&v.levels.reduce((a,b)=>a+b,0)===s.trees,'LOD accounting');
 ck(v.rendered+v.culled===s.trees&&v.visibleLevels.reduce((a,b)=>a+b,0)===v.rendered&&v.mainPassDrawUpperBound<=24&&v.triangles<s.trees*100&&v.regions>8&&v.neutralTint&&!v.legacyCanopy,'vegetation budget');
 ck(v.pipeline.ready&&v.pipeline.loaded&&v.pipeline.species.length===3&&v.pipeline.cameraFacing&&v.pipeline.depthReprojection&&!v.pipeline.depthEnabled&&v.pipeline.octEnabled&&v.pipeline.defaultColorTaps===3&&v.pipeline.legacyColorTaps===4&&v.pipeline.species.every(p=>p.octahedral?.views===49&&p.octahedral.grid===6&&p.octahedral.slot===128&&p.octahedral.atlas[0]===1024&&p.octahedral.atlas[1]===1024&&p.octahedral.bytes===4194304&&p.octahedral.filtered&&p.octahedral.coverage.length===49&&p.octahedral.coverage.every(c=>c>.008&&c<.94)&&p.views===32&&p.coverage.length===32&&p.coverage.every(c=>c>.008&&c<.94)&&p.enhancedCoverage.length===32&&p.enhancedCoverage.every(c=>c>.008&&c<.99)&&p.filteredMipmaps&&p.sourceTriangles>p.nearTriangles&&p.nearTriangles<=1600&&p.farTriangles===2&&p.midFarTriangles===10&&p.midTriangles===14&&p.volumeCards&&p.sharedFarAtlas&&p.nearSource===p.source&&p.depthCoverage.length===32&&p.depthCoverage.every(c=>c>.008&&c<.94)&&p.depthRanges.length===32&&p.depthRanges.every(([a,b])=>b-a>=3)&&p.depthAtlasBytes===2048*1024&&p.atlas[0]===2048&&p.atlas[1]===1024),'real EZ-Tree prototypes and 32-view directional atlas');
 ck(v.pipeline.fullModel.loaded&&v.pipeline.fullModel.validation?.uncompressed.errors===0&&v.pipeline.fullModel.validation?.compressed.errors===0&&v.pipeline.fullModel.validation?.decodedTriangles===v.pipeline.fullModel.afterTriangles&&v.pipeline.fullModel.afterTriangles<=350000&&v.pipeline.fullModel.bytes<=20*1024*1024&&v.pipeline.species[0].source==='polyhaven-full-model'&&v.pipeline.species[0].reliefSamples>0&&v.pipeline.species[0].reliefVertices>=v.pipeline.species[0].reliefSamples&&v.pipeline.species[0].nearMethod==='source-depth-patches'&&v.pipeline.species[0].nearTriangles===2*v.pipeline.species[0].reliefSamples&&v.pipeline.species[0].nearTriangles<=1536&&v.pipeline.species[0].patchVoxels>20&&v.pipeline.species[0].patchDepthSamples>100&&v.pipeline.species[0].silhouette.length===6&&v.pipeline.species[0].silhouette.every(s=>s.iou>=.4&&s.areaRatio>=.65&&s.areaRatio<=1.55)&&v.pipeline.species[0].silhouette.reduce((n,s)=>n+s.iou,0)/6>=.55&&v.pipeline.species[0].sourceMask&&v.pipeline.species[0].sourceAlphaPixels>0&&v.pipeline.species[0].silhouettePass&&v.pipeline.species[0].holdoutPass&&v.pipeline.species[0].holdout.length===4&&v.pipeline.species[0].holdout.every(s=>s.iou>=.4&&s.areaRatio>=.65&&s.areaRatio<=1.55)&&v.pipeline.species[0].holdout.reduce((n,s)=>n+s.iou,0)/4>=.55,'optimized full external tree actually baked');
 const pine=v.pipeline.pineModel,pineSpecies=v.pipeline.species[1];
 ck(pine?.loaded&&pine.id==='pine_sapling_small'&&pine.validation?.uncompressed.errors===0&&pine.validation?.compressed.errors===0&&pine.validation?.decodedTriangles===pine.afterTriangles&&pine.afterTriangles<=350000&&pine.bytes<=20*1024*1024&&pineSpecies.source==='polyhaven-pine-model'&&pineSpecies.nearMethod==='source-depth-patches'&&pineSpecies.nearTriangles<=1536&&pineSpecies.nearTriangles===2*pineSpecies.reliefSamples&&pineSpecies.sourceMask&&pineSpecies.silhouettePass&&pineSpecies.holdoutPass&&pineSpecies.silhouette.length===6&&pineSpecies.holdout.length===4&&pineSpecies.silhouette.every(s=>s.iou>=.4&&s.areaRatio>=.65&&s.areaRatio<=1.55)&&pineSpecies.holdout.every(s=>s.iou>=.4&&s.areaRatio>=.65&&s.areaRatio<=1.55),'independent external pine source and silhouette gates');
 ck(v.pipeline.infill>=120&&v.pipeline.infill<=180,'bounded hillside infill');
 ck(s.photoAssets.ktx2?.loaded&&s.photoAssets.ktx2.manifest.ready&&s.photoAssets.ktx2.manifest.bytes<=10000000&&Object.keys(s.photoAssets.ktx2.maps).length===15&&Object.entries(s.photoAssets.ktx2.maps).every(([id,p])=>p.loaded&&p.width===1024&&p.height===1024&&p.mipmaps===11&&p.colorSpace===(id.endsWith('/diff')?'srgb':'linear')&&s.photoAssets.ktx2.manifest.maps[id].encoder===('basisu@1.16.3/'+(id.endsWith('/nor_gl')?'UASTC':'ETC1S'))),'15 real KTX2 PBR maps decoded and applied');
 ck(v.understory.population>100&&v.understory.drawUpperBound<=2&&v.understory.triangles<=5000,'undergrowth budget');
 if(process.env.REQUIRE_PHOTO_ASSETS==='1')ck(v.assets.loaded&&v.assets.coverage>.04&&v.assets.coverage<.96&&s.photoAssets.loaded.length===6,'photo assets');
 ck(s.modelAssets.loaded&&s.modelAssets.instances>=12&&s.modelAssets.triangles<=288000&&s.modelAssets.optimization==='meshoptimizer-attribute-aware'&&s.modelAssets.selected.every(a=>a.optimization.after<=a.optimization.before&&a.optimization.error<=.008),'model optimization');
 ck(s.shadowBatch.sourceMeshes>s.shadowBatch.proxyMeshes&&s.shadowBatch.sourceTriangles===s.shadowBatch.triangles,'shadow proxy integrity');
 ck(p.samples>=5&&s.frameTiming.samples>=5,'frame count');
 ck(s.passes.main.calls+s.passes.reflection.calls+s.passes.shadow.calls===s.drawCalls,'call accounting');
 ck(s.passes.main.triangles+s.passes.reflection.triangles+s.passes.shadow.triangles===s.triangles,'triangle accounting');
 if(cam==='street')ck(s.cameraClear&&v.near+v.mid>0&&s.facadeLOD.near>0,'street clearance/detail');
 if(cam==='aerial')ck(v.far>s.trees*.5&&s.facadeLOD.far>0&&s.facadeLOD.activeQuads<s.facadeWindows*.65,'aerial LOD');
 ck(s.facadeLOD.activeQuads<=s.facadeWindows,'facade bounds');if(light==='day')ck(s.photographicSky,'photo sky');
 if(name==='mobile'){
  const cap=cam==='street'?92:cam==='river'?110:185;ck(v.culled>0&&p.reflectionCalls===0&&p.shadowCalls===0,'mobile culling/pass');
  ck(p.totalCalls<=cap,'peak calls '+p.totalCalls+' > '+cap);ck(p.totalTriangles<=200000,'peak triangles '+p.totalTriangles+' > 200000');
 }else{
  const cap=high?350:cam==='street'?155:light==='night'?620:cam==='river'?680:310,reflectionCap=high?300:260,totalCap=high?650:cap+260;
  ck(v.culled===0,'reflection population');ck(p.mainCalls<=cap,'main calls '+p.mainCalls+' > '+cap);
  ck(p.reflectionCalls<=reflectionCap,'reflection calls '+p.reflectionCalls+' > '+reflectionCap);
  ck(p.totalCalls<=totalCap,'total calls '+p.totalCalls+' > '+totalCap);
  ck(p.shadowCalls<=40&&p.shadowSamples>0,'shadow calls '+p.shadowCalls+' or no shadow sample');
  if(cam!=='street')ck(p.reflectionSamples>0,'reflection sample');
  if(high)ck(s.highAO,'high AO');
 }
}
async function interactionQA(page,name,viewport,out,check){
 const checks=[],evidence={};
 const verify=(ok,label)=>{const pass=!!ok;checks.push({label,ok:pass});check(pass,name+' '+label)};
 const read=()=>page.evaluate(()=>window.__DREAM_QA__.report());
 const waitFrames=(n,count=2)=>page.waitForFunction(({n,count})=>window.__DREAM_QA__.report().frames>=n+count,{n,count},{timeout:120000});
 const toggle=page.locator('#panel-toggle');
 try{
  if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  verify(await page.locator('#panel').isVisible(),'panel opens');
  await page.locator('#hide').click();verify(!(await page.locator('#panel').isVisible()),'clean mode hides panel');
  await page.keyboard.press('Escape');verify(await page.locator('#panel').isVisible(),'Escape restores HUD');
  await page.locator('#pause').click();const paused=await read();await waitFrames(paused.frames);const still=await read();
  evidence.pause=trafficTransition(paused,still,true);verify(evidence.pause.ok,'pause holds traffic across fresh frames');
  await page.locator('#pause').click();const resumed=await read();
  await waitFrames(resumed.frames);const moving=await read();
  evidence.resume=trafficTransition(resumed,moving,false);
  verify(evidence.resume.ok,'traffic resumes across fresh frames');
  await page.locator('[data-camera="street"]').click();const street=await read();evidence.street=street.motion;
  await page.locator('[data-camera="aerial"]').click();
  await page.waitForFunction(()=>{const r=window.__DREAM_QA__.report();return !r.motion.tween&&Math.abs(r.motion.position[0]-185)<1&&Math.abs(r.motion.position[1]-145)<1},{},{timeout:120000});
  const aerial=await read();evidence.aerial=aerial.motion;verify(Math.abs(street.motion.position[0]-aerial.motion.position[0])>20,'camera transition');
  await page.locator('[data-light="night"]').click();const switched=await read();await waitFrames(switched.frames,1);const night=await read();evidence.night=night.rendering;
  verify(night.light==='night'&&night.rendering.nightSky,'lighting switch');
  await page.setViewportSize({width:viewport.height,height:viewport.width});
  await page.waitForFunction(([w,h])=>{const r=window.__DREAM_QA__.report();return r.motion.viewport[0]===w&&r.motion.viewport[1]===h},[viewport.height,viewport.width],{timeout:120000});
  const resized=await read();await waitFrames(resized.frames,1);evidence.resized=resized.motion;
  if(name==='mobile'){
   verify(await toggle.getAttribute('aria-expanded')==='false','landscape defaults collapsed');
   verify(!(await page.locator('#panel').isVisible()),'landscape unobstructed by default');
   if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
   const bounds=await page.locator('#panel').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,viewport:[innerWidth,innerHeight]}});
   evidence.landscapePanel=bounds;
   verify(bounds.width>0&&bounds.height>0&&bounds.left>=0&&bounds.top>=0&&bounds.right<=bounds.viewport[0]+1&&bounds.bottom<=bounds.viewport[1]+1&&bounds.width<=bounds.viewport[0]*.48&&bounds.scrollWidth<=bounds.clientWidth+1,'landscape bounded scrollable panel');
   await page.locator('#pause').scrollIntoViewIfNeeded();verify(await page.locator('#pause').isVisible(),'landscape controls accessible');
  }
  await capture(page,{path:out+'/'+name+'-interaction-resize.png'});
  if(name==='mobile'){await toggle.click();verify(!(await page.locator('#panel').isVisible()),'landscape panel closes again');}
  return interactionResult(name,checks,evidence);
 }catch(e){
  const error=String(e);verify(false,'interaction exception: '+error);
  try{await capture(page,{path:out+'/'+name+'-interaction-error.png'})}catch{}
  return interactionResult(name,checks,evidence,error);
 }
}

try{
 for(const [name,viewport] of [['desktop',{width:1280,height:800}],['mobile',{width:390,height:844}]]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  try{
   await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>{const s=window.__DREAM_QA__?.report();return s?.frames>3&&s.photoAssets.ready&&s.modelAssets.ready&&s.vegetation.assets.ready&&s.vegetation.pipeline.ready},{},{timeout:120000});
   if(name==='mobile')check(await page.locator('#panel-toggle').getAttribute('aria-expanded')==='false','mobile initial collapse');
   const scenes=[...cases.map(([c,l])=>[c,l,false]),...(name==='desktop'?[['street','day',true]]:[])];
   for(const [cam,light,high] of scenes){
    const file=high?'desktop-high-street-day':name+'-'+cam+'-'+light;
    try{
     await page.evaluate(([c,l,q])=>{const a=window.__DREAM_QA__;a.setQuality(q);a.setCamera(c);a.setLight(l);a.resetFrameTiming()},[cam,light,high?'high':name==='mobile'?'low':'medium']);
     await page.waitForFunction(()=>{const s=window.__DREAM_QA__.report();return s.passes.window.samples>=5&&s.frameTiming.samples>=5},{},{timeout:120000});
     const shot=await page.evaluate(()=>window.__DREAM_QA__.report());
     reports.push({name,cam,light,...shot});await capture(page,{path:out+'/'+file+'.png'});await page.evaluate(()=>{window.__DREAM_QA__.setClean(true);document.body.classList.add('qa-clean')});try{await capture(page,{path:out+'/'+file+'-clean.png'})}finally{await page.evaluate(()=>{document.body.classList.remove('qa-clean');window.__DREAM_QA__.setClean(false)})}validate(shot,name,cam,light,high);
     console.log(file,JSON.stringify(shot));
    }catch(e){failures.push(file+': '+String(e));try{await capture(page,{path:out+'/'+file+'-error.png'})}catch{}}
   }
   if(name==='desktop'){
    try{
     await page.evaluate(()=>{const a=window.__DREAM_QA__;a.setQuality('medium');a.setLight('day');a.setClean(true);document.body.classList.add('qa-clean')});
     for(const [lod,pixels] of [[0,200],[1,88],[2,40],[3,14]]){
      const info=await page.evaluate(p=>{const a=window.__DREAM_QA__,info=a.setTreeView(p);return {...info,frame:a.report().frames}},pixels);
      await page.waitForFunction(n=>window.__DREAM_QA__.report().frames>=n+2,info.frame,{timeout:120000});
      const sample=await page.evaluate(()=>({tree:window.__DREAM_QA__.qaTree(),frame:window.__DREAM_QA__.report().frames}));
      lodSweep.push({expected:lod,...info,...sample});
      check(sample.tree?.index===info.index&&sample.tree.lod===lod,'tree sweep expected LOD '+lod+' got '+sample.tree?.lod);
      await capture(page,{path:out+'/desktop-tree-lod-'+lod+'.png'});
     }
    }catch(e){failures.push('tree LOD sweep '+String(e))}
    finally{await page.evaluate(()=>{const a=window.__DREAM_QA__;a.setClean(false);document.body.classList.remove('qa-clean');a.setCamera('street');a.setLight('day')})}
   }
   if(name==='desktop'){
    try{
     await page.evaluate(()=>{const a=window.__DREAM_QA__;a.setQuality('medium');a.setCamera('street');a.setLight('day');a.setClean(true);document.body.classList.add('qa-clean')});
     for(const enabled of [false,true,false]){
      const frame=await page.evaluate(e=>{const a=window.__DREAM_QA__;a.setOctMode(false);a.setDepthMode(e);return a.report().frames},enabled);
      await page.waitForFunction(n=>window.__DREAM_QA__.report().frames>=n+2,frame,{timeout:120000});
      await page.evaluate(()=>window.__DREAM_QA__.resetFrameTiming());
      await page.waitForFunction(()=>window.__DREAM_QA__.report().frameTiming.samples>=3,{},{timeout:120000});
      const report=await page.evaluate(()=>window.__DREAM_QA__.report());
      check(report.vegetation.pipeline.depthEnabled===enabled&&!report.vegetation.pipeline.octEnabled,'depth AB actual mode');
      depthAB.push({enabled,sha:report.buildSha,frame:report.frames,position:report.motion.position,frameTiming:report.frameTiming,passes:report.passes.window});
      if(depthAB.length<=2)await capture(page,{path:out+'/desktop-depth-'+(enabled?'on':'off')+'.png'});
     }
     check(depthAB.every(r=>r.position.every((x,i)=>Math.abs(x-depthAB[0].position[i])<.01)),'depth AB fixed camera');
    }catch(e){failures.push('depth AB '+String(e))}
    finally{await page.evaluate(()=>{const a=window.__DREAM_QA__;a.setDepthMode(false);a.setOctMode(true);a.setClean(false);document.body.classList.remove('qa-clean')})}
   }
   if(name==='desktop'){
    try{
     await page.evaluate(()=>{const a=window.__DREAM_QA__;a.setQuality('medium');a.setLight('day');a.setClean(true);document.body.classList.add('qa-clean')});
     for(const [i,yaw] of [0,Math.PI/2,Math.PI,3*Math.PI/2].entries()){
      const info=await page.evaluate(y=>{const a=window.__DREAM_QA__,info=a.setTreeView(450,y);return {...info,frame:a.report().frames}},yaw);
      await page.waitForFunction(n=>window.__DREAM_QA__.report().frames>=n+2,info.frame,{timeout:120000});
      const sample=await page.evaluate(()=>({tree:window.__DREAM_QA__.qaTree(),frame:window.__DREAM_QA__.report().frames,sha:window.__DREAM_QA__.report().buildSha}));
      closeViews.push({...info,...sample});check(sample.tree?.index===info.index&&sample.tree.lod===0,'close source tree LOD0 angle '+i);
      await capture(page,{path:out+'/desktop-tree-close-'+i+'.png'});
     }
    }catch(e){failures.push('tree close views '+String(e))}
    finally{await page.evaluate(()=>{const a=window.__DREAM_QA__;a.setClean(false);document.body.classList.remove('qa-clean');a.setCamera('street');a.setLight('day')})}
   }
   if(name==='desktop'){
    try{
     await page.evaluate(()=>{const a=window.__DREAM_QA__;a.setQuality('medium');a.setCamera('aerial');a.setLight('day');a.setClean(true);document.body.classList.add('qa-clean');a.setDepthMode(false)});
     for(const enabled of [false,true,false]){
      const frame=await page.evaluate(e=>{const a=window.__DREAM_QA__;a.setOctMode(e);return a.report().frames},enabled);
      await page.waitForFunction(n=>window.__DREAM_QA__.report().frames>=n+2,frame,{timeout:120000});
      await page.evaluate(()=>window.__DREAM_QA__.resetFrameTiming());
      await page.waitForFunction(()=>window.__DREAM_QA__.report().frameTiming.samples>=3,{},{timeout:120000});
      const report=await page.evaluate(()=>window.__DREAM_QA__.report());
      check(report.vegetation.pipeline.octEnabled===enabled&&!report.vegetation.pipeline.depthEnabled&&report.vegetation.visibleLevels[3]>0,'oct AB actual mode and far population');
      octAB.push({enabled,sha:report.buildSha,frame:report.frames,position:report.motion.position,far:report.vegetation.visibleLevels[3],frameTiming:report.frameTiming,passes:report.passes.window});
      if(octAB.length<=2)await capture(page,{path:out+'/desktop-oct-'+(enabled?'on':'off')+'.png'});
     }
     check(octAB.every(r=>r.position.every((x,i)=>Math.abs(x-octAB[0].position[i])<.01)),'oct AB fixed camera');
    }catch(e){failures.push('oct AB '+String(e))}
    finally{await page.evaluate(()=>{const a=window.__DREAM_QA__;a.setOctMode(true);a.setClean(false);document.body.classList.remove('qa-clean');a.setCamera('street')})}
   }
   try{interactions.push(await interactionQA(page,name,viewport,out,check))}catch(e){failures.push(name+' interaction: '+String(e))}
  }catch(e){failures.push(name+' initialization: '+String(e))}
  finally{if(errors.length)failures.push(name+' console errors: '+errors.join('; '));await page.close()}
 }
 check(captures.filter(c=>!c.file.endsWith('-error.png')).length===32,'expected 32 successful captures');check(captures.every(c=>Number.isInteger(c.frame)&&c.frame>0&&(!process.env.EXPECT_BUILD_SHA||c.sha===process.env.EXPECT_BUILD_SHA)),'capture exact frame and SHA');check(octAB.length===3,'expected oct A/B/A timings');check(closeViews.length===4,'expected four close views');check(depthAB.length===3,'expected A/B/A depth timings');check(lodSweep.length===4,'expected four exact-source LOD captures');check(reports.length===9,'expected 9 reports, got '+reports.length);check(interactions.length===2,'expected 2 interaction reports');check(interactions.every(x=>x.passed),'interaction reports must all pass');
}finally{writeFileSync(out+'/reports.json',JSON.stringify(reports,null,2));writeFileSync(out+'/budget-failures.json',JSON.stringify(failures,null,2));writeFileSync(out+'/interactions.json',JSON.stringify(interactions,null,2));writeFileSync(out+'/lod-sweep.json',JSON.stringify(lodSweep,null,2));writeFileSync(out+'/depth-ab.json',JSON.stringify(depthAB,null,2));writeFileSync(out+'/close-views.json',JSON.stringify(closeViews,null,2));writeFileSync(out+'/capture-frames.json',JSON.stringify(captures,null,2));writeFileSync(out+'/oct-ab.json',JSON.stringify(octAB,null,2));await browser.close()}
assert.deepEqual(failures,[],'QA failures: '+failures.join('; '));
