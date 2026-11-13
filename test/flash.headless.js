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
  await pg.evaluate(()=>{ if(EZ&&EZ.S){ EZ.S.autoQual=false; EZ.S.lowq=false; } });
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
  const warn=await pg.evaluate(()=>{
    const modal=document.querySelector('#flashWarnModal');
    const cs=modal?getComputedStyle(modal):{};
    const red=document.querySelector('#flashWarnReduced');
    const r=red?red.getBoundingClientRect():{top:0,bottom:0};
    return {text:(modal||document.querySelector('#ov')).innerText.replace(/\s+/g,' '), hide:modal&&modal.classList.contains('hide'), pos:cs.position, btnTop:r.top, btnBottom:r.bottom, vh:window.innerHeight};
  });
  console.log('warn', warn);
  if(!/Photosensitivity/i.test(warn.text||'')) fail('expected a photosensitivity notice before the first run');
  if(warn.hide) fail('photosensitivity modal should be visible');
  if(warn.pos!=='fixed') fail('photosensitivity modal should be position:fixed');
  if(!(warn.btnTop>=0 && warn.btnBottom<=warn.vh+1)) fail('photosensitivity buttons should stay in the viewport at this size: '+JSON.stringify(warn));
  await pg.click('#flashWarnReduced');
  const afterWarn=await pg.evaluate(()=>({warned:EZ.S.flash.warned, reduced:EZ.S.flash.reduced, ov:document.querySelector('#ov').innerText.replace(/\s+/g,' '), ready:EZ.flash()&&EZ.flash().phase, modalHide:document.querySelector('#flashWarnModal').classList.contains('hide')}));
  console.log('after warn', afterWarn);
  if(!afterWarn.warned||!afterWarn.reduced) fail('notice did not save reduced-intensity preference');
  if(afterWarn.modalHide===false) fail('photosensitivity modal should close after accept');
  if(!/Click here to lock|CS2-style|Valorant-style/i.test(afterWarn.ov)) fail('expected ready overlay after notice: '+afterWarn.ov);

  // dodge: look away before detonation (authored variant, not random pop)
  const dodge=await pg.evaluate(async()=>{
    EZ.S.flash.rand=false; EZ.S.flash.scn='hall';
    EZ.setScn('hall');
    const fl0=EZ.flash(); if(fl0){ fl0.rand=false; fl0.i=0; if(fl0.vi!=null) fl0.vi=0; }
    EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    const fl=EZ.flash(); const bomb=fl.bomb;
    // Keep the authored pop in the open door gap (visible from spawn) so this
    // assertion is about looking away, not about a later Long-side pop being covered.
    if(bomb&&bomb.pos){ bomb.pos.set(0.85,1.45,-2.6); }
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
    EZ.S.flash.preset='cs2'; EZ.S.flash.warned=true; EZ.S.flash.rand=false;
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
    EZ.S.flash.warned=true; EZ.S.flash.preset='cs2'; EZ.S.flash.diff='normal'; EZ.S.flash.scn='hall'; EZ.S.flash.rand=false;
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
    const flashed=(EZ.peekBots()||[]).map(b=>({dim:b.dim,op:b.headMat.opacity,em:b.headMat.emissiveIntensity,transparent:!!b.headMat.transparent,depthWrite:b.headMat.depthWrite!==false,info:EZ.botMatInfo?EZ.botMatInfo(b):null}));
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
  if(!(peek.flashed[0].dim>0.5)) fail('flashed peek bots should still record a flash dim factor: '+JSON.stringify(peek.flashed[0]));
  if(!(peek.flashed[0].op===1 && peek.flashed[0].transparent===false && peek.flashed[0].depthWrite!==false)) fail('flashed bots must stay fully opaque: '+JSON.stringify(peek.flashed[0]));
  if(!/Bots killed|Headshot|STK|TTK|Dodge/i.test(peek.ov)) fail('recap should include bot and dodge stats: '+peek.ov);


  // --- v1.5.0: wall occlusion, peek visibility, count, modal, toast, mix title ---
  const ui15=await pg.evaluate(()=>{
    const opts=[...document.querySelectorAll('#flashCount option')].map(o=>+o.value);
    const modal=document.getElementById('flashWarnModal');
    const cs=modal?getComputedStyle(modal):{};
    return {opts, pos:cs.position, z:cs.zIndex};
  });
  console.log('flash ui 1.5', ui15);
  if(!(ui15.opts.includes(1)&&ui15.opts.includes(4))) fail('flash count should offer 1–4, got '+JSON.stringify(ui15.opts));
  if(ui15.pos!=='fixed') fail('photosensitivity modal should be position:fixed, got '+ui15.pos);

  const countOk=await pg.evaluate(()=>{
    EZ.S.flash.count=1; document.querySelector('#flashCount').value='1';
    document.querySelector('#flashCount').dispatchEvent(new Event('change',{bubbles:true}));
    return EZ.S.flash.count;
  });
  if(countOk!==1) fail('flash count should allow 1, got '+countOk);

  const vis=await pg.evaluate(()=>{
    const out=[];
    for(const id of EZ.SCN_IDS){
      EZ.setScn(id);
      const rows=EZ.peekVisibilityReport()||[];
      out.push(...rows);
    }
    return out;
  });
  const clip=vis.filter(r=>r.stuck||!r.clear);
  const noEnd=vis.filter(r=>!r.endVis||(r.frac!=null&&r.frac<0.5));
  const hidden=vis.filter(r=>r.startOcc&&r.endVis&&!r.stuck&&r.clear);
  const by={};
  hidden.forEach(r=>{ by[r.scn]=(by[r.scn]||0)+1; });
  console.log('peek visibility', vis.length, 'hidden', hidden.length, 'clip', clip.length, 'noEnd', noEnd.length, 'by', by, 'bad', noEnd.slice(0,6).concat(clip.slice(0,4)));
  if(!vis.length) fail('peek visibility report was empty');
  if(clip.length) fail('peek paths must stay off solids, failed: '+JSON.stringify(clip.slice(0,8)));
  if(noEnd.length) fail('every peek must end with a visible head, failed: '+JSON.stringify(noEnd.slice(0,8)));
  if(hidden.length<20) fail('expected many starts to be occluded behind a corner, got '+hidden.length);
  const ids=['hall','hold','anchor','entry','retake','overwall','mid','ramp'];
  const miss=ids.filter(id=>(by[id]||0)<1);
  if(miss.length>1) fail('most maps should have a hidden-to-visible corner peek, missing: '+miss.join(','));

  const wallbang=await pg.evaluate(()=>{
    const V=EZ.camEye.constructor;
    EZ.setEnv('day');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hold';
    EZ.S.flash.wasd=false; EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.camEye.set(0,0,3.2); EZ.view.yaw=0; EZ.view.pitch=0;
    const fl=EZ.flash(); fl.busyUntil=1e15;
    EZ.spawnFlash(performance.now());
    EZ.lookAway();
    EZ.detonateFlash(performance.now());
    fl.peekUntil=performance.now()+8000;
    const bots=EZ.peekBots()||[];
    if(!bots.length) return {error:'no bots'};
    const bot=bots[0];
    bots.forEach(b=>{ if(b!==bot){ b.dead=true; b.group.visible=false; } });
    const fy=EZ.FLOOR_Y+0.05;
    bot.dead=false; bot.group.visible=true; bot.state.hp=100; bot.state.armor=bot.state.armor||0;
    // plant the bot fully behind the choke wall
    bot.group.position.set(3.1, fy, -8);
    bot.group.updateMatrixWorld(true);
    const head=bot.head.getWorldPosition(new V());
    const eye=EZ.camEye.clone();
    const p=head.clone().sub(eye);
    const len=p.length();
    EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
    EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
    const dir=p.normalize();
    const block=EZ.firstSolidHit(eye,dir,len-0.01);
    const shots0=fl.st.dotShots||0, hits0=fl.st.dotHits||0, hp0=bot.state.hp;
    EZ.flashShoot();
    const toast=(document.querySelector('#flashToast')||{}).textContent||'';
    const st={shots:(fl.st.dotShots||0)-shots0, hits:(fl.st.dotHits||0)-hits0, hp:bot.state.hp, hp0, toast, dead:bot.dead, los:EZ.flashVisible(head), block:block&&{t:block.t,role:block.wall.role}};
    // control: move the same bot into the open doorway and shoot again
    bot.dead=false; bot.group.visible=true; bot.state.hp=100;
    bot.group.position.set(0, fy, -2.62);
    bot.group.updateMatrixWorld(true);
    const head2=bot.head.getWorldPosition(new V());
    const p2=head2.clone().sub(EZ.camEye); const len2=p2.length();
    EZ.view.yaw=Math.atan2(-p2.x,-p2.z)*180/Math.PI;
    EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p2.y/len2)))*180/Math.PI;
    const hits1=fl.st.dotHits||0;
    EZ.flashShoot();
    st.openHits=(fl.st.dotHits||0)-hits1;
    st.openHp=bot.state.hp;
    EZ.abandonFlash();
    return st;
  });
  console.log('wallbang', wallbang);
  if(wallbang.error) fail(wallbang.error);
  if(wallbang.shots<1) fail('wall-bang test did not fire');
  if(wallbang.hits!==0 || wallbang.hp!==wallbang.hp0) fail('shot through a wall must not register: '+JSON.stringify(wallbang));
  if(!(wallbang.openHits>=1 && wallbang.openHp<wallbang.hp0)) fail('a visible-head shot should still register: '+JSON.stringify(wallbang));

  const toast=await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hold';
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    const bomb=EZ.flash().bomb;
    EZ.camEye.set(0,0,3.2);
    bomb.pos.set(3,1,-8);
    EZ.detonateFlash(performance.now());
    const el=document.querySelector('#flashToast');
    const t={text:el?el.textContent:'', cls:el?el.className:'', st:{...EZ.flash().st}};
    EZ.abandonFlash();
    return t;
  });
  console.log('toast', toast);
  if(!/Covered/i.test(toast.text||'')) fail('covered flash should toast Covered: '+JSON.stringify(toast));
  if(!(toast.cls||'').includes('show')) fail('flash toast should be visible after a pop');

  const mixTitle=await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.scn='mix'; EZ.S.flash.preset='val';
    EZ.startFlash(); EZ.forceFlashRun();
    const fl=EZ.flash(); fl.n=0; fl.i=0; fl.st.by={hall:{n:1,dodged:1,covered:0},entry:{n:1,dodged:0,covered:1}};
    fl.mix=true; fl.scn='mix';
    EZ.flashFinish();
    return (document.querySelector('#ov')||{}).innerText||'';
  });
  console.log('mix title', mixTitle.replace(/\s+/g,' ').trim().slice(0,180));
  if(!/Mix/i.test(mixTitle)) fail('mixed-run recap title should say Mix: '+mixTitle);

  const pops=await pg.evaluate(()=>{
    EZ.setScn('overwall');
    EZ.S.flash.warned=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='overwall';
    EZ.startFlash(); EZ.forceFlashRun();
    const fl=EZ.flash(); fl.busyUntil=1e15;
    const inside=[];
    for(let i=0;i<24;i++){
      EZ.spawnFlash(performance.now());
      const p=fl.bomb.pos;
      const walls=EZ.scnWalls().filter(w=>w.role!=='decal'&&w.role!=='floor');
      const hit=walls.some(w=>{
        const cx=Math.max(w.min.x,Math.min(p.x,w.max.x)), cy=Math.max(w.min.y,Math.min(p.y,w.max.y)), cz=Math.max(w.min.z,Math.min(p.z,w.max.z));
        const dx=p.x-cx,dy=p.y-cy,dz=p.z-cz; return dx*dx+dy*dy+dz*dz<0.18*0.18;
      });
      if(hit) inside.push(p.toArray());
      fl.bomb=null;
    }
    EZ.abandonFlash();
    return {inside:inside.length, sample:inside[0]};
  });
  console.log('pop jitter', pops);
  if(pops.inside) fail('flash pops must not land inside solid walls: '+JSON.stringify(pops));


  // --- v1.6.0 random throws, push paths, crouch hitboxes ---
  const randUi=await pg.evaluate(()=>{
    const el=document.querySelector('#flashRand');
    // earlier scripted tests turn Random off; restore the default-on behavior here
    EZ.S.flash.rand=true; if(el) el.checked=true;
    return {exists:!!el};
  });
  console.log('random toggle', randUi);
  if(!randUi.exists) fail('Random throws toggle missing');
  if(!/random/i.test(afterWarn.ov||'')) fail('first-run overlay should mention random throws (default on): '+afterWarn.ov);

  const det=await pg.evaluate(()=>{
    const run=(seed)=>{
      EZ.S.flash.warned=true; EZ.S.flash.rand=true; EZ.S.flash.preset='cs2'; EZ.S.flash.diff='normal'; EZ.S.flash.scn='hall'; EZ.S.flash.wasd=false;
      EZ.startFlash(); EZ.forceFlashRun();
      EZ.flashSeed(seed);
      const fl=EZ.flash(); fl.rand=true; fl.busyUntil=1e15;
      const rows=[];
      for(let i=0;i<6;i++){
        EZ.spawnFlash(performance.now());
        const b=fl.bomb;
        const row={v:b&&b.variant,fuse:b&&+b.fuse.toFixed(3),early:!!(b&&b.early),min:b&&+b.minFuse.toFixed(3),
          pos:b?b.pos.toArray().map(n=>+n.toFixed(4)):[], vel:b?[b.vel.x,b.vel.y,b.vel.z].map(n=>+n.toFixed(4)):[]};
        EZ.lookAway(); EZ.detonateFlash(performance.now());
        row.bots=(EZ.peekBots()||[]).map(bot=>({
          style:bot.move&&bot.move.style,
          speed:bot.move&&+bot.move.speed.toFixed(3),
          from:bot.move&&[ +bot.move.from.x.toFixed(3), +bot.move.from.z.toFixed(3) ],
          to:bot.move&&[ +bot.move.to.x.toFixed(3), +bot.move.to.z.toFixed(3) ],
          crouchWant:bot.crouchWant||0
        }));
        rows.push(row);
        fl.bomb=null; fl.peekUntil=0;
      }
      EZ.abandonFlash();
      return rows;
    };
    const a=run(42), b=run(42), c=run(43);
    return {same:JSON.stringify(a)===JSON.stringify(b), diff:JSON.stringify(a)!==JSON.stringify(c), a:a[0], c:c[0], n:a.length};
  });
  console.log('rng', {same:det.same, diff:det.diff, n:det.n, a:det.a, c:det.c});
  if(!det.same) fail('same flash seed should replay the same throws and pushes');
  if(!det.diff) fail('a different seed should change the random sequence');

  const fair=await pg.evaluate(()=>{
    const out={n:0,inside:0,short:0,samples:[]};
    for(const preset of ['val','cs2']){
      for(const diff of ['easy','normal','hard']){
        for(const scn of EZ.SCN_IDS){
          EZ.S.flash.warned=true; EZ.S.flash.rand=true; EZ.S.flash.preset=preset; EZ.S.flash.diff=diff; EZ.S.flash.scn=scn; EZ.S.flash.wasd=false;
          EZ.startFlash(); EZ.forceFlashRun();
          EZ.flashSeed(2000+scn.length*17+diff.length*3+(preset==='cs2'?1:0));
          const fl=EZ.flash(); fl.rand=true; fl.busyUntil=1e15;
          const min=EZ.fuseMinMs(diff,preset);
          for(let i=0;i<5;i++){
            EZ.spawnFlash(performance.now());
            const b=fl.bomb; if(!b) continue;
            out.n++;
            const p=b.pos;
            const walls=(EZ.scnWalls()||[]).filter(w=>w.role!=='decal'&&w.role!=='floor');
            const hit=walls.some(w=>{
              const cx=Math.max(w.min.x,Math.min(p.x,w.max.x)), cy=Math.max(w.min.y,Math.min(p.y,w.max.y)), cz=Math.max(w.min.z,Math.min(p.z,w.max.z));
              const dx=p.x-cx,dy=p.y-cy,dz=p.z-cz; return dx*dx+dy*dy+dz*dz<0.18*0.18;
            });
            if(hit){ out.inside++; if(out.samples.length<6) out.samples.push({preset,diff,scn,pos:p.toArray()}); }
            if(!(b.fuse>=min-1e-4) || !(b.minFuse>=min-1e-4)) { out.short++; if(out.samples.length<8) out.samples.push({preset,diff,scn,fuse:b.fuse,min,minFuse:b.minFuse}); }
            fl.bomb=null;
          }
          EZ.abandonFlash();
        }
      }
    }
    return out;
  });
  console.log('fairness', fair);
  if(fair.n<100) fail('expected many random flashes, got '+fair.n);
  if(fair.inside) fail('random pops must not land in solids: '+JSON.stringify(fair));
  if(fair.short) fail('random fuse must be >= difficulty minimum: '+JSON.stringify(fair));

  // random sides: coverage, no 3-in-a-row, no solids
  const sides=await pg.evaluate(()=>{
    const ids=(EZ.SCN_IDS||[]).filter(id=>id!=='mix');
    const out={by:{}, badSolid:[], triples:[], short:[]};
    for(const scn of ids){
      EZ.S.flash.warned=true; EZ.S.flash.rand=true; EZ.S.flash.preset='val'; EZ.S.flash.diff='normal'; EZ.S.flash.scn=scn; EZ.S.flash.wasd=false;
      EZ.startFlash(); EZ.forceFlashRun();
      EZ.setScn(scn);
      EZ.flashSeed(9100+scn.length*31);
      const fl=EZ.flash(); fl.rand=true; fl.busyUntil=1e15;
      const meta=EZ.scnMeta();
      const z=EZ.popZonesOf(meta)||[];
      const allowed=new Set(z.map(x=>x.side));
      const seq=[];
      const inside=[];
      for(let i=0;i<40;i++){
        EZ.spawnFlash(performance.now());
        const b=fl.bomb;
        const side=b&&(b.side||EZ.classifyPopSide(b.pos, meta&&meta.start));
        seq.push(side);
        const p=b.pos;
        if(EZ.pointInWall(p,0.18)) inside.push({scn,side,pos:p.toArray().map(n=>+n.toFixed(3))});
        fl.bomb=null;
      }
      const uniq=[...new Set(seq)];
      let trip=0;
      for(let i=2;i<seq.length;i++) if(seq[i]&&seq[i]===seq[i-1]&&seq[i]===seq[i-2]) trip++;
      out.by[scn]={uniq, n:seq.length, zones:allowed.size, trip, inside:inside.length, sample:seq.slice(0,12)};
      if(inside.length) out.badSolid.push({scn, n:inside.length, sample:inside[0]});
      if(trip) out.triples.push({scn, trip, seq});
      if(uniq.length<Math.min(3, allowed.size||3)) out.short.push({scn, uniq, zones:[...allowed]});
      EZ.abandonFlash();
    }
    return out;
  });
  console.log('flash sides', JSON.stringify(sides.by));
  if(sides.badSolid.length) fail('random side pops must not land in solids: '+JSON.stringify(sides.badSolid));
  if(sides.triples.length) fail('the same flash side must not repeat more than twice in a row: '+JSON.stringify(sides.triples.map(t=>({scn:t.scn,trip:t.trip,seq:t.seq.slice(0,24)}))));
  if(sides.short.length) fail('seeded runs should cover at least three sides per scenario where geometry allows: '+JSON.stringify(sides.short));

  // peek-type mix, speed scale, slide paths, start still <=150 ms
  const styles=await pg.evaluate(()=>{
    const out={groups:[], types:{}, only:{}, slides:[], speeds:{}, starts:[], badStart:[], badSlide:[]};
    const run=(opts)=>{
      EZ.S.flash.warned=true; EZ.S.flash.rand=true; EZ.S.flash.preset='val'; EZ.S.flash.diff=opts.diff||'normal';
      EZ.S.flash.scn=opts.scn||'hall'; EZ.S.flash.peek=opts.peek||'mix'; EZ.S.flash.botSpeed=opts.speed==null?1:opts.speed;
      EZ.S.bot.stance=opts.stance||'mix'; EZ.S.bot.shape='bot';
      EZ.startFlash(); EZ.forceFlashRun(); EZ.setScn(opts.scn||'hall');
      const fl=EZ.flash(); fl.rand=true; fl.busyUntil=1e15; fl.path=null; fl.pathT=null;
      if(opts.seed!=null) EZ.flashSeed(opts.seed);
      EZ.spawnFlash(performance.now());
      EZ.lookAway();
      const t0=performance.now();
      EZ.detonateFlash(t0);
      const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
      const rows=bots.map(b=>{
        const mv=b.move||{};
        const typ=EZ.peekTypeOf?EZ.peekTypeOf(b):(b.peekType||mv.style);
        const delay=Math.max(0,(mv.goAt||t0)-t0);
        return {typ, style:mv.style, delay, speed:mv.speed, from:mv.from, to:mv.to, slideStand:!!mv.slideStand, crouch:b.crouch||0};
      });
      EZ.abandonFlash();
      return {n:rows.length, rows, t0};
    };
    // mixed groups of 3 (force 3 peeks by authored+rand off list length? use slides/hall with seed and count)
    for(let i=0;i<24;i++){
      // temporarily force n by spawning on hall with rand and retry until 3
      let g=null;
      for(let t=0;t<6 && !(g&&g.n>=2);t++){
        g=run({peek:'mix', seed:4400+i*17+t, scn:['hall','hold','entry','retake'][i%4]});
      }
      if(g&&g.n){
        out.groups.push(g.rows.map(r=>r.typ));
        g.rows.forEach(r=>out.types[r.typ]=(out.types[r.typ]||0)+1);
      }
    }
    for(const only of ['peek','swing','slide']){
      const g=run({peek:only, seed:8801, scn:'hall'});
      out.only[only]={n:g.n, types:[...new Set(g.rows.map(r=>r.typ))], rows:g.rows.map(r=>r.typ)};
    }
    // slide paths on maps
    const maps=(EZ.SCN_IDS||[]).filter(id=>id!=='mix');
    for(const scn of maps){
      const g=run({peek:'slide', seed:12000+scn.length, scn, stance:'crouch'});
      const rows=[];
      // re-run in-page to inspect path with live helpers — already abandoned. Use a dedicated pass:
    }
    // dedicated live pass for slides + start delays + speeds
    return out;
  });
  // more thorough evaluate for slides/speed/start
  const motion=await pg.evaluate(()=>{
    const maps=(EZ.SCN_IDS||[]).filter(id=>id!=='mix');
    const out={slides:[], badSlide:[], starts:[], badStart:[], speeds:{}, holdOk:true};
    for(const scn of maps){
      EZ.S.flash.warned=true; EZ.S.flash.rand=false; EZ.S.flash.preset='val'; EZ.S.flash.diff='normal';
      EZ.S.flash.scn=scn; EZ.S.flash.peek='slide'; EZ.S.flash.botSpeed=1;
      EZ.S.bot.stance='crouch'; EZ.S.bot.shape='bot';
      EZ.startFlash(); EZ.forceFlashRun(); EZ.setScn(scn);
      const fl=EZ.flash(); fl.rand=false; fl.busyUntil=1e15; fl.path=null;
      EZ.spawnFlash(performance.now()); EZ.lookAway();
      const t0=performance.now(); EZ.detonateFlash(t0);
      const eyes=EZ.scnMeta&&EZ.peekEyes?null:null;
      const meta=EZ.scnMeta();
      for(const b of (EZ.peekBots()||[])){
        if(!b||!b.move) continue;
        const typ=EZ.peekTypeOf(b);
        const delay=Math.max(0,(b.move.goAt||t0)-t0);
        out.starts.push({scn,delay,typ});
        if(delay>150.5) out.badStart.push({scn,delay,typ});
        if(typ!=='slide') continue;
        const f=b.move.from, to=b.move.to;
        const clear=EZ.pathClear(f.x,f.y,f.z,to.x,to.y,to.z,12);
        const mid={x:(f.x+to.x)/2,y:f.y,z:(f.z+to.z)/2};
        // step through and require crouched head visible at some mid/end
        let visMid=false, visEnd=false, solid=false;
        const steps=8;
        for(let i=1;i<=steps;i++){
          const t=i/steps, x=f.x+(to.x-f.x)*t, y=f.y, z=f.z+(to.z-f.z)*t;
          if(!EZ.bodyClearFeet(x,y,z)) solid=true;
        }
        out.slides.push({scn,clear,solid,dist:Math.hypot(to.x-f.x,to.z-f.z),delay});
        if(!clear||solid) out.badSlide.push({scn,clear,solid});
      }
      EZ.abandonFlash();
    }
    // start delays also on mix + all maps
    for(const scn of maps){
      EZ.S.flash.peek='mix'; EZ.S.flash.rand=true; EZ.S.flash.scn=scn;
      EZ.startFlash(); EZ.forceFlashRun(); EZ.setScn(scn);
      const fl=EZ.flash(); fl.rand=true; fl.busyUntil=1e15; fl.path=null;
      EZ.flashSeed(3300+scn.length);
      EZ.spawnFlash(performance.now()); EZ.lookAway();
      const t0=performance.now(); EZ.detonateFlash(t0);
      for(const b of (EZ.peekBots()||[])){
        if(!b||!b.move) continue;
        const delay=Math.max(0,(b.move.goAt||t0)-t0);
        out.starts.push({scn,delay,typ:EZ.peekTypeOf(b)});
        if(delay>150.5) out.badStart.push({scn,delay,typ:EZ.peekTypeOf(b)});
      }
      EZ.abandonFlash();
    }
    // speed multiplier: same seed, 0.5 vs 1.5, compare u after 0.45s
    const stepSpeed=(spd)=>{
      EZ.S.flash.peek='swing'; EZ.S.flash.botSpeed=spd; EZ.S.flash.diff='normal'; EZ.S.flash.rand=false; EZ.S.flash.scn='hall';
      EZ.startFlash(); EZ.forceFlashRun(); EZ.setScn('hall');
      const fl=EZ.flash(); fl.rand=false; fl.busyUntil=1e15; fl.path=null; fl.peekUntil=1e15; fl.retreatAt=1e15;
      EZ.flashSeed(42);
      EZ.spawnFlash(performance.now()); EZ.lookAway();
      const t0=performance.now(); EZ.detonateFlash(t0);
      fl.peekUntil=t0+30000; fl.retreatAt=t0+30000; fl.path=null;
      (EZ.peekBots()||[]).forEach(b=>{ if(b.move){ b.move.goAt=t0; b.move.phase='wait'; b.move.u=0; b.move.t=0; }});
      // simulate 450 ms
      let now=t0;
      for(let i=0;i<27;i++){ now+=16.67; EZ.stepPeekBots(0.01667, now); }
      const us=(EZ.peekBots()||[]).filter(b=>b&&b.move).map(b=>({u:b.move.u,speed:b.move.speed,style:b.move.style,scale:EZ.peekSpeedScale()}));
      EZ.abandonFlash();
      return us;
    };
    const slow=stepSpeed(0.5), fast=stepSpeed(1.5);
    out.speeds={slow,fast, scale05:null, scale15:null};
    return out;
  });
  console.log('peek types', JSON.stringify(styles.types), 'groups', styles.groups.slice(0,8), 'only', JSON.stringify(styles.only));
  console.log('peek motion', {slides:motion.slides, badSlide:motion.badSlide, badStart:motion.badStart, speeds:motion.speeds, startMax:Math.max(0,...motion.starts.map(s=>s.delay))});
  const typeSet=new Set(Object.keys(styles.types||{}));
  if(!(typeSet.has('peek')&&typeSet.has('swing')&&typeSet.has('slide'))) fail('mix should produce peek, wide swing and slide: '+JSON.stringify(styles.types));
  const tri=styles.groups.filter(g=>g.length>=3);
  if(tri.length){
    const bad=tri.filter(g=>!(g.includes('peek')&&g.includes('swing')));
    if(bad.length>tri.length*0.35) fail('groups of 3 should usually include a peek and a wide swing: '+JSON.stringify({bad:bad.slice(0,5),n:tri.length}));
  }
  for(const only of ['peek','swing','slide']){
    const row=styles.only[only];
    if(!row||!row.n) fail('forced '+only+' spawned no bots');
    if(row.types.some(t=>t!==only)) fail('Peeks/swings/slides only leaked other types: '+JSON.stringify(row));
  }
  if(motion.badStart.length) fail('swing start must stay <=150 ms: '+JSON.stringify(motion.badStart));
  if(motion.badSlide.length) fail('slide paths must stay clear of solids: '+JSON.stringify(motion.badSlide));
  if(!motion.slides.length) fail('slides-only should produce at least one slide path');
  // some slides should have visible heads — checked via pathClear + bodyClear; deeper vis in a follow-up
  const visCheck=await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.rand=false; EZ.S.flash.peek='slide'; EZ.S.flash.scn='hall'; EZ.S.flash.diff='normal';
    EZ.S.bot.stance='crouch'; EZ.S.bot.shape='bot';
    EZ.startFlash(); EZ.forceFlashRun(); EZ.setScn('hall');
    const fl=EZ.flash(); fl.rand=false; fl.busyUntil=1e15; fl.path=null;
    EZ.spawnFlash(performance.now()); EZ.lookAway(); EZ.detonateFlash(performance.now());
    const meta=EZ.scnMeta();
    const start=(meta&&meta.start)||{x:0,y:0,z:4.5};
    const eye={x:start.x,y:(start.y||0)+0.0,z:start.z};
    // camEye is the eye
    const ok=[];
    for(const b of (EZ.peekBots()||[])){
      if(!b||!b.move||EZ.peekTypeOf(b)!=='slide') continue;
      const f=b.move.from, to=b.move.to;
      let seen=0, n=0;
      for(const t of [0.35,0.55,0.8,1]){
        const x=f.x+(to.x-f.x)*t, y=f.y, z=f.z+(to.z-f.z)*t;
        const hy=y+(EZ.CROUCH_HEAD_Y||0.85);
        const vis=EZ.headVisibleFrom(EZ.camEye, {x,y:hy,z}, EZ.BOT_HEAD_R||0.16);
        n++; if(vis&&(vis.visible||vis.frac>=0.4)) seen++;
      }
      ok.push({seen,n,dist:Math.hypot(to.x-f.x,to.z-f.z)});
    }
    EZ.abandonFlash();
    return ok;
  });
  console.log('slide vis', visCheck);
  if(!visCheck.length || visCheck.every(r=>r.seen===0)) fail('slide heads should be visible during the slide: '+JSON.stringify(visCheck));
  const slowU=Math.max(0,...(motion.speeds.slow||[]).map(r=>r.u||0));
  const fastU=Math.max(0,...(motion.speeds.fast||[]).map(r=>r.u||0));
  const slowSp=Math.max(0,...(motion.speeds.slow||[]).map(r=>r.speed||0));
  const fastSp=Math.max(0,...(motion.speeds.fast||[]).map(r=>r.speed||0));
  console.log('speed u', {slowU,fastU,slowSp,fastSp});
  if(!(fastSp>slowSp*1.4)) fail('1.5x bot speed should be substantially faster than 0.5x: '+JSON.stringify(motion.speeds));
  if(!(fastU>slowU+0.05 || fastSp>slowSp*1.4)) fail('speed slider should change peek travel: '+JSON.stringify({slowU,fastU,slowSp,fastSp}));

  const pushes=await pg.evaluate(()=>{
    const all=[];
    for(const id of EZ.SCN_IDS){
      EZ.setScn(id);
      all.push(...(EZ.pushPathReport()||[]));
    }
    const bad=all.filter(r=>!r.clear||r.stuck||!r.endVis);
    const dists=all.map(r=>r.dist||0).sort((a,b)=>a-b);
    const mean=dists.reduce((a,b)=>a+b,0)/(dists.length||1);
    const wide=all.filter(r=>r.dist>=2.2 && r.clear && r.endVis).length;
    const occ=all.filter(r=>r.startOcc).length;
    return {n:all.length, bad, dist0:all.filter(r=>!(r.dist>0.3)).length, sample:all[0], mean, max:dists[dists.length-1]||0, wide, occ, dists:dists.slice(-5)};
  });
  console.log('push paths', {n:pushes.n, bad:pushes.bad.length, dist0:pushes.dist0, mean:pushes.mean, max:pushes.max, wide:pushes.wide, occ:pushes.occ, sample:pushes.sample, badSample:pushes.bad.slice(0,5)});
  if(!pushes.n) fail('pushPathReport returned no paths');
  if(pushes.bad.length) fail('push paths must stay off solids and end with a visible head: '+JSON.stringify(pushes.bad.slice(0,8)));
  if((pushes.occ||0)<16) fail('expected many occluded starts, occ='+pushes.occ);
  if(pushes.dist0) fail('push paths should leave cover, dist0='+pushes.dist0);
  if(!(pushes.wide>=6)) fail('expected several wide swing paths (>=2.2m), wide='+pushes.wide+' max='+pushes.max);
  if(!(pushes.max>=2.6)) fail('longest swing should reach past 2.6m, max='+pushes.max);
  if(!(pushes.mean>=1.3)) fail('average push path should be longer, mean='+pushes.mean);

  const crouch=await pg.evaluate(()=>{
    const V=EZ.camEye.constructor;
    EZ.setScn('hold');
    EZ.S.flash.warned=true; EZ.S.flash.rand=false; EZ.S.flash.preset='val'; EZ.S.flash.scn='hold'; EZ.S.flash.reduced=true;
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='hs';
    EZ.startFlash(); EZ.forceFlashRun();
    const fl=EZ.flash(); fl.busyUntil=1e15; fl.peekUntil=performance.now()+30000;
    EZ.spawnFlash(performance.now());
    EZ.lookAway(); EZ.detonateFlash(performance.now());
    fl.peekUntil=performance.now()+30000;
    const bots=EZ.peekBots()||[];
    const bot=bots[0];
    if(!bot) return {error:'no bot'};
    bots.forEach(x=>{ if(x!==bot){ x.dead=true; x.group.visible=false; x.move=null; } });
    bot.move=null; bot.crouchWant=0; bot.dead=false; bot.group.visible=true;
    if(bot.state) bot.state.hp=100;
    const fy=EZ.FLOOR_Y+0.05;
    bot.group.position.set(0,fy,-2.62);
    EZ.applyCrouch(bot,0);
    const stand=bot.head.getWorldPosition(new V());
    EZ.applyCrouch(bot,1);
    const down=bot.head.getWorldPosition(new V());
    // aimed at crouched head — flashShoot should register a head hit
    EZ.camEye.set(0,0,3.2);
    let p=down.clone().sub(EZ.camEye), len=p.length();
    EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
    EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
    EZ.applyCams();
    const hp0=bot.state.hp;
    const shots0=fl.st.dotShots||0, hits0=fl.st.dotHits||0, hs0=fl.st.hs||0;
    EZ.flashShoot();
    const low={shots:(fl.st.dotShots||0)-shots0,hits:(fl.st.dotHits||0)-hits0,hs:(fl.st.hs||0)-hs0,hp:bot.state.hp,hp0,dead:bot.dead};
    // revive and aim at the standing head height (now empty air above the crouched head)
    bot.dead=false; bot.group.visible=true; if(bot.state){ bot.state.hp=100; }
    EZ.applyCrouch(bot,1);
    p=stand.clone().sub(EZ.camEye); len=p.length();
    EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
    EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
    EZ.applyCams();
    const hs1=fl.st.hs||0, hits1=fl.st.dotHits||0, hp1=bot.state.hp;
    EZ.flashShoot();
    const high={hits:(fl.st.dotHits||0)-hits1,hs:(fl.st.hs||0)-hs1,hp:bot.state.hp,hp1,dead:bot.dead};
    EZ.abandonFlash();
    return {standY:+stand.y.toFixed(3), crouchY:+down.y.toFixed(3), drop:+(stand.y-down.y).toFixed(3), low, high};
  });
  console.log('crouch', crouch);
  if(crouch.error) fail('crouch test: '+crouch.error);
  if(!(crouch.drop>=0.4)) fail('crouching should lower the head by ~0.6m, drop='+crouch.drop);
  if(crouch.standY<=crouch.crouchY) fail('crouched head should be below standing head');
  if(!(crouch.low && crouch.low.hs>=1 && crouch.low.hp<crouch.low.hp0)) fail('shot at crouched head must register: '+JSON.stringify(crouch.low));
  if(crouch.high && crouch.high.hs>=1) fail('shot at standing head height should not be a head hit on a crouched bot: '+JSON.stringify(crouch.high));


  // --- v1.6.1 stance mix: distribution, mixed groups, switch hitboxes, recap ---
  const stanceUi=await pg.evaluate(()=>{
    EZ.S.bot.stance='mix';
    const els=[...document.querySelectorAll('[data-bot=stance]')];
    els.forEach(el=>{ el.value='mix'; el.dispatchEvent(new Event('change',{bubbles:true})); });
    return {n:els.length, values:els.map(el=>el.value), saved:EZ.S.bot.stance, ids:EZ.STANCE_IDS, mode:EZ.botStanceMode(), labels:els.map(el=>[...el.options].map(o=>o.value+':'+o.textContent.trim()))};
  });
  console.log('stance ui', stanceUi);
  if(stanceUi.n<3) fail('Bot stance select should appear on Flash, Train and Range, got '+stanceUi.n);
  if(stanceUi.saved!=='mix' || stanceUi.mode!=='mix') fail('Bot stance should default to Mix: '+JSON.stringify(stanceUi));
  if(!stanceUi.labels.every(l=>l.join().includes('mix')&&l.join().includes('stand')&&l.join().includes('crouch')&&l.join().includes('switch'))) fail('stance options missing: '+JSON.stringify(stanceUi.labels));

  const dist=await pg.evaluate(()=>{
    const rng=EZ.makeRng(20261116);
    const counts={stand:0,crouch:0,switch:0};
    const n=2000;
    for(let i=0;i<n;i++) counts[EZ.pickStanceKind('mix', rng)]++;
    const groups=[]; let bad=0;
    const rng2=EZ.makeRng(42);
    for(let nB of [2,3]){
      for(let i=0;i<250;i++){
        const kinds=EZ.assignGroupStances(nB,'mix',rng2);
        const hasStand=kinds.some(k=>k==='stand');
        const hasLow=kinds.some(k=>k==='crouch'||k==='switch');
        if(!hasStand||!hasLow){ bad++; if(groups.length<6) groups.push({nB,kinds}); }
      }
    }
    const only={};
    for(const mode of ['stand','crouch','switch']){
      only[mode]=Array.from({length:40},()=>EZ.pickStanceKind(mode, EZ.makeRng(1))).every(k=>k===mode);
    }
    return {n, counts, frac:{stand:counts.stand/n, crouch:counts.crouch/n, switch:counts.switch/n}, bad, groups, only};
  });
  console.log('stance dist', dist);
  if(Math.abs(dist.frac.stand-0.40)>0.08) fail('stand share should be ~40%: '+JSON.stringify(dist.frac));
  if(Math.abs(dist.frac.crouch-0.30)>0.08) fail('crouch share should be ~30%: '+JSON.stringify(dist.frac));
  if(Math.abs(dist.frac.switch-0.30)>0.08) fail('switch share should be ~30%: '+JSON.stringify(dist.frac));
  if(dist.bad) fail('mixed groups of 2–3 must include a standing bot and a crouched or switching bot: '+JSON.stringify(dist.groups));
  if(!dist.only.stand||!dist.only.crouch||!dist.only.switch) fail('forced stance modes should stay pure: '+JSON.stringify(dist.only));

  const spawned=await pg.evaluate(()=>{
    EZ.S.bot.stance='mix'; EZ.S.bot.shape='bot';
    EZ.S.flash.warned=true; EZ.S.flash.rand=true; EZ.S.flash.preset='val'; EZ.S.flash.diff='normal'; EZ.S.flash.scn='hold'; EZ.S.flash.wasd=false; EZ.S.flash.peek='mix'; EZ.S.flash.botSpeed=1;
    const tally={stand:0,crouch:0,switch:0,groups:0,badGroups:0,samples:[]};
    for(let seed=100; seed<160; seed++){
      EZ.startFlash(); EZ.forceFlashRun();
      EZ.flashSeed(seed);
      const fl=EZ.flash(); fl.rand=true; fl.busyUntil=1e15;
      EZ.spawnFlash(performance.now()); EZ.lookAway(); EZ.detonateFlash(performance.now());
      const bots=(EZ.peekBots()||[]).filter(b=>b&&b.group.visible);
      const kinds=bots.map(b=>b.stanceKind);
      kinds.forEach(k=>{ if(tally[k]!=null) tally[k]++; });
      if(bots.length>=2){
        tally.groups++;
        const hasStand=kinds.some(k=>k==='stand');
        const hasLow=kinds.some(k=>k==='crouch'||k==='switch');
        if(!hasStand||!hasLow){ tally.badGroups++; if(tally.samples.length<5) tally.samples.push(kinds); }
      }
      EZ.abandonFlash();
    }
    const tot=tally.stand+tally.crouch+tally.switch;
    tally.tot=tot;
    tally.frac=tot?{stand:tally.stand/tot,crouch:tally.crouch/tot,switch:tally.switch/tot}:{};
    return tally;
  });
  console.log('spawned stances', spawned);
  if(spawned.tot<40) fail('expected a useful sample of spawned stances, got '+spawned.tot);
  if(Math.abs(spawned.frac.stand-0.40)>0.18) fail('spawned stand share off: '+JSON.stringify(spawned));
  if(spawned.frac.crouch<0.10 || spawned.frac.switch<0.08) fail('spawned mix should include crouch and switch: '+JSON.stringify(spawned));
  if(spawned.badGroups) fail('spawned mixed groups must include both stances: '+JSON.stringify(spawned));

  const sw=await pg.evaluate(()=>{
    const V=EZ.camEye.constructor;
    EZ.setEnv('day');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hold';
    EZ.S.flash.rand=false; EZ.S.flash.wasd=false;
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='hs'; EZ.S.bot.stance='switch';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.camEye.set(0,0,3.2); EZ.view.yaw=0; EZ.view.pitch=0;
    const fl=EZ.flash(); fl.busyUntil=1e15;
    EZ.spawnFlash(performance.now()); EZ.lookAway(); EZ.detonateFlash(performance.now());
    fl.peekUntil=performance.now()+20000;
    const bots=EZ.peekBots()||[];
    if(!bots.length) return {error:'no bots'};
    const bot=bots[0];
    bots.forEach(b=>{ if(b!==bot){ b.dead=true; b.group.visible=false; } });
    bot.move=null; bot.dead=false; bot.group.visible=true;
    const fy=EZ.FLOOR_Y+0.05;
    bot.group.position.set(0, fy, -2.62);
    const aimAt=asyncY=>{
      const head=bot.head.getWorldPosition(new V());
      // override aim y if provided
      const target=head.clone(); if(asyncY!=null) target.y=asyncY;
      const p=target.clone().sub(EZ.camEye); const len=p.length()||1;
      EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
      EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
      EZ.applyCams();
    };
    const shot=()=>{
      EZ.armBot(bot); bot.dead=false; bot.group.visible=true;
      const hp0=bot.state.hp, hs0=fl.st.hs||0, kills0=fl.st.botKills||0;
      const hy=bot.head.getWorldPosition(new V()).y;
      aimAt();
      EZ.flashShoot();
      return {hy:+hy.toFixed(3), hs:(fl.st.hs||0)-hs0, hp:bot.state.hp, hp0, killed:(fl.st.botKills||0)-kills0, crouch:+(bot.crouch||0).toFixed(3)};
    };
    EZ.applyCrouch(bot,0); bot.crouchWant=0;
    const standY=bot.head.getWorldPosition(new V()).y;
    const standHit=shot();
    EZ.armBot(bot);
    EZ.applyCrouch(bot,1); bot.crouchWant=1;
    const crouchY=bot.head.getWorldPosition(new V()).y;
    // standing-height shot on crouched bot should miss the head
    bot.dead=false; bot.group.visible=true;
    const hpH=bot.state.hp, hsH=fl.st.hs||0;
    aimAt(standY);
    EZ.flashShoot();
    const highOnCrouch={hs:(fl.st.hs||0)-hsH, hp:bot.state.hp, hp0:hpH};
    const crouchHit=shot();
    // stand back up: crouched-height shot should miss, standing should hit
    EZ.armBot(bot);
    EZ.applyCrouch(bot,0); bot.crouchWant=0;
    bot.dead=false; bot.group.visible=true;
    const hpL=bot.state.hp, hsL=fl.st.hs||0;
    aimAt(crouchY);
    EZ.flashShoot();
    const lowOnStand={hs:(fl.st.hs||0)-hsL, hp:bot.state.hp, hp0:hpL};
    const standAgain=shot();
    EZ.abandonFlash();
    return {standY:+standY.toFixed(3), crouchY:+crouchY.toFixed(3), drop:+(standY-crouchY).toFixed(3), standHit, highOnCrouch, crouchHit, lowOnStand, standAgain};
  });
  console.log('stance switch hitbox', sw);
  if(sw.error) fail('switch hitbox: '+sw.error);
  if(!(sw.drop>=0.4)) fail('switch should lower the head when crouched, drop='+sw.drop);
  if(!(sw.standHit && sw.standHit.hs>=1 && sw.standHit.hp<sw.standHit.hp0)) fail('standing headshot must register: '+JSON.stringify(sw.standHit));
  if(sw.highOnCrouch && sw.highOnCrouch.hs>=1) fail('standing-height shot must miss a crouched bot: '+JSON.stringify(sw.highOnCrouch));
  if(!(sw.crouchHit && sw.crouchHit.hs>=1 && sw.crouchHit.hp<sw.crouchHit.hp0)) fail('crouched headshot must register: '+JSON.stringify(sw.crouchHit));
  if(sw.lowOnStand && sw.lowOnStand.hs>=1) fail('crouched-height shot must miss a standing bot: '+JSON.stringify(sw.lowOnStand));
  if(!(sw.standAgain && sw.standAgain.hs>=1 && sw.standAgain.hp<sw.standAgain.hp0)) fail('standing headshot after standing back up must register: '+JSON.stringify(sw.standAgain));

  const recapStance=await pg.evaluate(()=>{
    EZ.S.flash.warned=true; EZ.S.flash.scn='hold'; EZ.S.flash.preset='val';
    EZ.startFlash(); EZ.forceFlashRun();
    const fl=EZ.flash(); fl.n=0; fl.i=0; fl.st.standKills=2; fl.st.crouchKills=1; fl.st.moveKills=1; fl.st.botKills=3; fl.st.dots=3;
    EZ.flashFinish();
    return (document.querySelector('#ov')||{}).innerText||'';
  });
  console.log('recap stance', recapStance.replace(/\s+/g,' ').trim().slice(0,240));
  if(!/Standing kills/i.test(recapStance) || !/Crouch kills/i.test(recapStance)) fail('recap should list standing vs crouch kills: '+recapStance);
  // restore mix for later QA stills
  await pg.evaluate(()=>{ EZ.S.bot.stance='mix'; });


  await pg.evaluate(()=>{ EZ.setTheme('dark'); EZ.setEnv('day'); EZ.abandonFlash(); });
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

  for(const [id,name] of [['hall','flash-bot-peek-hall'],['overwall','flash-bot-peek-overwall']]){
    await pg.evaluate(id=>{
      const V=EZ.camEye.constructor;
      EZ.setEnv('day'); EZ.setTheme('dark');
      EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn=id;
      EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm'; EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
      EZ.setMode('flash','flash');
      EZ.startFlash(); EZ.forceFlashRun();
      EZ.previewScn();
      EZ.spawnFlash(performance.now());
      EZ.lookAway();
      EZ.detonateFlash(performance.now());
      const fl=EZ.flash(); if(fl) fl.peekUntil=performance.now()+8000;
      const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead&&b.group.visible);
      if(bots[0]){
        const head=bots[0].head.getWorldPosition(new V());
        const p=head.clone().sub(EZ.camEye); const len=p.length()||1;
        EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
        EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
      }
      const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
    }, id);
    await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await stage.screenshot({path:path.join(OUT,name+'.png')});
    console.log('shot', path.join(OUT,name+'.png'));
    await pg.evaluate(()=>EZ.abandonFlash());
  }


  // push / crouch QA stills
  for(const [id,name] of [['hall','flash-push-hall'],['overwall','flash-push-overwall'],['hold','flash-push-hold']]){
    await pg.evaluate(id=>{
      const V=EZ.camEye.constructor;
      EZ.setEnv('day'); EZ.setTheme('dark');
      EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn=id;
      EZ.S.flash.rand=false; EZ.S.flash.wasd=false;
      EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm'; EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
      EZ.setMode('flash','flash');
      EZ.startFlash(); EZ.forceFlashRun();
      EZ.previewScn();
      EZ.spawnFlash(performance.now());
      EZ.lookAway();
      EZ.detonateFlash(performance.now());
      const fl=EZ.flash(); if(fl) fl.peekUntil=performance.now()+8000;
      const t0=performance.now();
      for(let i=1;i<=18;i++){ fl.last=t0+(i-1)*16; EZ.flashStep(t0+i*16); }
      const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead&&b.group.visible);
      if(bots[0]){
        const head=bots[0].head.getWorldPosition(new V());
        const p=head.clone().sub(EZ.camEye); const len=p.length()||1;
        EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
        EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
        EZ.applyCams();
      }
      const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
    }, id);
    await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await stage.screenshot({path:path.join(OUT,name+'.png')});
    console.log('shot', path.join(OUT,name+'.png'));
    await pg.evaluate(()=>EZ.abandonFlash());
  }

  await pg.evaluate(()=>{
    const V=EZ.camEye.constructor;
    EZ.setEnv('day'); EZ.setTheme('dark');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='overwall';
    EZ.S.flash.rand=false;
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm'; EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.previewScn();
    EZ.spawnFlash(performance.now());
    EZ.lookAway();
    EZ.detonateFlash(performance.now());
    const fl=EZ.flash(); if(fl) fl.peekUntil=performance.now()+8000;
    const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead&&b.group.visible);
    const bot=bots[0]||(EZ.peekBots()||[])[0];
    if(bot){
      bot.move=null; bot.crouchWant=1; EZ.applyCrouch(bot,1);
      const head=bot.head.getWorldPosition(new V());
      const p=head.clone().sub(EZ.camEye); const len=p.length()||1;
      EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
      EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
      EZ.applyCams();
    }
    const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
  });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await stage.screenshot({path:path.join(OUT,'flash-crouch.png')});
  console.log('shot', path.join(OUT,'flash-crouch.png'));
  await pg.evaluate(()=>EZ.abandonFlash());

  await pg.evaluate(()=>{
    const V=EZ.camEye.constructor;
    EZ.setEnv('day'); EZ.setTheme('dark');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='overwall';
    EZ.S.flash.rand=false; EZ.S.bot.stance='mix';
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm'; EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.previewScn();
    EZ.spawnFlash(performance.now());
    EZ.lookAway();
    EZ.detonateFlash(performance.now());
    const fl=EZ.flash(); if(fl) fl.peekUntil=performance.now()+8000;
    const fy=EZ.FLOOR_Y+0.05;
    const live=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
    // keep / make two bots in the open: standing left, crouched right
    while(live.length<2){ const b=EZ.makeBot(); live.push(b); EZ.peekBots().push(b); }
    const a=live[0], b=live[1];
    live.slice(2).forEach(x=>{ x.dead=true; x.group.visible=false; });
    [a,b].forEach((bot,i)=>{
      bot.dead=false; bot.group.visible=true; bot.move=null; bot.dim=0; EZ.paintBot(bot,0); EZ.armBot(bot);
      bot.group.position.set(i===0?-1.25:1.25, fy, -6.2);
      if(i===0){ bot.crouchWant=0; EZ.applyCrouch(bot,0); }
      else { bot.crouchWant=1; EZ.applyCrouch(bot,1); }
      bot.group.updateMatrixWorld(true);
    });
    const mid=new V((a.head.getWorldPosition(new V()).x+b.head.getWorldPosition(new V()).x)/2,
                    (a.head.getWorldPosition(new V()).y+b.head.getWorldPosition(new V()).y)/2,
                    (a.head.getWorldPosition(new V()).z+b.head.getWorldPosition(new V()).z)/2);
    const p=mid.clone().sub(EZ.camEye); const len=p.length()||1;
    EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
    EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
    EZ.applyCams();
    const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
    const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
  });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await stage.screenshot({path:path.join(OUT,'flash-stance-mix.png')});
  console.log('shot', path.join(OUT,'flash-stance-mix.png'));
  await pg.evaluate(()=>EZ.abandonFlash());


  await pg.evaluate(()=>EZ.abandonFlash());

  // moving kills during a swing must count
  const moveKill=await pg.evaluate(()=>{
    const V=EZ.camEye.constructor;
    EZ.setEnv('retro'); EZ.setTheme('dark');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
    EZ.S.flash.rand=false; EZ.S.bot.shape='bot'; EZ.S.bot.dmg='hs'; EZ.S.bot.stance='stand';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.setScn('hall');
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    const fl=EZ.flash(); fl.busyUntil=1e15; fl.st.moveKills=0; fl.st.botKills=0;
    EZ.spawnFlash(performance.now());
    // spawnFlash auto-walks back to Taxi; stay in the open door gap for LOS checks
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    { const bomb=(fl).bomb; if(bomb&&bomb.pos) bomb.pos.set(0.7,1.42,-9.4); }
    EZ.lookAway(); EZ.detonateFlash(performance.now());
    fl.peekUntil=performance.now()+20000; fl.retreatAt=performance.now()+20000;
    const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead&&b.move);
    if(!bots.length) return {error:'no bots'};
    const bot=bots[0];
    bots.forEach(b=>{ if(b!==bot){ b.dead=true; b.group.visible=false; } });
    bot.dead=false; bot.group.visible=true; bot.dim=0; EZ.paintBot(bot,0); EZ.armBot(bot,performance.now());
    const fy=EZ.FLOOR_Y+0.05;
    // Plant mid-swing in the open on Long, just ahead of the player (past the doors).
    const f={x:2.4,y:fy,z:-8.2}, t={x:0.2,y:fy,z:-7.2};
    bot.move=Object.assign(bot.move||{},{phase:'go',goAt:0,style:'swing',u:0.45,settled:false,from:f,to:t});
    bot.moving=true;
    bot.group.position.set(f.x+(t.x-f.x)*0.45, fy, f.z+(t.z-f.z)*0.45);
    bot.crouchWant=0; EZ.applyCrouch(bot,0);
    bot.group.updateMatrixWorld(true);
    const head=bot.head.getWorldPosition(new V());
    const p=head.clone().sub(EZ.camEye); const len=p.length()||1;
    EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
    EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
    EZ.applyCams();
    const moving=EZ.botIsMoving(bot);
    EZ.flashShoot();
    const st={...fl.st};
    EZ.abandonFlash();
    return {moving, moveKills:st.moveKills, botKills:st.botKills, hp:bot.state&&bot.state.hp, dead:bot.dead};
  });
  console.log('moving kills', moveKill);
  if(moveKill.error) fail('moving kill setup failed: '+moveKill.error);
  if(!moveKill.moving) fail('bot mid-swing should count as moving: '+JSON.stringify(moveKill));
  if(!(moveKill.moveKills>=1 && moveKill.botKills>=1)) fail('a kill during the swing should increment moving kills: '+JSON.stringify(moveKill));

  // retreat behind cover instead of vanishing
  const retreat=await pg.evaluate(()=>{
    EZ.setEnv('retro');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
    EZ.S.flash.rand=false; EZ.S.bot.shape='bot'; EZ.S.bot.dmg='hs';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.setScn('hall');
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    const fl=EZ.flash(); fl.busyUntil=1e15;
    EZ.spawnFlash(performance.now());
    // spawnFlash auto-walks back to Taxi; stay in the open door gap for LOS checks
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    { const bomb=(fl).bomb; if(bomb&&bomb.pos) bomb.pos.set(0.7,1.42,-9.4); }
    EZ.lookAway(); EZ.detonateFlash(performance.now());
    const bots0=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
    if(!bots0.length) return {error:'no bots'};
    bots0.forEach(b=>{ if(b.move){ b.move.phase='go'; b.move.goAt=0; b.move.u=0.8; b.move.style='swing'; } });
    const now=performance.now();
    fl.retreatAt=now-1; fl.peekUntil=now+800;
    for(let i=0;i<45;i++){ fl.last=now+i*16; EZ.flashStep(now+(i+1)*16); }
    const bots=EZ.peekBots()||[];
    const rows=bots.map(b=>{
      const f=b.move&&b.move.from, pos=b.group.position;
      const back=f?Math.hypot(pos.x-f.x,pos.z-f.z):99;
      return {phase:b.move&&b.move.phase, vis:b.group.visible, back, u:b.move&&b.move.u, dead:b.dead};
    });
    const stillOut=rows.filter(r=>r.vis && r.phase!=='retreat' && r.phase!=='gone' && r.back>0.6);
    EZ.abandonFlash();
    return {n:rows.length, rows, stillOut:stillOut.length};
  });
  console.log('retreat', retreat);
  if(retreat.error) fail('retreat setup failed: '+retreat.error);
  if(retreat.stillOut) fail('bots should retreat behind cover after the peek window: '+JSON.stringify(retreat));

  // swing starts within 150 ms of the pop in every scenario
  const startWin=await pg.evaluate(()=>{
    const ids=(EZ.SCN_IDS||['hall','hold','anchor','entry','retake','overwall','mid','ramp']).filter(id=>id!=='mix');
    const maxStart=EZ.PEEK_START_MAX||150;
    const rows=[];
    EZ.setEnv('retro'); EZ.setTheme('dark');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val';
    EZ.S.flash.rand=false; EZ.S.bot.stance='mix'; EZ.S.bot.shape='bot';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    for(const id of ids){
      EZ.S.flash.scn=id; EZ.setScn(id);
      const fl=EZ.flash(); fl.busyUntil=1e15; fl.n=8; fl.i=0;
      const st=(EZ.scnMeta()&&EZ.scnMeta().start)||{x:0,y:0,z:4.5,yaw:0,pitch:4};
      EZ.camEye.set(st.x,st.y,st.z); EZ.view.yaw=st.yaw||0; EZ.view.pitch=st.pitch||4; EZ.applyCams();
      EZ.spawnFlash(performance.now());
      EZ.lookAway();
      const t0=performance.now();
      EZ.detonateFlash(t0);
      const pop=fl.popAt!=null?fl.popAt:t0;
      const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
      const delays=bots.map(b=>(b.move&&b.move.goAt!=null)?(b.move.goAt-pop):9999);
      rows.push({id, n:bots.length, delays:delays.map(d=>+d.toFixed(1)), max:delays.length?Math.max(...delays):-1, min:delays.length?Math.min(...delays):-1, outcome:fl.peekOutcome});
    }
    const bad=rows.filter(r=>!r.n || r.max>maxStart+1e-6);
    return {maxStart, rows, bad};
  });
  console.log('swing start', startWin);
  if(startWin.bad && startWin.bad.length) fail('swing must start within '+startWin.maxStart+' ms of the pop: '+JSON.stringify(startWin.bad));

  // dodge-case peek window is at least the turn-back allowance on each difficulty
  const holdWin=await pg.evaluate(()=>{
    const diffs=['easy','normal','hard'];
    const rows=[];
    EZ.setEnv('retro'); EZ.setTheme('dark');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val';
    EZ.S.flash.rand=false; EZ.S.flash.scn='hall'; EZ.S.bot.shape='bot';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.setScn('hall');
    for(const diff of diffs){
      EZ.S.flash.diff=diff;
      const fl=EZ.flash(); fl.diff=diff; fl.busyUntil=1e15; fl.n=8; fl.i=0; if(fl.vi!=null) fl.vi=0;
      EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=4; EZ.applyCams();
      EZ.spawnFlash(performance.now());
      // spawnFlash auto-walks back to Taxi; stay in the open door gap for LOS checks
      EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=4; EZ.applyCams();
      { const bomb=(fl).bomb; if(bomb&&bomb.pos) bomb.pos.set(0.7,1.42,-9.4); }
      EZ.lookAway();
      const t0=performance.now();
      EZ.detonateFlash(t0);
      const allow=EZ.turnBackAllowanceMs(fl.popAng, diff);
      const hold=fl.peekHoldMs;
      const win=(fl.retreatAt||0)-(fl.popAt||t0);
      rows.push({diff, ang:+(+fl.popAng||0).toFixed(1), allow, hold, win, outcome:fl.peekOutcome, peekUntil:fl.peekUntil-fl.popAt});
    }
    const bad=rows.filter(r=>r.outcome!=='dodged' || r.hold<r.allow-1 || r.win<r.allow-1);
    return {rows, bad};
  });
  console.log('dodge hold', holdWin);
  if(holdWin.bad && holdWin.bad.length) fail('dodge peek window must be at least the turn-back allowance: '+JSON.stringify(holdWin.bad));

  // bots stay hittable for the whole dodge peek window
  const hittable=await pg.evaluate(()=>{
    EZ.setEnv('retro'); EZ.setTheme('dark');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val';
    EZ.S.flash.rand=false; EZ.S.flash.scn='hall'; EZ.S.flash.diff='normal';
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.setScn('hall');
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    const fl=EZ.flash(); fl.diff='normal'; fl.busyUntil=1e15; fl.n=8; fl.i=0;
    EZ.spawnFlash(performance.now());
    // spawnFlash auto-walks back to Taxi; stay in the open door gap for LOS checks
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    { const bomb=(fl).bomb; if(bomb&&bomb.pos) bomb.pos.set(0.7,1.42,-9.4); }
    EZ.lookAway();
    const t0=performance.now();
    EZ.detonateFlash(t0);
    const pop=fl.popAt||t0;
    const hold=fl.peekHoldMs;
    const retreatAt=fl.retreatAt;
    // swing out into the open
    EZ.stepPeekBots(1.05, pop+1050);
    const mid=(EZ.peekBots()||[]).filter(b=>b&&!b.dead&&b.move&&b.move.phase!=='gone');
    const midVis=mid.filter(b=>b.group.visible);
    const midHittable=midVis.filter(b=>{
      const head=b.head.getWorldPosition(new (EZ.camEye.constructor)());
      return !!EZ.losOpen(EZ.camEye, head);
    });
    // still in the open just before the hold ends
    const remain=Math.max(0.05, ((retreatAt-40)-(pop+1050))/1000);
    EZ.stepPeekBots(remain, retreatAt-40);
    const late=(EZ.peekBots()||[]).filter(b=>b&&!b.dead&&b.move&&b.move.phase!=='gone'&&b.group.visible);
    const lateHittable=late.filter(b=>{
      const head=b.head.getWorldPosition(new (EZ.camEye.constructor)());
      return !!EZ.losOpen(EZ.camEye, head);
    });
    const canShoot=fl.peekUntil>(retreatAt-40);
    return {outcome:fl.peekOutcome, hold, mid:mid.length, midVis:midVis.length, midHittable:midHittable.length, late:late.length, lateHittable:lateHittable.length, canShoot, peekUntil:fl.peekUntil-pop, retreatAt:retreatAt-pop};
  });
  console.log('hittable window', hittable);
  if(hittable.outcome!=='dodged') fail('hittable test expected a dodge: '+JSON.stringify(hittable));
  if(!(hittable.midHittable>=1)) fail('bots should be hittable mid-window after the swing: '+JSON.stringify(hittable));
  if(!(hittable.lateHittable>=1 && hittable.canShoot)) fail('bots should stay hittable until the end of the peek window: '+JSON.stringify(hittable));

  // turn-back time is recorded on the first hit after a dodge
  const tb=await pg.evaluate(()=>{
    EZ.S.hint=true;
    EZ.S.flash.rand=false; EZ.S.flash.scn='hall'; EZ.S.flash.diff='normal';
    EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun(); EZ.setScn('hall');
    const f=EZ.flash(); f.busyUntil=1e15; f.n=8; f.i=0;
    EZ.spawnFlash(performance.now());
    if(f.bomb&&f.bomb.pos) f.bomb.pos.set(0.85,1.45,-2.6);
    EZ.lookAway();
    const t0=performance.now();
    EZ.detonateFlash(t0);
    // Keep the shoot window open for this assertion (real time may have
    // already eaten the previous test's peekUntil).
    f.peekUntil=performance.now()+8000;
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    const pop=f.popAt||t0;
    EZ.stepPeekBots(1.05, pop+1050);
    const V=EZ.camEye.constructor;
    const bot=(EZ.peekBots()||[]).find(b=>{
      if(!b||b.dead||!b.group||!b.group.visible) return false;
      const head=b.head.getWorldPosition(new V());
      return !!EZ.losOpen(EZ.camEye, head);
    });
    if(!bot) return {error:'no bot', st:f.st, outcome:f.peekOutcome};
    const head=bot.head.getWorldPosition(new V());
    const p=head.clone().sub(EZ.camEye); const len=p.length()||1;
    EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
    EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
    EZ.applyCams();
    f.st.turnBack=f.st.turnBack||[];
    const before=f.st.turnBack.length;
    EZ.flashShoot();
    const after=f.st.turnBack;
    return {before, n:after.length, val:after[after.length-1], pop, outcome:f.peekOutcome};
  });
  console.log('turn-back', tb);
  if(!(tb&&tb.n>tb.before && tb.val>=0)) fail('first hit after a dodge should record turn-back time: '+JSON.stringify(tb));

  // retro-flash.png — hallway in Retro Horizon
  await pg.evaluate(()=>{
    EZ.setEnv('retro'); EZ.setTheme('dark');
    if(EZ.abandonFlash) EZ.abandonFlash();
    if(EZ.clearWhiteOut) EZ.clearWhiteOut();
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
    EZ.S.flash.rand=false; EZ.S.bot.stance='mix'; EZ.S.bot.shape='bot';
    EZ.setMode('flash','flash');
    EZ.setScn('hall'); EZ.previewScn();
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=4; EZ.applyCams();
    const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
    const fx=document.getElementById('flashFx'); if(fx){ fx.style.opacity='0'; }
    const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
    const hud=document.getElementById('ahud'); if(hud) hud.classList.remove('show');
  });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await stage.screenshot({path:path.join(OUT,'retro-flash.png')});
  console.log('shot', path.join(OUT,'retro-flash.png'));
  await pg.evaluate(()=>EZ.abandonFlash());

  // flash-swing.png — bots mid wide swing, mixed stances, retro
  await pg.evaluate(()=>{
    const V=EZ.camEye.constructor;
    EZ.setEnv('retro'); EZ.setTheme('dark');
    if(EZ.abandonFlash) EZ.abandonFlash();
    if(EZ.clearWhiteOut) EZ.clearWhiteOut();
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
    EZ.S.flash.rand=false; EZ.S.bot.stance='mix'; EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.setScn('hall');
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    const fl=EZ.flash(); fl.busyUntil=1e15;
    EZ.spawnFlash(performance.now());
    // spawnFlash auto-walks back to Taxi; stay in the open door gap for LOS checks
    EZ.camEye.set(0.7,0,-4.6); EZ.view.yaw=0; EZ.view.pitch=2; EZ.applyCams();
    { const bomb=(fl).bomb; if(bomb&&bomb.pos) bomb.pos.set(0.7,1.42,-9.4); }
    EZ.lookAway(); EZ.detonateFlash(performance.now());
    fl.peekUntil=performance.now()+20000;
    if(fl.retreatAt!=null) fl.retreatAt=performance.now()+30000;
    const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
    bots.forEach((bot,i)=>{
      bot.dead=false; bot.group.visible=true; bot.dim=0; EZ.paintBot(bot,0);
      if(bot.move){
        bot.move.phase='go'; bot.move.goAt=0; bot.move.style=i===2?'reswing':'swing';
        bot.move.u=0.82; bot.move.overshoot=1.2;
        const f=bot.move.from, t=bot.move.to;
        bot.group.position.set(f.x+(t.x-f.x)*0.82, f.y, f.z+(t.z-f.z)*0.82);
      }
      if(i===0){ bot.crouchWant=0; EZ.applyCrouch(bot,0); }
      else if(i===1){ bot.crouchWant=1; EZ.applyCrouch(bot,1); }
      else { bot.crouchWant=0.45; EZ.applyCrouch(bot,0.45); }
      bot.group.updateMatrixWorld(true);
    });
    const live=bots[0];
    if(live){
      const head=live.head.getWorldPosition(new V());
      const p=head.clone().sub(EZ.camEye); const len=p.length()||1;
      EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
      EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI;
      EZ.applyCams();
    }
    const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
    const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
  });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await stage.screenshot({path:path.join(OUT,'flash-swing.png')});
  console.log('shot', path.join(OUT,'flash-swing.png'));

  // flash-swing-v2.png — mid-swing at a lit peek corner
  await pg.evaluate(()=>{
    const V=EZ.camEye.constructor;
    if(EZ.abandonFlash) EZ.abandonFlash();
    if(EZ.clearWhiteOut) EZ.clearWhiteOut();
    EZ.setEnv('retro'); EZ.setTheme('dark');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
    EZ.S.flash.rand=false; EZ.S.bot.stance='mix'; EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.setScn('hall');
    const fl=EZ.flash(); fl.busyUntil=1e15;
    EZ.spawnFlash(performance.now());
    EZ.lookAway(); EZ.detonateFlash(performance.now());
    fl.peekUntil=performance.now()+20000;
    if(fl.retreatAt!=null) fl.retreatAt=performance.now()+30000;
    const fy=EZ.FLOOR_Y+0.05;
    const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
    bots.forEach((bot,i)=>{
      bot.dead=false; bot.group.visible=true; bot.dim=0; EZ.paintBot(bot,0);
      if(i===0){
        const from={x:1.65,y:fy,z:-6.5}, to={x:0.7,y:fy,z:-5.55};
        bot.move=Object.assign(bot.move||{},{phase:'hold',goAt:0,style:'swing',u:0.7,overshoot:1.18,from,to,settled:true});
        bot.group.position.set(1.12, fy, -5.72);
        bot.crouchWant=0; EZ.applyCrouch(bot,0);
      }else if(i===1){
        const from={x:-1.65,y:fy,z:-6.5}, to={x:-0.8,y:fy,z:-5.7};
        bot.move=Object.assign(bot.move||{},{phase:'hold',goAt:0,style:'jiggle',u:0.5,from,to,settled:true});
        bot.group.position.set(-1.18, fy, -5.88);
        bot.crouchWant=1; EZ.applyCrouch(bot,1);
      }else{
        bot.group.visible=false; bot.dead=true;
      }
      bot.moving=true; bot.group.updateMatrixWorld(true);
    });
    EZ.camEye.set(0.25,0,1.15);
    const live=bots[0];
    if(live){
      const head=live.head.getWorldPosition(new V());
      const p=head.clone().sub(EZ.camEye); const len=p.length()||1;
      EZ.view.yaw=Math.atan2(-p.x,-p.z)*180/Math.PI;
      EZ.view.pitch=Math.asin(Math.max(-1,Math.min(1,p.y/len)))*180/Math.PI * 0.45 + 2;
      EZ.applyCams();
    }
    const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
    const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
    const hud=document.getElementById('ahud'); if(hud) hud.classList.remove('show');
    const fx=document.getElementById('flashFx'); if(fx) fx.style.opacity='0';
  });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await stage.screenshot({path:path.join(OUT,'flash-swing-v2.png')});
  console.log('shot', path.join(OUT,'flash-swing-v2.png'));

  // flash-turnback.png — bots out after a dodge, off-screen hint visible
  const tbShot=await pg.evaluate(()=>{
    if(EZ.abandonFlash) EZ.abandonFlash();
    if(EZ.clearWhiteOut) EZ.clearWhiteOut();
    EZ.setEnv('retro'); EZ.setTheme('dark');
    EZ.S.hint=true;
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
    EZ.S.flash.rand=false; EZ.S.flash.diff='normal'; EZ.S.flash.wasd=false; EZ.S.flash.count=8;
    EZ.S.bot.stance='mix'; EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm';
    EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.setScn('hall');
    const fl=EZ.flash();
    fl.busyUntil=1e15; fl.path=null; fl.pathT=null;
    EZ.spawnFlash(performance.now());
    EZ.lookAway();
    EZ.detonateFlash(performance.now());
    fl.busyUntil=1e15; fl.path=null; fl.pathT=null;
    fl.peekUntil=performance.now()+30000;
    fl.retreatAt=performance.now()+30000;
    fl.peekOutcome='dodged';
    fl.phase='run';
    const fy=EZ.FLOOR_Y+0.05;
    const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
    const poses=[
      {x:0.50,z:-5.62,crouch:0,fromX:1.65},
      {x:-0.40,z:-5.72,crouch:1,fromX:-1.65},
      {x:1.18,z:-5.52,crouch:0,fromX:1.65}
    ];
    bots.forEach((bot,i)=>{
      const pose=poses[i]||poses[0];
      bot.dead=false; bot.group.visible=true; bot.dim=0; EZ.paintBot(bot,0);
      const from={x:pose.fromX,y:fy,z:-6.5}, to={x:pose.x,y:fy,z:pose.z};
      bot.move=Object.assign(bot.move||{},{phase:'hold',goAt:0,style:'swing',u:0.85,overshoot:1.1,settled:true,from,to});
      bot.group.position.set(pose.x, fy, pose.z);
      bot.crouchWant=pose.crouch; EZ.applyCrouch(bot,pose.crouch);
      bot.group.updateMatrixWorld(true);
    });
    EZ.camEye.set(0.15,0,2.4);
    EZ.view.pitch=2;
    const yaws=[];
    for(let y=36;y<=62;y+=2) yaws.push(y,-y);
    let pick=null;
    for(const yaw of yaws){
      EZ.view.yaw=yaw; EZ.applyCams();
      const hints=EZ.hintSample?EZ.hintSample():[];
      const glow=hints.filter(h=>h.alpha>0.15);
      const on=hints.filter(h=>h.inside && !h.behind);
      const strong=glow.length && Math.max(...glow.map(h=>h.alpha))>=0.45;
      if(strong && on.length>=2){
        pick={yaw,glow:glow.length,on:on.length,hints:hints.map(h=>({a:+(h.alpha||0).toFixed(2),inside:!!h.inside,behind:!!h.behind}))};
        break;
      }
    }
    if(!pick){ EZ.view.yaw=44; EZ.applyCams(); pick={yaw:44,fallback:true}; }
    window.__tbYaw=pick.yaw;
    if(EZ.paintHint) EZ.paintHint(performance.now());
    const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
    const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
    const hud=document.getElementById('ahud'); if(hud) hud.classList.remove('show');
    const fx=document.getElementById('flashFx'); if(fx) fx.style.opacity='0';
    return {n:bots.length, outcome:fl.peekOutcome, ...pick};
  });
  console.log('turnback setup', JSON.stringify(tbShot));
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await pg.evaluate(()=>{
    const fl=EZ.flash();
    if(fl){ fl.path=null; fl.pathT=null; fl.busyUntil=1e15; fl.peekUntil=performance.now()+30000; fl.retreatAt=performance.now()+30000; fl.peekOutcome='dodged'; fl.phase='run'; }
    const fy=EZ.FLOOR_Y+0.05;
    const poses=[{x:0.50,z:-5.62,c:0},{x:-0.40,z:-5.72,c:1},{x:1.18,z:-5.52,c:0}];
    (EZ.peekBots()||[]).forEach((bot,i)=>{
      if(!bot) return;
      const pose=poses[i]||poses[0];
      bot.dead=false; bot.group.visible=true; bot.dim=0; EZ.paintBot(bot,0);
      bot.move=Object.assign(bot.move||{},{phase:'hold',u:0.85,settled:true,style:'swing',goAt:0,from:{x:pose.x>0?1.65:-1.65,y:fy,z:-6.5},to:{x:pose.x,y:fy,z:pose.z}});
      bot.group.position.set(pose.x,fy,pose.z);
      bot.crouchWant=pose.c; EZ.applyCrouch(bot,pose.c);
      bot.group.updateMatrixWorld(true);
    });
    EZ.camEye.set(0.15,0,2.4);
    EZ.view.yaw=window.__tbYaw||44;
    EZ.view.pitch=2;
    EZ.applyCams();
    if(EZ.paintHint) EZ.paintHint(performance.now());
    const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
    const fx=document.getElementById('flashFx'); if(fx) fx.style.opacity='0';
  });
  await stage.screenshot({path:path.join(OUT,'flash-turnback.png')});
  console.log('shot', path.join(OUT,'flash-turnback.png'));
  await pg.evaluate(()=>EZ.abandonFlash());



  // v1.10.0: peek + wide swing + slide together, and a slide close-up
  const placeTypes=async (kind)=>{
    return pg.evaluate((kind)=>{
      EZ.setEnv('retro'); EZ.setTheme('dark');
      if(EZ.abandonFlash) EZ.abandonFlash();
      if(EZ.clearWhiteOut) EZ.clearWhiteOut();
      EZ.S.env='retro'; EZ.S.hint=false;
      EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
      EZ.S.flash.rand=false; EZ.S.flash.diff='normal'; EZ.S.flash.wasd=false; EZ.S.flash.peek='mix'; EZ.S.flash.botSpeed=1;
      EZ.S.bot.stance='mix'; EZ.S.bot.shape='bot'; EZ.S.bot.dmg='cs2arm';
      EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
      EZ.setMode('flash','flash');
      EZ.startFlash(); EZ.forceFlashRun();
      EZ.setScn('hall');
      const fl=EZ.flash();
      fl.busyUntil=1e15; fl.path=null; fl.pathT=null; fl.wasd=false;
      EZ.spawnFlash(performance.now());
      EZ.lookAway(); EZ.detonateFlash(performance.now());
      fl.busyUntil=1e15; fl.path=null; fl.pathT=null;
      fl.peekUntil=performance.now()+30000;
      fl.retreatAt=performance.now()+30000;
      fl.peekOutcome='dodged'; fl.phase='run';
      const fy=EZ.FLOOR_Y+0.05;
      const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
      const poses=[
        {type:'peek',x:0.98,z:-5.92,crouch:0,fromX:1.48,fromZ:-6.25,style:'peek'},
        {type:'swing',x:-0.55,z:-5.28,crouch:0,fromX:-1.48,fromZ:-6.25,style:'swing'},
        {type:'slide',x:0.22,z:-5.62,crouch:1,fromX:-1.50,fromZ:-6.15,style:'slide'}
      ];
      const put=(bot,pose,u)=>{
        bot.dead=false; bot.group.visible=true; bot.dim=0; EZ.paintBot(bot,0);
        bot.peekType=pose.type;
        const from={x:pose.fromX,y:fy,z:pose.fromZ}, to={x:pose.x,y:fy,z:pose.z};
        const uu=(u==null)?1:u;
        const mx=from.x+(to.x-from.x)*uu, mz=from.z+(to.z-from.z)*uu;
        bot.move={phase:'hold',goAt:0,style:pose.style,peekType:pose.type,u:uu,overshoot:pose.style==='swing'?1.12:1,settled:true,from,to,speed:0,v:0,t:99};
        bot.group.position.set(mx,fy,mz);
        bot.crouchWant=pose.crouch; EZ.applyCrouch(bot,pose.crouch);
        bot.moving=false; bot.group.updateMatrixWorld(true);
      };
      if(kind==='types'){
        bots.slice(0,3).forEach((bot,i)=>put(bot,poses[i],1));
        (EZ.peekBots()||[]).forEach((b,i)=>{ if(i>=3&&b){ b.dead=true; b.group.visible=false; } });
        EZ.camEye.set(0.2,0,-2.2); EZ.view.yaw=0; EZ.view.pitch=3;
      }else{
        const slider=bots[0];
        (EZ.peekBots()||[]).forEach(b=>{ if(b!==slider){ b.dead=true; b.group.visible=false; } });
        if(slider) put(slider,poses[2],0.52);
        EZ.camEye.set(0.18,0,-2.35); EZ.view.yaw=4; EZ.view.pitch=2;
      }
      EZ.applyCams();
      const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
      const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
      const hud=document.getElementById('ahud'); if(hud) hud.classList.remove('show');
      const fx=document.getElementById('flashFx'); if(fx) fx.style.opacity='0';
      return {n:(EZ.peekBots()||[]).filter(b=>b&&b.group.visible&&!b.dead).length, types:(EZ.peekBots()||[]).filter(b=>b&&b.group.visible&&!b.dead).map(b=>EZ.peekTypeOf(b)), crouch:((EZ.peekBots()||[]).find(b=>b&&b.group.visible&&!b.dead)||{}).crouch};
    }, kind);
  };
  const peekTypesShot=await placeTypes('types');
  console.log('peek-types setup', JSON.stringify(peekTypesShot));
  if(!peekTypesShot.types || !['peek','swing','slide'].every(t=>peekTypesShot.types.includes(t))){
    fail('flash-peek-types should show peek, wide swing, and slide: '+JSON.stringify(peekTypesShot));
  }
  await stage.screenshot({path:path.join(OUT,'flash-peek-types.png')});
  console.log('shot', path.join(OUT,'flash-peek-types.png'));

  const slideShot=await placeTypes('slide');
  console.log('slide setup', JSON.stringify(slideShot));
  if(!(slideShot.types||[]).includes('slide') || !(slideShot.crouch>=0.9)) fail('flash-slide should show a crouched slide: '+JSON.stringify(slideShot));
  await stage.screenshot({path:path.join(OUT,'flash-slide.png')});
  console.log('shot', path.join(OUT,'flash-slide.png'));
  await pg.evaluate(()=>EZ.abandonFlash());

  // retro-walls-*.png for every flash map
  const wallMaps=['hall','hold','anchor','entry','retake','overwall','mid','ramp'];
  for(const id of wallMaps){
    await pg.evaluate((id)=>{
      EZ.setEnv('retro'); EZ.setTheme('dark');
      if(EZ.abandonFlash) EZ.abandonFlash();
      if(EZ.clearWhiteOut) EZ.clearWhiteOut();
      EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn=id;
      EZ.S.flash.rand=false; EZ.S.bot.shape='bot';
      EZ.setMode('flash','flash');
      EZ.setScn(id); EZ.previewScn();
      const s=(EZ.scnMeta()&&EZ.scnMeta().start)||{x:0,y:0,z:4.5,yaw:0,pitch:4};
      EZ.camEye.set(s.x,s.y,s.z);
      EZ.view.yaw=s.yaw||0; EZ.view.pitch=(s.pitch==null?4:Math.max(3,s.pitch));
      EZ.applyCams();
      const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
      const fx=document.getElementById('flashFx'); if(fx) fx.style.opacity='0';
      const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
      const hud=document.getElementById('ahud'); if(hud) hud.classList.remove('show');
    }, id);
    await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const dest=path.join(OUT,'retro-walls-'+id+'.png');
    await stage.screenshot({path:dest});
    console.log('shot', dest);
  }
  await pg.evaluate(()=>EZ.abandonFlash());


  // v1.11.0: opaque bots during whiteout, closed wall faces
  const matCheck=await pg.evaluate(()=>{
    EZ.setEnv('retro'); EZ.setTheme('dark');
    EZ.S.flash.warned=true; EZ.S.flash.reduced=false; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
    EZ.S.flash.rand=false; EZ.S.bot.shape='bot';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun(); EZ.setScn('hall');
    const fl=EZ.flash(); fl.busyUntil=1e15; fl.path=null;
    EZ.spawnFlash(performance.now());
    EZ.lookAway(); EZ.detonateFlash(performance.now());
    // force a full-flash paint like spawnPeekBots(factor=1)
    const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
    bots.forEach(b=>EZ.paintBot(b,1));
    const mats=bots.map(b=>EZ.botMatInfo(b));
    const fx=document.getElementById('flashFx');
    const wash=fx?{op:+getComputedStyle(fx).opacity, bg:getComputedStyle(fx).backgroundColor, blend:getComputedStyle(fx).mixBlendMode}:null;
    return {n:bots.length, mats, wash};
  });
  console.log('bot opacity', JSON.stringify(matCheck));
  if(!matCheck.n) fail('expected peek bots for opacity check');
  if(matCheck.mats.some(m=>!m || m.body.opacity!==1 || m.head.opacity!==1 || m.body.transparent || m.head.transparent || !m.body.depthWrite || !m.head.depthWrite))
    fail('bots must stay opaque with depthWrite during a flash: '+JSON.stringify(matCheck.mats));

  const walls=await pg.evaluate(()=>{
    const self=EZ.concatSelfTest();
    const out=[];
    for(const id of EZ.SCN_IDS){
      EZ.setScn(id);
      const r=EZ.wallClosureReport();
      r.self=self;
      out.push(r);
    }
    return out;
  });
  console.log('wall closure', walls.map(r=>({scn:r.scn,n:r.n,boxes:r.boxes,tris:r.tris,expect:r.expect,bad:(r.bad||[]).length,self:r.self})));
  if(!walls.length) fail('wallClosureReport returned nothing');
  if(!walls[0].self || !walls[0].self.ok) fail('concatGeos should keep all box faces: '+JSON.stringify(walls[0].self));
  for(const r of walls){
    if(!r.n) fail('no boxed meshes reported on '+r.scn);
    if(r.bad && r.bad.length) fail('merged/static boxes dropped faces on '+r.scn+': '+JSON.stringify(r.bad.slice(0,4)));
    if(!(r.tris>=r.expect && r.tris%12===0)) fail('triangle count should cover every box face on '+r.scn+': '+JSON.stringify({tris:r.tris,expect:r.expect,boxes:r.boxes}));
  }

  const look=await pg.evaluate(()=>{
    const grain=document.getElementById('grain');
    const gcs=grain?getComputedStyle(grain):null;
    EZ.setEnv('retro'); EZ.setMode('flash','flash'); EZ.setScn('hall');
    const env=EZ.envInfo();
    const maps=[];
    for(const id of EZ.SCN_IDS){
      EZ.setScn(id);
      const r=EZ.scnObjectReport();
      const cl=EZ.wallClosureReport();
      maps.push({id, floaters:(r.floaters||[]).map(f=>({mid:f.mid,size:f.size,role:f.role})), floaterN:(r.floaters||[]).length, closureBad:(cl.bad||[]).length, info:EZ.rendererInfo()});
    }
    EZ.setScn('hall');
    const info=EZ.rendererInfo();
    return {
      fogNear:env.fogNear, fogFar:env.fogFar, fog:env.fog, hemi:env.hemi, sunI:env.sunI,
      grainBlend:gcs?gcs.mixBlendMode:'', grainInset:gcs?gcs.inset||gcs.top:'',
      autoQual:!!document.getElementById('autoQual'),
      lowLabel:(document.querySelector('label[for=lowq], #lowq')&&document.getElementById('lowq')&&document.getElementById('lowq').parentElement.textContent)||'',
      maps, info, displayHz:EZ.readDisplayHz(), useLow:EZ.useLowGfx()
    };
  });
  console.log('flash look', JSON.stringify({fogNear:look.fogNear,fogFar:look.fogFar,fog:look.fog,hemi:look.hemi,sunI:look.sunI,grainBlend:look.grainBlend,info:look.info,floaters:look.maps.map(m=>[m.id,m.floaterN]),autoQual:look.autoQual}));
  if(look.fogNear<30 || look.fogFar<70) fail('flash retro fog still swallows the room: '+JSON.stringify({near:look.fogNear,far:look.fogFar}));
  if(look.hemi<1) fail('flash retro lighting too dim, hemi='+look.hemi);
  if(/overlay|multiply|screen|color-dodge/i.test(look.grainBlend||'')) fail('grain overlay blend kills GPU compositing: '+look.grainBlend);
  if(!look.autoQual) fail('Auto quality checkbox missing');
  for(const m of look.maps){
    if(m.floaterN) fail('floating neon/props block the sightline on '+m.id+': '+JSON.stringify(m.floaters));
    if(m.closureBad) fail('wall closure broke on '+m.id);
  }

  // flash-during-whiteout.png — solid bots under a visible wash
  const wo=await pg.evaluate(()=>{
    EZ.setEnv('retro'); EZ.setTheme('dark');
    if(EZ.abandonFlash) EZ.abandonFlash();
    if(EZ.clearWhiteOut) EZ.clearWhiteOut();
    EZ.S.env='retro'; EZ.S.hint=false;
    EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn='hall';
    EZ.S.flash.rand=false; EZ.S.flash.diff='easy'; EZ.S.flash.wasd=false; EZ.S.flash.peek='mix';
    EZ.S.bot.stance='mix'; EZ.S.bot.shape='bot'; EZ.S.bot.body='#f4f6f8'; EZ.S.bot.head='#00e8ff';
    EZ.setMode('flash','flash');
    EZ.startFlash(); EZ.forceFlashRun(); EZ.setScn('hall');
    const fl=EZ.flash();
    fl.busyUntil=1e15; fl.path=null; fl.pathT=null;
    EZ.spawnFlash(performance.now());
    EZ.lookAway(); EZ.detonateFlash(performance.now());
    fl.busyUntil=1e15; fl.path=null; fl.peekUntil=performance.now()+30000; fl.retreatAt=performance.now()+30000; fl.phase='run';
    const fy=EZ.FLOOR_Y+0.05;
    const poses=[{x:0.98,z:-5.92,c:0},{x:-0.55,z:-5.28,c:0},{x:0.22,z:-5.62,c:1}];
    const bots=(EZ.peekBots()||[]).filter(b=>b&&!b.dead);
    bots.slice(0,3).forEach((bot,i)=>{
      const p=poses[i]||poses[0];
      bot.dead=false; bot.group.visible=true; bot.dim=1; EZ.paintBot(bot,1);
      bot.move={phase:'hold',settled:true,u:1,style:['peek','swing','slide'][i],peekType:['peek','swing','slide'][i],from:{x:p.x,y:fy,z:p.z},to:{x:p.x,y:fy,z:p.z},speed:0};
      bot.group.position.set(p.x,fy,p.z);
      bot.crouchWant=p.c; EZ.applyCrouch(bot,p.c);
      bot.group.updateMatrixWorld(true);
    });
    (EZ.peekBots()||[]).forEach((b,i)=>{ if(i>=3&&b){ b.dead=true; b.group.visible=false; } });
    EZ.camEye.set(0.2,0,-2.2); EZ.view.yaw=0; EZ.view.pitch=3; EZ.applyCams();
    const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
    const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
    const hud=document.getElementById('ahud'); if(hud) hud.classList.remove('show');
    const fx=document.getElementById('flashFx');
    if(fx){ fx.style.transition='none'; fx.style.mixBlendMode='normal'; fx.style.background='#fff'; fx.style.opacity='0.45'; }
    return {n:bots.slice(0,3).length, mats:(bots.slice(0,3).map(b=>EZ.botMatInfo(b))), fx:fx?fx.style.opacity:null};
  });
  console.log('whiteout setup', JSON.stringify(wo));
  if(wo.mats.some(m=>m.body.transparent||m.body.opacity!==1)) fail('whiteout stills need opaque bots: '+JSON.stringify(wo));
  await stage.screenshot({path:path.join(OUT,'flash-during-whiteout.png')});
  console.log('shot', path.join(OUT,'flash-during-whiteout.png'));
  await pg.evaluate(()=>{ const fx=document.getElementById('flashFx'); if(fx) fx.style.opacity='0'; EZ.abandonFlash(); });

  // walls-closed-<map>.png from start and a corner/up angle on a few maps
  const closedMaps=['hall','hold','anchor','entry','retake','overwall','mid','ramp'];
  for(const id of closedMaps){
    await pg.evaluate((id)=>{
      EZ.setEnv('retro'); EZ.setTheme('dark');
      if(EZ.abandonFlash) EZ.abandonFlash();
      if(EZ.clearWhiteOut) EZ.clearWhiteOut();
      EZ.S.flash.warned=true; EZ.S.flash.reduced=true; EZ.S.flash.preset='val'; EZ.S.flash.scn=id;
      EZ.S.flash.rand=false; EZ.setMode('flash','flash');
      EZ.setScn(id); EZ.previewScn();
      const s=(EZ.scnMeta()&&EZ.scnMeta().start)||{x:0,y:0,z:4.5,yaw:0,pitch:2};
      EZ.camEye.set(s.x,s.y,s.z);
      EZ.view.yaw=s.yaw||0; EZ.view.pitch=(id==='hall'?(s.pitch==null?2:s.pitch):8);
      EZ.applyCams();
      const toast=document.getElementById('flashToast'); if(toast){ toast.className=''; toast.textContent=''; }
      const fx=document.getElementById('flashFx'); if(fx){ fx.style.opacity='0'; fx.classList.add('hide'); }
      const ov=document.querySelector('#ov'); if(ov){ ov.classList.add('hide'); ov.style.display='none'; }
      const hud=document.getElementById('ahud'); if(hud) hud.classList.remove('show');
    }, id);
    await stage.screenshot({path:path.join(OUT,'walls-closed-'+id+'.png')});
    console.log('shot', path.join(OUT,'walls-closed-'+id+'.png'));
    if(id==='hall'){
      await stage.screenshot({path:path.join(OUT,'hall-after.png')});
      console.log('shot', path.join(OUT,'hall-after.png'));
    }
    await stage.screenshot({path:path.join(OUT,'walls-after-'+id+'.png')});
  }
  // extra angles: hall corner + hold looking up at ceiling join
  for(const shot of [
    {id:'hall', name:'walls-closed-hall-corner', eye:[0.4,0.1,-3.4], yaw:28, pitch:6},
    {id:'hold', name:'walls-closed-hold-up', eye:[0,0,2.4], yaw:-18, pitch:22},
    {id:'mid', name:'walls-closed-mid-corner', eye:[1.2,0,2.0], yaw:-32, pitch:8}
  ]){
    await pg.evaluate((shot)=>{
      EZ.setEnv('retro'); EZ.setTheme('dark');
      EZ.setScn(shot.id); EZ.previewScn();
      EZ.camEye.set(shot.eye[0],shot.eye[1],shot.eye[2]);
      EZ.view.yaw=shot.yaw; EZ.view.pitch=shot.pitch; EZ.applyCams();
      const ov=document.querySelector('#ov'); if(ov) ov.classList.add('hide');
      const fx=document.getElementById('flashFx'); if(fx) fx.style.opacity='0';
    }, shot);
    await stage.screenshot({path:path.join(OUT,shot.name+'.png')});
    console.log('shot', path.join(OUT,shot.name+'.png'));
  }
  await pg.evaluate(()=>EZ.abandonFlash());

  // A/D (and arrow) strafe during auto-walk: offset, collision, lane clamp, yaw independence.
  const strafe = await pg.evaluate(()=>{
    const out={};
    const holdT=(fl,t)=>{ fl.pathT=t; };
    const stepAt=(fl,t,dt)=>{ fl.pathT=t; EZ.stepMove(dt); fl.pathT=t; };
    EZ.S.flash.warned=true; EZ.S.flash.wasd=false; EZ.S.flash.scn='hall'; EZ.S.flash.preset='cs2'; EZ.S.flash.rand=false;
    EZ.setScn('hall');
    EZ.startFlash(); EZ.forceFlashRun();
    EZ.spawnFlash(performance.now());
    const hint=document.getElementById('flashMoveHint');
    out.hint=hint?{text:hint.textContent, show:hint.classList.contains('show')}:null;
    out.wasdDefault=!!EZ.S.flash.wasd;
    const fl=EZ.flash();
    if(!fl.path){ fl.path=EZ.scnMeta().path; fl.pathDur=EZ.scnMeta().pathDur||6.8; }
    // Mid A long: path is going -Z, so A/D is along ±X, with an open lane to the right wall.
    const uLong=(function(){
      const path=fl.path, dur=fl.pathDur||7.2;
      let bestU=0.85, best=1e9;
      for(let u=0;u<=1;u+=0.01){
        const p=EZ.pathAt(path,u);
        const d=Math.abs(p.z+18.5)+Math.abs(p.x-13.2)*0.25;
        if(d<best){ best=d; bestU=u; }
      }
      return bestU;
    })();
    const LONG_T=uLong*(fl.pathDur||7.2);
    fl.strafeOff=0; fl.strafeVel=0; EZ.clearKeys();
    stepAt(fl,LONG_T,0);
    out.onLong={x:+EZ.camEye.x.toFixed(3), z:+EZ.camEye.z.toFixed(3), y:+EZ.camEye.y.toFixed(3)};
    const x0=EZ.camEye.x, z0=EZ.camEye.z;
    EZ.setKey('KeyD', true);
    stepAt(fl,LONG_T,0.05);
    out.accel={vel:EZ.strafeState().vel, max:EZ.STRAFE_MAX, dx:EZ.camEye.x-x0};
    // Reach max speed but stop before the wall (~3 m of lane).
    for(let i=0;i<6;i++) stepAt(fl,LONG_T,0.05);
    out.right={x:EZ.camEye.x, z:EZ.camEye.z, vel:EZ.strafeState().vel, dx:EZ.camEye.x-x0, dz:EZ.camEye.z-z0};
    EZ.clearKeys();
    const xR=EZ.camEye.x;
    EZ.setKey('KeyA', true);
    for(let i=0;i<16;i++) stepAt(fl,LONG_T,0.05);
    out.left={x:EZ.camEye.x, z:EZ.camEye.z, vel:EZ.strafeState().vel, dx:EZ.camEye.x-xR};
    EZ.clearKeys();
    fl.strafeOff=0; fl.strafeVel=0; stepAt(fl,LONG_T,0);
    const xA=EZ.camEye.x;
    EZ.setKey('ArrowRight', true);
    for(let i=0;i<8;i++) stepAt(fl,LONG_T,0.05);
    out.arrow={dx:EZ.camEye.x-xA, vel:EZ.strafeState().vel};
    EZ.clearKeys();
    fl.strafeOff=0; fl.strafeVel=0; EZ.view.yaw=90; EZ.view.pitch=0; stepAt(fl,LONG_T,0);
    const xY=EZ.camEye.x, zY=EZ.camEye.z;
    EZ.setKey('KeyD', true);
    for(let i=0;i<8;i++) stepAt(fl,LONG_T,0.05);
    out.yawIndep={dx:EZ.camEye.x-xY, dz:EZ.camEye.z-zY, yaw:EZ.view.yaw};
    EZ.clearKeys(); EZ.view.yaw=0;
    // Collision: from mid-Long, strafe into the right wall; stay out of solids.
    fl.strafeOff=0; fl.strafeVel=0; stepAt(fl,LONG_T,0);
    EZ.setKey('KeyD', true);
    let hitSolid=false, maxX=-Infinity;
    for(let i=0;i<50;i++){
      stepAt(fl,LONG_T,0.05);
      maxX=Math.max(maxX, EZ.camEye.x);
      if(EZ.blockedAt(EZ.camEye.x, EZ.camEye.y, EZ.camEye.z, 0.2) || (EZ.pointInWall&&EZ.pointInWall(EZ.camEye.x,EZ.camEye.y,EZ.camEye.z))) hitSolid=true;
    }
    out.wall={maxX, minXPath:x0, hitSolid, off:EZ.strafeState().off, vel:EZ.strafeState().vel, y:EZ.camEye.y, z:EZ.camEye.z};
    EZ.clearKeys();
    // Lane clamp at the Pit: court just after the doors, Pit is to the +X. Must stay on the high floor.
    const uPit=(function(){
      const path=fl.path;
      let bestU=0.55, best=1e9;
      for(let u=0;u<=1;u+=0.01){
        const p=EZ.pathAt(path,u);
        const d=Math.abs(p.z+11.5)+Math.abs(p.x-4)*0.2;
        if(d<best){ best=d; bestU=u; }
      }
      return bestU;
    })();
    const PIT_T=uPit*(fl.pathDur||7.2);
    fl.strafeOff=0; fl.strafeVel=0; stepAt(fl,PIT_T,0);
    out.atPit={x:+EZ.camEye.x.toFixed(3), z:+EZ.camEye.z.toFixed(3), t:+PIT_T.toFixed(2)};
    EZ.setKey('KeyD', true); // Pit is on the right of the court
    let maxPitX=-Infinity, minY=Infinity, fell=false;
    for(let i=0;i<50;i++){
      stepAt(fl,PIT_T,0.05);
      maxPitX=Math.max(maxPitX, EZ.camEye.x);
      minY=Math.min(minY, EZ.camEye.y);
      if(EZ.camEye.y<-0.8) fell=true;
    }
    out.pit={maxX:maxPitX, minY, fell, off:EZ.strafeState().off, stand:EZ.standY(EZ.camEye.x,EZ.camEye.z), x:EZ.camEye.x, z:EZ.camEye.z};
    EZ.clearKeys();
    const vis=EZ.peekVisibilityReport(EZ.scnMeta());
    out.vis={bad:(vis.peekBad||[]).length, n:vis.n|| (vis.peeks&&vis.peeks.length), peekBad:vis.peekBad||[]};
    EZ.abandonFlash();
    return out;
  });
  console.log('strafe', JSON.stringify(strafe));
  if(strafe.wasdDefault) fail('full WASD should stay off by default so auto-walk + A/D strafe is used');
  if(!(strafe.hint && /A\/D to strafe/i.test(strafe.hint.text) && strafe.hint.show)) fail('round start should show A/D to strafe hint: '+JSON.stringify(strafe.hint));
  if(!(strafe.accel && strafe.accel.vel>0.2 && strafe.accel.vel<strafe.accel.max-0.4)) fail('strafe should accelerate, not jump to max speed: '+JSON.stringify(strafe.accel));
  if(!(strafe.right && strafe.right.dx>0.6 && Math.abs(strafe.right.dz)<0.55 && strafe.right.vel>4.5)) fail('KeyD should strafe right along the lane: '+JSON.stringify(strafe.right));
  if(!(strafe.left && strafe.left.dx<-0.6)) fail('KeyA should strafe left: '+JSON.stringify(strafe.left));
  if(!(strafe.arrow && strafe.arrow.dx>0.6)) fail('ArrowRight should strafe right: '+JSON.stringify(strafe.arrow));
  if(!(strafe.yawIndep && strafe.yawIndep.dx>0.6 && Math.abs(strafe.yawIndep.dz)<0.55)) fail('strafe is lane-relative so turning should not change the sidestep: '+JSON.stringify(strafe.yawIndep));
  if(!(strafe.wall && !strafe.wall.hitSolid && strafe.wall.maxX>strafe.wall.minXPath+1 && strafe.wall.maxX<18.3)) fail('strafe should collide with walls and not clip: '+JSON.stringify(strafe.wall));
  if(!(strafe.pit && !strafe.pit.fell && strafe.pit.minY>-0.5 && strafe.pit.maxX<10.2)) fail('auto-walk strafe should stay on the walkway and not fall into Pit: '+JSON.stringify(strafe.pit));
  if(strafe.vis && strafe.vis.bad) fail('peeks must stay visible from some point on the strafe lane: '+JSON.stringify(strafe.vis));

  if(net.length) fail('unexpected network: '+net.join(', '));
  if(errs.length) fail('console errors: '+errs.join(' | '));
  console.log('flash+theme tests ok');
  await b.close();
})().catch(e=>{ console.error(e); process.exit(1); });
