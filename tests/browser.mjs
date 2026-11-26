import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const out=process.env.QA_DIR||'qa',reports=[],failures=[],interactions=[];mkdirSync(out,{recursive:true});
const cases=[['aerial','day'],['street','day'],['river','sunset'],['aerial','night']];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};
function validate(s,name,cam,light,high){
 const k=name+'/'+cam+'/'+light+(high?'/high':''),v=s.vegetation,p=s.passes.window;
 const ck=(ok,msg)=>check(ok,k+' '+msg);
 ck(s.version==='0.4.9','version');if(process.env.EXPECT_BUILD_SHA)ck(s.buildSha===process.env.EXPECT_BUILD_SHA,'SHA');
 ck(s.architecture.variants>=16&&s.architecture.volumes>s.buildings&&s.architecture.buildings===s.buildings,'architecture massing');
 ck(s.streets.markings>100&&s.streets.furniture===6&&s.streets.signals>20&&s.streets.lanes>30&&s.cars===100,'street detail and traffic');
 ck(s.landscape.parks===4&&s.landscape.paths===12&&s.landscape.rocks>=40&&s.landscape.triangles<=2240&&s.landscape.drawUpperBound===1,'landscape kit');
 ck(s.rendering.profile===light&&s.rendering.nightSky===(light==='night')&&s.rendering.roofEmission.every(v=>v===0)&&s.rendering.dpr>0&&s.rendering.dpr<=(high?1.6:name==='mobile'?.75:1.15),'lighting and resolution profile');
 ck(s.staticBatch.strategy==='coarse-lightweight-static-detail-v1'&&s.staticBatch.batches===s.chunks&&s.staticBatch.triangles>1000,'static batching inventory');
 ck(s.ready&&s.buildings>150&&s.trees>500,'population');ck(s.facadeQuads===s.facadeWindows&&s.facadeWindows>3000&&s.facadeStyles>=12&&s.chunks>20,'facades');
 ck(v.total===s.trees&&v.near+v.mid+v.far===s.trees&&v.levels.length===4&&v.levels.reduce((a,b)=>a+b,0)===s.trees,'LOD accounting');
 ck(v.rendered+v.culled===s.trees&&v.visibleLevels.reduce((a,b)=>a+b,0)===v.rendered&&v.mainPassDrawUpperBound<=24&&v.triangles<s.trees*100&&v.regions>8&&v.neutralTint&&!v.legacyCanopy,'vegetation budget');
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
 const read=()=>page.evaluate(()=>window.__DREAM_QA__.report()),waitFrame=async(n)=>page.waitForFunction(n=>window.__DREAM_QA__.report().frames>n,n,{timeout:120000});
 const toggle=page.locator('#panel-toggle');
 if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 check(await page.locator('#panel').isVisible(),name+' panel opens');
 await page.locator('#hide').click();check(!(await page.locator('#panel').isVisible()),name+' clean mode hides panel');
 await page.keyboard.press('Escape');check(await page.locator('#panel').isVisible(),name+' Escape restores HUD');
 await page.locator('#pause').click();const paused=await read();await waitFrame(paused.frames);const still=await read();
 check(still.motion.paused&&paused.motion.trafficSample===still.motion.trafficSample,name+' pause holds traffic');
 await page.locator('#pause').click();await waitFrame(still.frames);const moving=await read();check(!moving.motion.paused&&moving.motion.trafficSample!==still.motion.trafficSample,name+' traffic resumes');
 await page.locator('[data-camera="street"]').click();const street=await read();
 await page.locator('[data-camera="aerial"]').click();
 await page.waitForFunction(()=>{const r=window.__DREAM_QA__.report();return !r.motion.tween&&Math.abs(r.motion.position[0]-185)<1&&Math.abs(r.motion.position[1]-145)<1},{},{timeout:120000});
 const aerial=await read();check(Math.abs(street.motion.position[0]-aerial.motion.position[0])>20,name+' camera transition');
 await page.locator('[data-light="night"]').click();await waitFrame(aerial.frames);const night=await read();check(night.light==='night'&&night.rendering.nightSky,name+' lighting switch');
 await page.setViewportSize({width:viewport.height,height:viewport.width});await page.waitForFunction(([w,h])=>{const r=window.__DREAM_QA__.report();return r.motion.viewport[0]===w&&r.motion.viewport[1]===h},[viewport.height,viewport.width],{timeout:120000});
 const resized=await read();await waitFrame(resized.frames);await page.screenshot({path:out+'/'+name+'-interaction-resize.png'});
 return {name,passed:true,street:street.motion,aerial:aerial.motion,night:night.rendering,resized:resized.motion};
}
try{
 for(const [name,viewport] of [['desktop',{width:1280,height:800}],['mobile',{width:390,height:844}]]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  try{
   await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>{const s=window.__DREAM_QA__?.report();return s?.frames>3&&s.photoAssets.ready&&s.modelAssets.ready&&s.vegetation.assets.ready},{},{timeout:120000});
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
 check(reports.length===9,'expected 9 reports, got '+reports.length);check(interactions.length===2,'expected 2 interaction reports');
}finally{writeFileSync(out+'/reports.json',JSON.stringify(reports,null,2));writeFileSync(out+'/budget-failures.json',JSON.stringify(failures,null,2));writeFileSync(out+'/interactions.json',JSON.stringify(interactions,null,2));await browser.close()}
assert.deepEqual(failures,[],'QA failures: '+failures.join('; '));
