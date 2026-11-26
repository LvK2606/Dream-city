import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {trafficTransition,interactionResult} from './interaction-checks.mjs';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const out=process.env.QA_DIR||'qa',reports=[],failures=[],interactions=[];mkdirSync(out,{recursive:true});
const cases=[['aerial','day'],['street','day'],['river','sunset'],['aerial','night']];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};
function validate(s,name,cam,light,high){
 const k=name+'/'+cam+'/'+light+(high?'/high':''),v=s.vegetation,p=s.passes.window;
 const ck=(ok,msg)=>check(ok,k+' '+msg);
 ck(s.version==='0.4.10','version');if(process.env.EXPECT_BUILD_SHA)ck(s.buildSha===process.env.EXPECT_BUILD_SHA,'SHA');
 ck(s.architecture.variants>=16&&s.architecture.volumes>s.buildings&&s.architecture.buildings===s.buildings,'architecture massing');
 ck(s.streets.markings>100&&s.streets.furniture===6&&s.streets.signals>20&&s.streets.lanes>30&&s.cars===100,'street detail and traffic');
 ck(s.landscape.parks===4&&s.landscape.paths===12&&s.landscape.rocks>=40&&s.landscape.triangles<=2240&&s.landscape.drawUpperBound===1,'landscape kit');
 ck(s.rendering.profile===light&&s.rendering.nightSky===(light==='night')&&s.rendering.roofEmission.every(v=>v===0)&&s.rendering.dpr>0&&s.rendering.dpr<=(high?1.6:name==='mobile'?.75:1.15),'lighting and resolution profile');
 ck(s.staticBatch.strategy==='coarse-lightweight-static-detail-v1'&&s.staticBatch.batches===s.chunks&&s.staticBatch.triangles>1000,'static batching inventory');
 ck(s.ready&&s.buildings>150&&s.trees>500,'population');ck(s.facadeQuads===s.facadeWindows&&s.facadeWindows>3000&&s.facadeStyles>=12&&s.chunks>20,'facades');
 ck(v.total===s.trees&&v.near+v.mid+v.far===s.trees&&v.levels.length===4&&v.levels.reduce((a,b)=>a+b,0)===s.trees,'LOD accounting');
 ck(v.rendered+v.culled===s.trees&&v.visibleLevels.reduce((a,b)=>a+b,0)===v.rendered&&v.mainPassDrawUpperBound<=24&&v.triangles<s.trees*100&&v.regions>8&&v.neutralTint&&!v.legacyCanopy,'vegetation budget');
 ck(v.pipeline.ready&&v.pipeline.loaded&&v.pipeline.species.length===3&&v.pipeline.species.every(p=>p.views===3&&p.coverage.length===3&&p.coverage.every(c=>c>.025&&c<.94)&&p.sourceTriangles>p.nearTriangles&&p.nearTriangles<=1600&&p.farTriangles===6),'real EZ-Tree prototypes and baked views');
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
  await page.screenshot({path:out+'/'+name+'-interaction-resize.png'});
  if(name==='mobile'){await toggle.click();verify(!(await page.locator('#panel').isVisible()),'landscape panel closes again');}
  return interactionResult(name,checks,evidence);
 }catch(e){
  const error=String(e);verify(false,'interaction exception: '+error);
  try{await page.screenshot({path:out+'/'+name+'-interaction-error.png'})}catch{}
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
     reports.push({name,cam,light,...shot});await page.screenshot({path:out+'/'+file+'.png'});await page.evaluate(()=>{window.__DREAM_QA__.setClean(true);document.body.classList.add('qa-clean')});try{await page.screenshot({path:out+'/'+file+'-clean.png'})}finally{await page.evaluate(()=>{document.body.classList.remove('qa-clean');window.__DREAM_QA__.setClean(false)})}validate(shot,name,cam,light,high);
     console.log(file,JSON.stringify(shot));
    }catch(e){failures.push(file+': '+String(e));try{await page.screenshot({path:out+'/'+file+'-error.png'})}catch{}}
   }
   try{interactions.push(await interactionQA(page,name,viewport,out,check))}catch(e){failures.push(name+' interaction: '+String(e))}
  }catch(e){failures.push(name+' initialization: '+String(e))}
  finally{if(errors.length)failures.push(name+' console errors: '+errors.join('; '));await page.close()}
 }
 check(reports.length===9,'expected 9 reports, got '+reports.length);check(interactions.length===2,'expected 2 interaction reports');check(interactions.every(x=>x.passed),'interaction reports must all pass');
}finally{writeFileSync(out+'/reports.json',JSON.stringify(reports,null,2));writeFileSync(out+'/budget-failures.json',JSON.stringify(failures,null,2));writeFileSync(out+'/interactions.json',JSON.stringify(interactions,null,2));await browser.close()}
assert.deepEqual(failures,[],'QA failures: '+failures.join('; '));
