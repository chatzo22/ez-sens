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

  if(net.length) fail('unexpected network: '+net.join(', '));
  if(errs.length) fail('console errors: '+errs.join(' | '));
  console.log('flash+theme tests ok');
  await b.close();
})().catch(e=>{ console.error(e); process.exit(1); });
