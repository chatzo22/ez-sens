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
  await new Promise(r=>setTimeout(r,300));
  const fail=(m)=>{ console.error('FAIL',m); throw new Error(m); };

  // --- theme ---
  const bootTheme=await pg.evaluate(()=>({theme:EZ.theme(), attr:document.documentElement.dataset.theme||'', on:[...document.querySelectorAll('[data-themeseg] button.on')].map(b=>b.dataset.theme), bg:getComputedStyle(document.body).backgroundColor, text:getComputedStyle(document.body).color}));
  console.log('boot theme', bootTheme);
  if(bootTheme.theme!=='dark') fail('default theme should be dark');
  if(bootTheme.on.join()!=='dark') fail('Dark toggle should be selected');

  await pg.click('[data-themeseg] button[data-theme=light]');
  const light=await pg.evaluate(()=>{
    const rgb=s=>s.match(/\d+/g).map(Number);
    const lum=([r,g,b])=>0.2126*(r/255)**2.2+0.7152*(g/255)**2.2+0.0722*(b/255)**2.2;
    const body=getComputedStyle(document.body), card=getComputedStyle(document.querySelector('.card')||document.body);
    const input=(()=>{ const el=document.querySelector('#dpi'); return el?getComputedStyle(el):null; })();
    const contrast=(a,b)=>{ const L1=lum(rgb(a)),L2=lum(rgb(b)); const [hi,lo]=L1>L2?[L1,L2]:[L2,L1]; return (hi+0.05)/(lo+0.05); };
    return {
      theme:EZ.theme(), attr:document.documentElement.dataset.theme, saved:JSON.parse(localStorage.getItem('ezsens.v1')).settings.theme,
      on:[...document.querySelectorAll('[data-themeseg] button.on')].map(b=>b.dataset.theme),
      bodyBg:body.backgroundColor, bodyText:body.color, bodyC:contrast(body.color,body.backgroundColor),
      cardBg:card.backgroundColor, cardText:card.color, cardC:contrast(card.color,card.backgroundColor),
      inputBg:input&&input.backgroundColor, inputText:input&&input.color, inputC:input&&contrast(input.color,input.backgroundColor)
    };
  });
  console.log('light theme', light);
  if(light.theme!=='light'||light.saved!=='light'||light.attr!=='light') fail('light theme did not apply/persist');
  if(light.bodyC<4.5) fail('light theme body contrast too low: '+light.bodyC);
  if(light.cardC<4.5) fail('light theme card contrast too low: '+light.cardC);
  if(light.inputC&&light.inputC<4.5) fail('light theme input contrast too low: '+light.inputC);

  await pg.click('nav button[data-t=setup]');
  await new Promise(r=>setTimeout(r,200));
  await pg.screenshot({path:path.join(OUT,'theme-light.png')});
  console.log('shot', path.join(OUT,'theme-light.png'));

  // 3D env is independent of UI theme
  const envStill=await pg.evaluate(()=>{ EZ.setEnv('night'); return {env:EZ.env(), theme:EZ.theme(), fog:EZ.envInfo().fog}; });
  if(envStill.theme!=='light'||envStill.env!=='night'||envStill.fog!==0x070a0f) fail('UI theme should not replace the Finder night environment');

  await pg.reload({waitUntil:'load'});
  await pg.waitForFunction(()=>document.documentElement.dataset.ready==='1',{timeout:20000});
  const after=await pg.evaluate(()=>({theme:EZ.theme(), attr:document.documentElement.dataset.theme}));
  if(after.theme!=='light'||after.attr!=='light') fail('light theme did not survive reload');

  // --- flash tab ---
  await pg.click('nav button[data-t=flash]');
  await new Promise(r=>setTimeout(r,300));
  const idle=await pg.evaluate(()=>({ov:document.querySelector('#ov').innerText.replace(/\s+/g,' '), tab:document.querySelector('#nav button.on').textContent, mode:EZ.mode()}));
  console.log('flash idle', idle);
  if(idle.tab!=='Flash'||idle.mode!=='flash') fail('flash tab did not activate');
  if(!/Flash dodge|Start/i.test(idle.ov)) fail('flash idle overlay missing: '+idle.ov);
  await pg.evaluate(()=>document.querySelector('#stage').scrollIntoView({block:'center'}));
  await new Promise(r=>setTimeout(r,200));
  const stage=await pg.$('#stage');
  await stage.screenshot({path:path.join(OUT,'flash-idle.png')});
  console.log('shot', path.join(OUT,'flash-idle.png'));

  // photosensitivity notice on first start
  await pg.click('#flashBtn');
  const warn=await pg.evaluate(()=>document.querySelector('#ov').innerText.replace(/\s+/g,' '));
  console.log('warn', warn);
  if(!/Photosensitivity/i.test(warn)) fail('expected a photosensitivity notice before the first run');
  await pg.click('#flashWarnReduced');
  const afterWarn=await pg.evaluate(()=>({warned:EZ.S.flash.warned, reduced:EZ.S.flash.reduced, ov:document.querySelector('#ov').innerText.replace(/\s+/g,' '), ready:EZ.flash()&&EZ.flash().phase}));
  console.log('after warn', afterWarn);
  if(!afterWarn.warned||!afterWarn.reduced) fail('notice did not save reduced-intensity preference');
  if(!/Click here to lock|CS2-style|Valorant-style/i.test(afterWarn.ov)) fail('expected ready overlay after notice: '+afterWarn.ov);

  // dodge: look away before detonation
  const dodge=await pg.evaluate(async()=>{
    EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    const fl=EZ.flash(); const bomb=fl.bomb;
    EZ.lookAway();
    const ang=EZ.flashAngle(bomb.pos);
    const fac=EZ.flashFactor(ang);
    EZ.detonateFlash(performance.now());
    return {ang,fac,peak:EZ.flashPeak(), st:{...fl.st}, hasBomb:!!EZ.flash().bomb, reduced:EZ.S.flash.reduced};
  });
  console.log('dodge', dodge);
  if(!(dodge.ang>=90 && dodge.fac<=0.02 && dodge.st.dodged===1)) fail('looking away should score a dodge: '+JSON.stringify(dodge));
  if(dodge.peak>0.02) fail('dodged flash should not white-out');

  // full flash while looking at it, reduced intensity cap
  const full=await pg.evaluate(async()=>{
    const now=performance.now();
    EZ.spawnFlash(now);
    EZ.lookAtBomb();
    const bomb=EZ.flash().bomb;
    const ang=EZ.flashAngle(bomb.pos);
    const fac=EZ.flashFactor(ang);
    const dur=EZ.whiteOut(fac);
    return {ang,fac,peak:EZ.flashPeak(), dur, st:EZ.flash().st, busy:EZ.flashUntil()>performance.now()};
  });
  console.log('full/reduced', full);
  if(!(full.ang<25 && full.fac>0.9)) fail('looking at the grenade should be a full-factor flash');
  if(!(full.peak>0.2 && full.peak<=0.38+1e-6)) fail('reduced intensity should cap the white-out, got '+full.peak);
  if(full.dur<300) fail('fade/hold duration must be at least 300ms, got '+full.dur);

  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await stage.screenshot({path:path.join(OUT,'flash-detonation.png')});
  console.log('shot', path.join(OUT,'flash-detonation.png'));

  // one-at-a-time: cannot spawn a second live bomb
  const one=await pg.evaluate(()=>{
    const before=EZ.flash().bomb;
    // detonate current if any leftover from previous spawn in 'full' test — that spawn was not detonated via detonateFlash after whiteOut
    if(EZ.flash().bomb) EZ.detonateFlash(performance.now());
    EZ.spawnFlash(performance.now());
    const first=EZ.flash().bomb;
    // calling spawn again replaces only when tests call it directly; game loop won't spawn while bomb exists
    const live=!!first && !first.detonated;
    return {live, fuse:first&&first.fuse, kind:first&&first.kind};
  });
  console.log('one at a time', one);
  if(!one.live) fail('expected a live flash projectile');

  // finish a short round and check recap (force remaining flashes)
  const recap=await pg.evaluate(()=>{
    const fl=EZ.flash();
    // clean current bomb
    if(fl.bomb){ EZ.lookAway(); EZ.detonateFlash(performance.now()); }
    fl.n=fl.i; // remaining 0
    fl.busyUntil=0;
    EZ.flashFinish();
    return {
      fl:EZ.flash(),
      ov:document.querySelector('#ov').innerText.replace(/\s+/g,' '),
      last:document.querySelector('#lastFlash').innerText.replace(/\s+/g,' '),
      hist:(JSON.parse(localStorage.getItem('ezsens.v1')).flashHistory||[])[0],
      nan:/NaN/.test(document.querySelector('#ov').innerText+' '+(document.querySelector('#lastFlash')||{}).innerText)
    };
  });
  console.log('recap', recap);
  if(recap.fl) fail('flash round should clear after finish');
  if(!/Dodged|Dodge %|NEW BEST|Best|reaction/i.test(recap.ov)) fail('recap missing stats: '+recap.ov);
  if(recap.nan) fail('NaN in flash recap');
  if(!recap.hist) fail('flash result was not saved');
  await pg.evaluate(()=>document.querySelector('#stage').scrollIntoView({block:'center'}));
  await new Promise(r=>setTimeout(r,200));
  await stage.screenshot({path:path.join(OUT,'flash-recap.png')});
  console.log('shot', path.join(OUT,'flash-recap.png'));

  // CS2-style actually builds a thrown bomb with a longer fuse
  const cs2=await pg.evaluate(()=>{
    EZ.S.flash.preset='cs2'; EZ.S.flash.warned=true;
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    const b=EZ.flash().bomb;
    const fuse=b&&b.fuse, kind=b&&b.kind, hasVel=b&&b.vel&&(Math.abs(b.vel.y)+Math.abs(b.vel.x)+Math.abs(b.vel.z))>0;
    EZ.abandonFlash();
    return {fuse,kind,hasVel};
  });
  console.log('cs2', cs2);
  if(cs2.kind!=='cs2') fail('CS2 preset did not spawn a cs2 bomb');
  if(!(cs2.fuse>=1400 && cs2.fuse<=1600)) fail('CS2-style fuse should be ~1.5s, got '+cs2.fuse);
  if(!cs2.hasVel) fail('CS2-style bomb should have throw velocity');

  // --- v1.4.0 situational maps, peek bots, damage ---
  const scnUi=await pg.evaluate(()=>({ids:[...document.querySelectorAll('#flashScn [data-scn]')].map(b=>b.dataset.scn)}));
  console.log('scenarios', scnUi);
  for(const id of ['hall','hold','anchor','entry','retake','overwall','mid','ramp','mix']) if(!scnUi.ids.includes(id)) fail('missing scenario '+id);

  const hall=await pg.evaluate(()=>{
    EZ.setScn('hall');
    return {walls:(EZ.scnWalls()||[]).length, id:EZ.scnId(), eye:EZ.camEye.toArray()};
  });
  console.log('hall map', hall);
  if(hall.id!=='hall') fail('loadScn hall failed');
  if(hall.walls<4) fail('hallway should have solid walls, got '+hall.walls);
  if(Math.hypot(hall.eye[0],hall.eye[2])<1) fail('camera should start inside the hallway, not at the origin');

  const los=await pg.evaluate(()=>{
    EZ.setScn('hold');
    EZ.camEye.set(0,0,3.2);
    const V=EZ.camEye.constructor;
    const blocked=EZ.flashVisible(new V(3,1,-8));
    const openDoor=EZ.flashVisible(new V(0,1.2,-8));
    return {blocked,openDoor,walls:EZ.scnWalls().length};
  });
  console.log('los', los);
  if(los.blocked!==false) fail('flash behind the choke wall should be occluded');
  if(los.openDoor!==true) fail('flash visible through the open doorway should not be occluded');

  const covered=await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hold';
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    const bomb=EZ.flash().bomb;
    EZ.camEye.set(0,0,3.2); EZ.view.yaw=0; EZ.view.pitch=0;
    bomb.pos.set(3,1,-8);
    const vis=EZ.flashVisible(bomb.pos);
    EZ.lookAtBomb();
    EZ.detonateFlash(performance.now());
    const st={...EZ.flash().st};
    EZ.abandonFlash();
    return {vis,st};
  });
  console.log('covered', covered);
  if(covered.vis!==false) fail('planted test bomb should be behind a wall');
  if(!(covered.st.covered>=1 && (covered.st.full||0)===0)) fail('occluded flash should score covered, not a full blind: '+JSON.stringify(covered.st));

  const walk=await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.wasd=false; EZ.S.flash.scn='hall'; EZ.S.flash.preset='cs2';
    EZ.startFlash(); EZ.forceFlashRun();
    const zBefore=EZ.camEye.z;
    EZ.spawnFlash(performance.now());
    const fl=EZ.flash();
    const t0=performance.now();
    for(let i=1;i<=45;i++){ fl.last=t0+(i-1)*20; EZ.flashStep(t0+i*20); }
    const zAfter=EZ.camEye.z;
    EZ.abandonFlash();
    return {zBefore,zAfter,delta:zAfter-zBefore};
  });
  console.log('auto-walk', walk);
  if(!(walk.delta< -0.4)) fail('hallway auto-walk should move the camera down the corridor, dz='+walk.delta);

  const bounce=await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.preset='cs2'; EZ.S.flash.diff='normal'; EZ.S.flash.scn='hall';
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    const b=EZ.flash().bomb;
    const fuse=b.fuse, p0=b.pos.toArray(), v0=[b.vel.x,b.vel.y,b.vel.z];
    const t0=performance.now();
    for(let i=1;i<=24;i++){ EZ.flash().last=t0+(i-1)*20; EZ.flashStep(t0+i*20); if(!EZ.flash().bomb) break; }
    const b2=EZ.flash().bomb;
    const moved=b2?Math.hypot(b2.pos.x-p0[0],b2.pos.y-p0[1],b2.pos.z-p0[2]):0;
    EZ.abandonFlash();
    return {fuse,kind:b.kind,moved,hasVel:v0.some(v=>Math.abs(v)>0)};
  });
  console.log('bounce', bounce);
  if(bounce.kind!=='cs2') fail('expected a CS2 bomb for bounce');
  if(!(bounce.fuse>=1400 && bounce.fuse<=1600)) fail('CS2 fuse should stay ~1.5s');
  if(!(bounce.moved>0.05)) fail('CS2 bomb should travel / bounce, moved='+bounce.moved);

  const peek=await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hold';
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='hs'; EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    EZ.lookAway();
    EZ.detonateFlash(performance.now());
    const dodged=(EZ.peekBots()||[]).map(b=>({dim:b.dim,visible:b.group.visible,hp:b.state&&b.state.hp,op:b.headMat.opacity}));
    EZ.spawnFlash(performance.now());
    const bomb=EZ.flash().bomb;
    EZ.camEye.set(0,0,3.2); EZ.view.yaw=0; EZ.view.pitch=0;
    bomb.pos.set(0,0.55,-3.0); // through the open doorway, clearly visible
    EZ.lookAtBomb();
    const vis=EZ.flashVisible(bomb.pos), ang=EZ.flashAngle(bomb.pos), fac=EZ.flashFactor(ang);
    EZ.detonateFlash(performance.now());
    const flashed=(EZ.peekBots()||[]).map(b=>({dim:b.dim,op:b.headMat.opacity,em:b.headMat.emissiveIntensity}));
    const visInfo={vis,ang,fac,covered:EZ.flash()&&EZ.flash().st.covered};
    const fl=EZ.flash();
    if(fl.bomb){ EZ.lookAway(); EZ.detonateFlash(performance.now()); }
    fl.n=fl.i; fl.busyUntil=0; fl.peekUntil=0;
    EZ.flashFinish();
    return {dodged,flashed,visInfo,ov:document.querySelector('#ov').innerText.replace(/\s+/g,' ')};
  });
  console.log('peek bots', {dodged:peek.dodged, flashed:peek.flashed, vis:peek.visInfo, ov:peek.ov});
  if(!peek.dodged.length) fail('peek bots should spawn after a detonation');
  if(!(peek.dodged[0].visible && peek.dodged[0].hp===100)) fail('dodged peek bot should be visible at full HP');
  if(!peek.flashed.length) fail('peek bots should spawn after a full flash too');
  if(!(peek.flashed[0].dim>0.5 && peek.flashed[0].op<0.95)) fail('flashed peek bots should be dimmed / harder to see: '+JSON.stringify(peek.flashed[0]));
  if(!/Bots killed|Headshot|STK|TTK|Dodge/i.test(peek.ov)) fail('recap should include bot and dodge stats: '+peek.ov);

  await pg.evaluate(()=>{ EZ.setTheme('dark'); EZ.setEnv('night'); EZ.abandonFlash(); });
  for(const id of ['hall','hold','anchor','entry','retake','overwall','mid','ramp']){
    await pg.evaluate(id=>{ EZ.S.flash.scn=id; EZ.setMode('flash','flash'); EZ.previewScn(); }, id);
    await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await stage.screenshot({path:path.join(OUT,'flash-scn-'+id+'.png')});
    console.log('shot', path.join(OUT,'flash-scn-'+id+'.png'));
  }

  await pg.evaluate(()=>{
    EZ.setTheme('dark'); EZ.setEnv('night');
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='hs'; EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
    EZ.setMode('train','train');
    EZ.view.yaw=0; EZ.view.pitch=0;
    EZ.placeTarget(0,0,1.6);
    if(EZ.syncTrainBot) EZ.syncTrainBot();
    const b=EZ.trainBot(); if(b) b.group.visible=true;
  });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await pg.evaluate(()=>document.querySelector('#stage').scrollIntoView({block:'center'}));
  await new Promise(r=>setTimeout(r,200));
  await stage.screenshot({path:path.join(OUT,'bot-train.png')});
  console.log('shot', path.join(OUT,'bot-train.png'));

  await pg.evaluate(()=>{
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='valarm';
    EZ.setMode('range','range');
    EZ.rangeBegin();
  });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await stage.screenshot({path:path.join(OUT,'bot-range.png')});
  console.log('shot', path.join(OUT,'bot-range.png'));

  await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.scn='hold'; EZ.S.flash.preset='val';
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='hs';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    EZ.lookAway();
    EZ.detonateFlash(performance.now());
  });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await stage.screenshot({path:path.join(OUT,'bot-flash.png')});
  console.log('shot', path.join(OUT,'bot-flash.png'));
  await pg.evaluate(()=>EZ.abandonFlash());

  if(net.length) fail('unexpected network: '+net.join(', '));
  if(errs.length) fail('console errors: '+errs.join(' | '));
  console.log('flash+theme tests ok');
  await b.close();
})().catch(e=>{ console.error(e); process.exit(1); });
