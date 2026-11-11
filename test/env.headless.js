const p=require('puppeteer-core');
const fs=require('fs');
const path=require('path');
const URL_=process.argv[2]||'file:///workspace/out/ez-sens/index.html';
const OUT=process.argv[3]||'/workspace/out/ez-sens-qa';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await b.newPage();
  await pg.setViewport({width:1440,height:1100});
  const errs=[],net=[];
  pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
  pg.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await pg.setRequestInterception(true);
  pg.on('request',r=>{ const u=r.url(); if(u.split('?')[0]===URL_.split('?')[0]||u.startsWith('blob:')||u.startsWith('data:')) r.continue(); else { net.push(u); r.abort(); }});
  await pg.goto(URL_,{waitUntil:'load'});
  await pg.evaluate(()=>localStorage.clear());
  await pg.reload({waitUntil:'load'});
  await pg.waitForFunction(()=>document.documentElement.dataset.ready==='1',{timeout:20000});
  await new Promise(r=>setTimeout(r,400));

  const fail=(m)=>{ console.error('FAIL',m); throw new Error(m); };
  const boot=await pg.evaluate(()=>({env:EZ.env(), info:EZ.envInfo(), tab:document.querySelector('#nav button.on').textContent, mode:EZ.mode(), on:[...document.querySelectorAll('[data-envseg] button.on')].map(b=>b.dataset.env)}));
  console.log('boot', boot);
  if(boot.env!=='night') fail('default env should be night, got '+boot.env);
  if(boot.info.sunDisc) fail('night should hide the sun disc');
  if(boot.info.fog!==0x070a0f) fail('night fog should match the original dark arena, got 0x'+boot.info.fog.toString(16));
  if(boot.info.floor!==0x0f141b) fail('night floor should match the original, got 0x'+boot.info.floor.toString(16));
  if(boot.info.tgt!==0x36f1a6) fail('night target should stay the original green');
  if(!boot.info.sky) fail('sky dome missing');
  if(boot.on.length!==2 || boot.on.some(x=>x!=='night')) fail('both time-of-day selectors should show Night on: '+JSON.stringify(boot.on));
  const rangeCount0=await pg.evaluate(()=>document.querySelectorAll('#t-range canvas, #stage canvas').length);

  const switched=await pg.evaluate(()=>{
    const snap=id=>{ EZ.setEnv(id); return Object.assign({id}, EZ.envInfo()); };
    const night=snap('night'), day=snap('day'), rise=snap('sunrise'), bad=snap('nope');
    const saved=JSON.parse(localStorage.getItem('ezsens.v1')).settings.env;
    return {night,day,rise,bad,saved,ui:[...document.querySelectorAll('[data-envseg] button.on')].map(b=>b.dataset.env)};
  });
  console.log('switched', {nightFog:switched.night.fog, dayFog:switched.day.fog, riseFog:switched.rise.fog, daySun:switched.day.sunDisc, riseSun:switched.rise.sunDisc, bad:switched.bad.mode, saved:switched.saved, ui:switched.ui});
  if(!(switched.day.fog!==switched.night.fog && switched.rise.fog!==switched.day.fog && switched.rise.fog!==switched.night.fog)) fail('each mode needs a distinct fog color');
  if(!(switched.day.floor!==switched.night.floor && switched.rise.floor!==switched.day.floor)) fail('each mode needs a distinct floor tint');
  if(!(switched.day.hemi!==switched.night.hemi && switched.rise.hemi!==switched.night.hemi)) fail('light intensity should change by mode');
  if(!switched.day.sunDisc || !switched.rise.sunDisc) fail('Sunrise and Day should show a sun disc');
  if(switched.night.sunDisc) fail('Night should not show a sun disc');
  if(switched.rise.sunScale<=switched.day.sunScale) fail('sunrise sun should read larger than the day sun');
  if(switched.day.tgt===switched.rise.tgt && switched.day.tgt===switched.night.tgt) fail('target color should adapt per mode for contrast');
  if(switched.bad.mode!=='night') fail('invalid env should fall back to night');
  // last setEnv was 'nope' -> night, then we need to check saved after a real set
  await pg.evaluate(()=>EZ.setEnv('sunrise'));
  const savedRise=await pg.evaluate(()=>JSON.parse(localStorage.getItem('ezsens.v1')).settings.env);
  if(savedRise!=='sunrise') fail('sunrise did not persist to localStorage: '+savedRise);

  // click the Day button (Finder selector)
  await pg.click('nav button[data-t=finder]');
  await pg.waitForSelector('#t-finder.on');
  await pg.click('#t-finder [data-env="day"]');
  const clicked=await pg.evaluate(()=>({env:EZ.env(), saved:JSON.parse(localStorage.getItem('ezsens.v1')).settings.env, on:[...document.querySelectorAll('[data-envseg] button.on')].map(b=>b.dataset.env), info:EZ.envInfo()}));
  console.log('clicked day', clicked);
  if(clicked.env!=='day'||clicked.saved!=='day') fail('clicking Day did not apply/persist');
  if(clicked.on.some(x=>x!=='day')||clicked.on.length!==2) fail('Train and Finder selectors should stay in sync');
  if(!clicked.info.sunDisc) fail('day sun missing after click');

  // Range look must stay put while the arena env changes
  await pg.click('nav button[data-t=range]');
  await new Promise(r=>setTimeout(r,200));
  const rangeStill=await pg.evaluate(()=>({mode:EZ.mode(), overlay:/CLICK TO BEGIN/i.test(document.querySelector('#ov').innerText), env:EZ.env()}));
  if(rangeStill.mode!=='range') fail('range mode broken after env switch');
  if(!rangeStill.overlay) fail('range overlay missing after env switch');

  // persistence across a real reload
  await pg.reload({waitUntil:'load'});
  await pg.waitForFunction(()=>document.documentElement.dataset.ready==='1',{timeout:20000});
  await new Promise(r=>setTimeout(r,300));
  const afterReload=await pg.evaluate(()=>({env:EZ.env(), info:EZ.envInfo(), saved:JSON.parse(localStorage.getItem('ezsens.v1')).settings.env, on:[...document.querySelectorAll('[data-envseg] button.on')].map(b=>b.dataset.env)}));
  console.log('after reload', afterReload);
  if(afterReload.env!=='day'||afterReload.saved!=='day'||!afterReload.info.sunDisc) fail('day mode did not survive reload');
  if(afterReload.on.some(x=>x!=='day')) fail('selector did not restore after reload');

  // screenshots of Finder in all three modes (arena visible, overlay hidden, target in view)
  await pg.click('nav button[data-t=finder]');
  await new Promise(r=>setTimeout(r,200));
  const pose={sunrise:{yaw:8,pitch:8},day:{yaw:6,pitch:12},night:{yaw:0,pitch:4}};
  const shot=async(mode)=>{
    await pg.evaluate(({mode,pose})=>{
      EZ.setEnv(mode);
      EZ.setMode('arena','finder');
      document.querySelector('#ov').classList.add('hide');
      EZ.view.yaw=pose[mode].yaw; EZ.view.pitch=pose[mode].pitch;
      EZ.placeTarget(0,2,1.6);
    },{mode,pose});
    await pg.evaluate(()=>document.querySelector('#stage').scrollIntoView({block:'center'}));
    await new Promise(r=>setTimeout(r,250));
    await pg.evaluate(()=>new Promise(r=>{ requestAnimationFrame(()=>requestAnimationFrame(r)); }));
    const dest=path.join(OUT,'finder-'+mode+'.png');
    const el=await pg.$('#stage');
    await el.screenshot({path:dest});
    console.log('shot', dest);
  };
  await shot('sunrise'); await shot('day'); await shot('night');

  if(net.length) fail('unexpected network: '+net.join(', '));
  if(errs.length) fail('console errors: '+errs.join(' | '));
  console.log('env tests ok');
  await b.close();
})().catch(e=>{ console.error(e); process.exit(1); });
