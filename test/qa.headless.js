const p=require('puppeteer-core');
const fs=require('fs');
const path=require('path');
const URL_=process.argv[2]||'file:///workspace/out/ez-sens/index.html';
const OUT=process.argv[3]||'/workspace/out/ez-sens-qa';
fs.mkdirSync(OUT,{recursive:true});
const issues=[];
const note=(s)=>{ console.log('!',s); issues.push(s); };
(async()=>{
  const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await b.newPage();
  await pg.setViewport({width:1440,height:1100});
  const errs=[], warn=[], net=[];
  pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
  pg.on('console',m=>{ const t=m.type(),x=m.text(); if(t==='error')errs.push('console: '+x); if(t==='warning')warn.push(x); });
  await pg.setRequestInterception(true);
  pg.on('request',r=>{ const u=r.url(); if(u.split('?')[0]===URL_.split('?')[0]||u.startsWith('blob:')||u.startsWith('data:'))r.continue(); else {net.push(u); r.abort();}});
  // fresh storage
  const ctx=pg.browserContext?null:null;
  await pg.goto(URL_,{waitUntil:'load'});
  await pg.evaluate(()=>localStorage.clear());
  await pg.reload({waitUntil:'load'});
  await pg.waitForFunction(()=>document.documentElement.dataset.ready==='1',{timeout:20000});
  await new Promise(r=>setTimeout(r,600));

  const shot=async(name)=>{ const f=path.join(OUT,name+'.png'); await pg.screenshot({path:f,fullPage:false}); console.log('shot',f); return f; };
  const text=(sel)=>pg.$eval(sel,e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>null);
  const evalJ=(fn,a)=>pg.evaluate(fn,a);

  // --- default tab ---
  const boot=await evalJ(()=>({tab:document.querySelector('#nav button.on').textContent, mode:EZ.mode(), overlay:document.querySelector('#ov').innerText.replace(/\s+/g,' '), games:document.querySelectorAll('#conv tr').length, hint:EZ.S.hint, sound:EZ.S.sound, ready:document.documentElement.dataset.ready}));
  console.log('boot', boot);
  if(boot.tab!=='Range') note('default tab is not Range: '+boot.tab);
  if(boot.mode!=='range') note('default mode is not range: '+boot.mode);
  if(boot.hint!==true) note('off-screen hint should default on');
  await shot('01-range-idle');

  // open range settings
  await pg.click('#rpanel summary');
  await new Promise(r=>setTimeout(r,200));
  await shot('02-range-settings');

  // --- converter: every game, no NaN ---
  await pg.click('nav button[data-t=setup]');
  await new Promise(r=>setTimeout(r,300));
  const conv=await evalJ(()=>{
    const rows=[...document.querySelectorAll('#conv tr')].map(r=>r.innerText.replace(/\s+/g,' ').trim());
    const stats=document.querySelector('#stats').innerText;
    const games=EZMath.all().map(g=>{
      const cm=EZMath.cm360(800, EZMath.menuRound(g.id, EZMath.sensForCm(40,800,g.id)) ,g.id);
      const dpc=EZMath.dpc(g.id, 1);
      const sens=EZMath.sensForCm(52,800,g.id);
      return {id:g.id,name:g.name,cm40:cm,dpc,sens52:sens,nan:[cm,dpc,sens].some(v=>v==null||Number.isNaN(v))};
    });
    const statsHasNaN=/NaN|undefined|null/.test(stats);
    return {rows:rows.length,stats,games,statsHasNaN,rowSample:rows.slice(0,3)};
  });
  console.log('converter games', conv.games.length, 'rows', conv.rows, 'statsHasNaN', conv.statsHasNaN);
  conv.games.forEach(g=>{ if(g.nan) note('NaN in converter math for '+g.id+' '+JSON.stringify(g)); });
  if(conv.statsHasNaN) note('NaN in stats bar: '+conv.stats);
  if(conv.rows<16) note('converter table missing rows: '+conv.rows);
  await pg.evaluate(()=>window.scrollTo(0,0));
  await shot('03-converter-top');
  await pg.evaluate(()=>window.scrollTo(0,700));
  await shot('04-converter-table');
  await pg.evaluate(()=>window.scrollTo(0,0));

  // switch games, cm stays
  const switchCm=await evalJ(()=>{
    const cm0=EZMath.cm360(EZ.S.dpi,EZ.S.sens,EZ.S.game, {});
    const out=[];
    for(const id of ['valorant','finals','arc','tarkov','bf6','rust']){
      EZ.setGame(id);
      const cm=EZMath.cm360(EZ.S.dpi,EZ.S.sens,EZ.S.game);
      out.push({id,sens:EZ.S.sens,cm,dCm:Math.abs(cm-cm0)});
    }
    EZ.setGame('cs2');
    return {cm0,out};
  });
  console.log('switch cm', switchCm);
  switchCm.out.forEach(o=>{ if(o.dCm>3) note('cm/360 drifted too far when switching to '+o.id+': '+o.cm+' vs '+switchCm.cm0); if(Number.isNaN(o.cm)) note('NaN cm for '+o.id); });

  // share roundtrip
  const share=await evalJ(()=>{
    const c=EZ.enc({dpi:1600,sens:0.5,game:'valorant'});
    EZ.applyShare(EZ.dec(c));
    const a=[EZ.S.dpi,EZ.S.game,EZ.S.sens];
    EZ.applyShare({dpi:800,sens:1,game:'cs2'});
    return a;
  });
  console.log('share', share);
  if(!(share[0]===1600&&share[1]==='valorant'&&share[2]===0.5)) note('share roundtrip failed '+JSON.stringify(share));

  // --- train tab layout + settings ---
  await pg.click('nav button[data-t=train]');
  await new Promise(r=>setTimeout(r,400));
  await shot('05-train-idle');
  const trainUI=await evalJ(()=>{
    const opts=document.querySelector('#perf').getBoundingClientRect();
    const info=document.querySelector('#perfInfo').getBoundingClientRect();
    const boxes=[...document.querySelectorAll('#perf label.inl')].map(e=>({t:e.innerText.trim(), r:e.getBoundingClientRect()}));
    const overlap=boxes.some(b=>b.r.right>info.left+8 && b.r.bottom>info.top+2 && b.r.top<info.bottom-2 && info.width>40);
    return {optsW:opts.width,optsH:opts.height,info,boxes:boxes.map(b=>b.t),overlap,lowq:document.querySelector('#lowq').checked,hint:document.querySelector('#hintOpt').checked};
  });
  console.log('train UI', trainUI);
  if(trainUI.overlap) note('Train settings checkboxes overlap the perf info text');
  if(!trainUI.hint) note('hint checkbox should be checked by default');

  // per-game crosshair editor (Train + Range share a profile)
  const xhUi=await evalJ(()=>{
    const editors=[...document.querySelectorAll('[data-xhedit]')];
    const train=document.querySelector('#xhEditor');
    const range=document.querySelector('#rpanelBody [data-xhedit]');
    EZ.setGame('cs2');
    EZ.saveXH({style:'t',color:'#ff3355',size:12,thick:3,gap:-1,outline:true,outlineW:2,dot:true,opacity:0.8,dynamic:true});
    const cs2=JSON.parse(JSON.stringify(EZ.currentXH()));
    const code=EZ.xhCode();
    EZ.setGame('valorant');
    const val=JSON.parse(JSON.stringify(EZ.currentXH()));
    EZ.setGame('cs2');
    const back=JSON.parse(JSON.stringify(EZ.currentXH()));
    const fromCs=EZ.importXH('CSGO-Cn37R-YE7vo-pLCAL-aURmZ-z6zkG');
    const skip=EZ.importXH('CSvbPubOq37zTGqtsPTP5QTrp5CB4xFXiKRLfzJsm49ZRe');
    EZ.setGame('cs2');
    EZ.saveXH(cs2);
    return {
      editorCount:editors.length,
      trainHasStyle:!!(train&&train.querySelector('[data-xh=style]')),
      rangeHasStyle:!!(range&&range.querySelector('[data-xh=style]')),
      gameLabel:train&&train.querySelector('[data-xh-game]')&&train.querySelector('[data-xh-game]').textContent,
      cs2, val, back, code, fromCs:fromCs&&fromCs.xh, skip:skip&&skip.error,
      parts:document.querySelectorAll('#xh i').length
    };
  });
  console.log('xh editor', xhUi);
  if(xhUi.editorCount<2) note('expected Train and Range crosshair editors, got '+xhUi.editorCount);
  if(!xhUi.trainHasStyle||!xhUi.rangeHasStyle) note('crosshair editor controls missing');
  if(xhUi.val&&xhUi.val.color==='#ff3355') note('Valorant should not inherit the unsaved-to-other-game CS2 crosshair on first use');
  if(!(xhUi.back&&xhUi.back.style==='t'&&xhUi.back.color==='#ff3355')) note('CS2 crosshair did not reload after switching games');
  if(!(xhUi.fromCs&&xhUi.fromCs.style==='t'&&xhUi.fromCs.color==='#af51d5')) note('CSGO share code import failed in QA');
  if(xhUi.skip!=='cs2-new') note('new CS2 codes should be skipped');
  await shot('05b-train-crosshair-editor');

  // FPS cap
  const fps=await evalJ(()=>{
    const sel=document.querySelector('#fps');
    sel.value='60'; sel.dispatchEvent(new Event('change'));
    const cap60=EZ.capFps();
    sel.value='custom'; sel.dispatchEvent(new Event('change'));
    const c=document.querySelector('#fpsCustom'); c.value=240; c.dispatchEvent(new Event('input'));
    const cap240=EZ.capFps();
    sel.value='auto'; sel.dispatchEvent(new Event('change'));
    return {cap60,cap240,auto:EZ.capFps(),hz:EZ.frame.hz,raw:EZ.rawEvt,perf:document.querySelector('#perfInfo').innerText};
  });
  console.log('fps', fps);
  if(fps.cap60!==60) note('FPS cap 60 failed: '+fps.cap60);
  if(!(fps.cap240<=fps.hz+0.5 || fps.cap240===240)) { /* cap is min(want, hz) */ }
  if(fps.cap240!==Math.min(240,fps.hz)) note('custom 240 cap expected min(240,hz)='+Math.min(240,fps.hz)+' got '+fps.cap240);

  // settings persistence
  const persist=await evalJ(()=>{
    EZ.S.sound=false; EZ.S.hint=false; EZ.S.showFps=false;
    const ev=new Event('change');
    document.querySelector('#sound').checked=false; document.querySelector('#sound').dispatchEvent(ev);
    document.querySelector('#hintOpt').checked=false; document.querySelector('#hintOpt').dispatchEvent(ev);
    const raw=JSON.parse(localStorage.getItem('ezsens.v1'));
    // restore defaults for play
    document.querySelector('#sound').checked=true; document.querySelector('#sound').dispatchEvent(ev);
    document.querySelector('#hintOpt').checked=true; document.querySelector('#hintOpt').dispatchEvent(ev);
    document.querySelector('#showFps').checked=true; document.querySelector('#showFps').dispatchEvent(ev);
    return {savedSound:raw.settings.sound, savedHint:raw.settings.hint};
  });
  console.log('persist', persist);
  if(persist.savedSound!==false) note('sound setting did not persist');
  if(persist.savedHint!==false) note('hint setting did not persist');

  // --- flick, track, micro ---
  async function runDrill(drill, nShots){
    await pg.evaluate((drill)=>{
      const tab=document.querySelector('nav button[data-t=train], nav button[data-t=setup]');
      const drillBtn=document.querySelector('#drills button[data-d="'+drill+'"]');
      const start=document.querySelector('#startBtn');
      if(drillBtn){ drillBtn.scrollIntoView({block:'center'}); drillBtn.click(); }
      if(start){ start.scrollIntoView({block:'center'}); start.click(); }
    }, drill);
    return evalJ(async({drill,nShots})=>{
      EZ.forceRun();
      const dpc=0.022;
      const aimOnce=async()=>{
        const st=EZ.state(); if(!st)return 'done';
        if(st.segments[st.si].type==='track'){
          // follow for a bit then let it finish quickly
          const T=st.tr; T.el=T.el||0;
          for(let i=0;i<40;i++){
            const dy=((T.yaw-EZ.view.yaw+540)%360)-180, dp=T.pitch-EZ.view.pitch;
            EZ.simMove(-dy/dpc/2,-dp/dpc/2); EZ.tick(16);
          }
          T.el=999; EZ.tick(16);
          return EZ.state()?'running':'finished';
        }
        const t=st.t; if(!t)return 'no-t';
        for(let i=0;i<60;i++){
          const dy=((t.ty-EZ.view.yaw+540)%360)-180, dp=t.tp-EZ.view.pitch;
          EZ.simMove(-dy/dpc/2,-dp/dpc/2);
          await new Promise(r=>requestAnimationFrame(r));
          if(Math.hypot(dy,dp)<0.2)break;
        }
        EZ.simShoot();
      };
      for(let k=0;k<nShots && EZ.state();k++) await aimOnce();
      // if still running (missed some), force finish
      if(EZ.state()){ const st=EZ.state(); st.si=st.segments.length; /* can't easily */ }
      const last=document.querySelector('#lastRound').innerText.replace(/\s+/g,' ');
      const ov=document.querySelector('#ov').innerText.replace(/\s+/g,' ');
      const hist=JSON.parse(localStorage.getItem('ezsens.v1')||'{}').history||[];
      return {left:!!EZ.state(), last, ov, hist0:hist[0], nan:/NaN/.test(last+' '+ov)};
    },{drill,nShots});
  }

  const flick=await runDrill('flick',20);
  console.log('flick', flick);
  if(flick.nan) note('NaN in flick results');
  if(flick.left) note('flick drill did not finish');
  if(!/Time-to-hit|First shot|Accuracy/i.test(flick.ov)) note('flick overlay missing recap stats: '+flick.ov);
  await shot('06-train-flick-results');

  const track=await runDrill('track',1);
  console.log('track', track);
  if(track.nan) note('NaN in track results');
  await shot('07-train-track-results');

  // floor clamp + hint (again, as regression)
  await pg.evaluate(()=>{ const b=document.querySelector('#drills button[data-d=track]'); const s=document.querySelector('#startBtn'); if(b){b.scrollIntoView({block:'center'}); b.click();} if(s){s.scrollIntoView({block:'center'}); s.click();} });
  const floorHint=await evalJ(()=>{
    EZ.forceRun();
    const T=EZ.state().tr; T.pitch=-80; T.vp=-120; T.tp=-120;
    const ys=[]; for(let i=0;i<120;i++){ EZ.tick(16); ys.push(EZ.targetPos().y-EZ.targetRad()); }
    T.vy=0;T.vp=0;T.ty=0;T.tp=0;T.next=999;T.yaw=0;T.pitch=0;
    EZ.placeTarget(0,0,1.3); EZ.view.pitch=0;
    EZ.view.yaw=90; const right=EZ.hintSample()[0];
    EZ.view.yaw=0; const on=EZ.hintSample()[0];
    return {minClear:Math.min(...ys), floor:EZ.FLOOR_Y, rightA:right&&right.alpha, rightX:right&&right.x, onA:on&&on.alpha};
  });
  console.log('floor/hint', floorHint);
  if(floorHint.minClear<floorHint.floor-1e-3) note('tracking went through the floor');
  if(!(floorHint.rightA>0.5&&floorHint.rightX>0)) note('off-screen hint not pointing right');
  if(!(floorHint.onA<0.05)) note('hint did not fade on-screen');
  // leave a visible hint for a screenshot: target to the right, render a frame
  await evalJ(()=>{
    const T=EZ.state().tr; T.yaw=0;T.pitch=0;T.vy=0;T.vp=0;
    EZ.view.yaw=90; EZ.view.pitch=0;
    EZ.paintHint(performance.now());
  });
  // need a rendered frame with the camera looking away — paintHint draws on overlay; also kick one rAF
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  await shot('08-train-hint-offscreen');
  // stop the run
  await evalJ(()=>{ if(EZ.state()){ /* abandon */ document.exitPointerLock?.(); }});

  const micro=await runDrill('micro',20);
  console.log('micro', micro);
  if(micro.nan) note('NaN in micro results');
  await shot('09-train-micro-results');

  // --- finder tab ---
  await pg.click('nav button[data-t=finder]');
  await new Promise(r=>setTimeout(r,300));
  const finderIdle=await evalJ(()=>({ov:document.querySelector('#ov').innerText, hudOn:document.querySelector('#ahud').classList.contains('show')}));
  console.log('finder idle', finderIdle);
  if(finderIdle.hudOn || /19\/20|on target 0%/i.test(finderIdle.ov)) note('finder tab leaked previous drill UI');
  if(!/Sens Finder|Start finder/i.test(finderIdle.ov)) note('finder idle overlay missing intro: '+finderIdle.ov);
  await shot('10-finder-idle');

  // time-of-day modes (Finder / Train arena only)
  const envQa=await evalJ(()=>{
    const night=(()=>{EZ.setEnv('night');return EZ.envInfo();})();
    const day=(()=>{EZ.setEnv('day');return EZ.envInfo();})();
    const rise=(()=>{EZ.setEnv('sunrise');return EZ.envInfo();})();
    const saved=JSON.parse(localStorage.getItem('ezsens.v1')).settings.env;
    const on=[...document.querySelectorAll('[data-envseg] button.on')].map(b=>b.dataset.env);
    EZ.setEnv('night');
    return {night,day,rise,saved,on};
  });
  console.log('finder env', envQa.saved, envQa.on, envQa.night.fog, envQa.day.fog, envQa.rise.fog);
  if(!(envQa.day.fog!==envQa.night.fog && envQa.rise.fog!==envQa.day.fog)) note('env modes did not change fog');
  if(!envQa.day.sunDisc||!envQa.rise.sunDisc||envQa.night.sunDisc) note('sun disc visibility is wrong');
  if(envQa.saved!=='sunrise') note('env did not persist to localStorage');
  if(envQa.on.some(x=>x!=='night')) note('env UI out of sync after reset to night');
  const pose={sunrise:{yaw:8,pitch:8},day:{yaw:6,pitch:12},night:{yaw:0,pitch:4}};
  for(const mode of ['sunrise','day','night']){
    await evalJ(({mode,pose})=>{
      EZ.setEnv(mode); EZ.setMode('arena','finder');
      document.querySelector('#ov').classList.add('hide');
      EZ.view.yaw=pose[mode].yaw; EZ.view.pitch=pose[mode].pitch;
      EZ.placeTarget(0,2,1.6);
    },{mode,pose});
    await pg.evaluate(()=>document.querySelector('#stage').scrollIntoView({block:'center'}));
    await new Promise(r=>setTimeout(r,250));
    const el=await pg.$('#stage');
    const f=path.join(OUT,'finder-'+mode+'.png');
    await el.screenshot({path:f});
    console.log('shot', f);
  }
  await evalJ(()=>{ document.querySelector('#ov').classList.remove('hide'); EZ.setMode('arena','finder'); });

  // --- custom game ---
  await pg.click('nav button[data-t=custom]');
  await new Promise(r=>setTimeout(r,200));
  await pg.evaluate(()=>{ document.querySelector('#cname').value=''; document.querySelector('#cyaw').value=''; });
  await pg.type('#cname','QA Game');
  await pg.type('#cyaw','0.05');
  await pg.click('#csave');
  const custom=await text('#clist');
  console.log('custom', custom);
  if(!custom.includes('QA Game')) note('custom game did not save');
  await shot('11-custom-game');

  // --- results tab ---
  await pg.click('nav button[data-t=results]');
  await new Promise(r=>setTimeout(r,300));
  const resTab=await evalJ(()=>({
    hist:[...document.querySelectorAll('#hist tr')].map(r=>r.innerText.replace(/\s+/g,' ')),
    rhist:[...document.querySelectorAll('#rhist tr')].map(r=>r.innerText.replace(/\s+/g,' ')),
    nan:/NaN/.test(document.body.innerText)
  }));
  console.log('results', resTab);
  if(resTab.nan) note('NaN on Results tab');
  if(resTab.hist.length<2) note('expected train history rows, got '+resTab.hist.length);
  await shot('12-results');

  // --- about ---
  await pg.click('nav button[data-t=about]');
  await new Promise(r=>setTimeout(r,200));
  await pg.evaluate(()=>window.scrollTo(0,0));
  await shot('13-about-top');
  const aboutRows=await pg.$$eval('#yawTbl tr',r=>r.length);
  console.log('about rows', aboutRows);
  if(aboutRows<16) note('about yaw table missing games: '+aboutRows);

  // --- range play + moving + resize ---
  await pg.click('nav button[data-t=range]');
  await new Promise(r=>setTimeout(r,300));
  const rangePlay=await evalJ(async()=>{
    EZ.rangeBegin();
    const dpc=0.022;
    const aim=async(t)=>{ for(let i=0;i<80;i++){ const c=EZ.rangeCamPos(); const dx=t.x-c.x,dy=t.y-c.y,dz=t.z-c.z; const L=Math.hypot(dx,dy,dz);
      const ty=Math.atan2(-dx,-dz)*180/Math.PI, tp=Math.asin(dy/L)*180/Math.PI; const ey=((ty-EZ.rview.yaw+540)%360)-180, ep=tp-EZ.rview.pitch;
      if(Math.hypot(ey,ep)<0.03)break; EZ.simMove(-ey/dpc/2,-ep/dpc/2); await new Promise(r=>requestAnimationFrame(r)); } };
    for(let k=0;k<4;k++){ const t=EZ.rangeTargets()[0]; await aim(t); EZ.rangeShoot(); }
    EZ.simMove(400,0); EZ.rangeShoot(); EZ.simMove(-400,0);
    return {hud:document.querySelector('#rhud').innerText.replace(/\s+/g,' '), pts:+document.querySelector('#rPts').textContent, acc:document.querySelector('#rAcc').textContent, phase:EZ.range().phase};
  });
  console.log('range play', rangePlay);
  if(!(rangePlay.pts>0)) note('range shots did not score');
  await shot('14-range-midrun');
  // end the run
  await evalJ(()=>{EZ.range().remaining=30;});
  await new Promise(r=>setTimeout(r,400));
  await shot('15-range-end');

  // moving targets stay above floor
  await pg.evaluate(()=>{ const el=document.querySelector('#rpanelBody input[data-r=moving]'); if(el&&!el.checked){ el.checked=true; el.dispatchEvent(new Event('change',{bubbles:true})); }});
  await evalJ(()=>EZ.rangeBegin());
  await new Promise(r=>setTimeout(r,600));
  const moving=await evalJ(()=>{
    const ts=EZ.rangeTargets();
    return {ys:ts.map(t=>t.y), size:EZ.S.range.size, minY:0.8, xs:ts.map(t=>t.x)};
  });
  console.log('moving', moving);
  if(moving.ys.some(y=>y<moving.minY+moving.size-1e-6)) note('range moving target through floor');
  await shot('16-range-moving');

  // resize / aspect
  await pg.setViewport({width:1920,height:1080});
  await new Promise(r=>setTimeout(r,300));
  const big=await evalJ(()=>{ const s=document.querySelector('#stage').getBoundingClientRect(); const c=document.querySelector('#stage canvas'); return {sw:s.width,sh:s.height,cw:c.width,ch:c.height,ar:s.width/s.height}; });
  console.log('resize 1920', big);
  await shot('17-range-1920');
  await pg.setViewport({width:1024,height:768});
  await new Promise(r=>setTimeout(r,300));
  await shot('18-range-1024');
  await pg.setViewport({width:1440,height:1100});

  // fullscreen API presence (can't really enter in headless reliably)
  const fsAPI=await evalJ(()=>({fn:typeof document.querySelector('#stage').requestFullscreen, btn:!!document.querySelector('#fsBtn3')}));
  console.log('fullscreen api', fsAPI);
  if(!fsAPI.btn) note('missing range fullscreen button');

  // pointer lock API
  const pl=await evalJ(()=>({fn:typeof document.querySelector('#stage').requestPointerLock, raw:EZ.rawEvt}));
  console.log('pointerlock', pl);

  // --- mobile / small viewport ---
  await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await pg.click('nav button[data-t=setup]');
  await new Promise(r=>setTimeout(r,400));
  const mobile=await evalJ(()=>{
    const nav=document.querySelector('header').getBoundingClientRect();
    const overflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+4;
    return {navH:nav.height, overflow, scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth, note:document.querySelector('.touchnote')&&getComputedStyle(document.querySelector('.touchnote')).display};
  });
  console.log('mobile converter', mobile);
  if(mobile.overflow) note('horizontal overflow on mobile converter');
  await shot('19-mobile-converter');
  await pg.click('nav button[data-t=train]');
  await new Promise(r=>setTimeout(r,300));
  await shot('20-mobile-train');
  await pg.click('nav button[data-t=range]');
  await new Promise(r=>setTimeout(r,300));
  await shot('21-mobile-range');

  // --- long-ish session: many frames, watch errors / heap ---
  await pg.setViewport({width:1440,height:1100,isMobile:false,hasTouch:false});
  await pg.click('nav button[data-t=train]');
  const perf=await evalJ(async()=>{
    const m0=performance.memory?{used:performance.memory.usedJSHeapSize}:null;
    await new Promise(r=>{ let n=0; const tick=()=>{ if(++n<240) requestAnimationFrame(tick); else r(); }; requestAnimationFrame(tick); });
    const m1=performance.memory?{used:performance.memory.usedJSHeapSize}:null;
    return {m0,m1,delta:m0&&m1?m1.used-m0.used:null, fps:document.querySelector('#hudFps').textContent, bodyNan:/NaN/.test(document.body.innerText)};
  });
  console.log('long frames', perf);
  if(perf.bodyNan) note('NaN in page after long rAF');
  if(perf.delta!=null && perf.delta>30*1024*1024) note('heap grew a lot over 240 frames: '+(perf.delta/1e6).toFixed(1)+' MB');

  await pg.setViewport({width:1440,height:1100});
  await pg.click('nav button[data-t=range]');
  await new Promise(r=>setTimeout(r,200));
  await shot('22-final-range');

  console.log('blocked network:', net);
  console.log('warnings:', warn.slice(0,20));
  console.log('errors:', errs);
  if(net.length) note('unexpected network requests: '+net.join(', '));
  errs.forEach(e=>note(e));
  console.log('ISSUES', JSON.stringify(issues,null,2));
  fs.writeFileSync(path.join(OUT,'qa-report.json'), JSON.stringify({issues,errs,warn:warn.slice(0,30),net,boot,convGames:conv.games,fps,floorHint,rangePlay,moving,mobile,perf},null,2));
  await b.close();
  if(issues.length) process.exitCode=2;
})().catch(e=>{ console.error(e); process.exit(1); });
