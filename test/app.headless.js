const p=require('puppeteer-core');
const URL_=process.argv[2]||'file:///workspace/out/ez-sens/index.html';
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage(); await pg.setViewport({width:1400,height:1000}); const errs=[],net=[];
pg.on('pageerror',e=>errs.push('pageerror: '+e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
await pg.setRequestInterception(true);
pg.on('request',r=>{const u=r.url(); if(u===URL_||u.startsWith('blob:')||u.startsWith('data:')){r.continue();} else {net.push(u); r.abort();}});
await pg.goto(URL_,{waitUntil:'load'}); await pg.waitForFunction(()=>document.documentElement.dataset.ready==='1',{timeout:20000});
await new Promise(r=>setTimeout(r,1200));
const rows=await pg.$$eval('#conv tr',rs=>rs.map(r=>r.innerText.replace(/\s+/g,' ').trim()));
console.log('conv rows',rows.length); rows.forEach(r=>console.log('  ',r));
await pg.screenshot({path:'/tmp/pw/conv.png',fullPage:false});
// search + switch game keeps cm
await pg.type('#gsearch','tarkov'); await pg.keyboard.press('Enter'); await new Promise(r=>setTimeout(r,200));
console.log('after switch:', await pg.evaluate(()=>({game:EZ.S.game,sens:EZ.S.sens,cm:document.querySelector('#stats').innerText.split('\n').slice(0,2).join(' ')})));
await pg.evaluate(()=>EZ.setGame('cs2')); await pg.evaluate(()=>{document.querySelector('#sens').value=1;document.querySelector('#sens').dispatchEvent(new Event('input'));});
// share roundtrip
console.log('share roundtrip', await pg.evaluate(()=>{const c=EZ.enc({dpi:1600,sens:0.5,game:'valorant',custom:[{id:'c_t',name:'Test',yaw:0.05}]}); EZ.applyShare(EZ.dec(c)); return [EZ.S.dpi,EZ.S.game,EZ.S.sens,EZ.S.custom.length];}));
await pg.evaluate(()=>EZ.applyShare({dpi:800,sens:1,game:'cs2'}));
// frame pacing
console.log('frame', await pg.evaluate(async()=>{ const hz=EZ.frame.hz; const sel=document.querySelector('#fps'); sel.value='60'; sel.dispatchEvent(new Event('change'));
  const n0=performance.now(); let c=0; const orig=EZ.frame.lastDraw; await new Promise(r=>setTimeout(r,1500)); return {hz,raw:EZ.rawEvt,cap60:EZ.capFps(),fpsText:document.querySelector('#hudFps').textContent}; }));
await pg.evaluate(()=>{const s=document.querySelector('#fps'); s.value='custom'; s.dispatchEvent(new Event('change')); const c=document.querySelector('#fpsCustom'); c.value=5000; c.dispatchEvent(new Event('input'));});
console.log('custom 5000 cap ->', await pg.evaluate(()=>EZ.capFps()), await pg.$eval('#perfInfo',e=>e.innerText));
await pg.evaluate(()=>{const s=document.querySelector('#fps'); s.value='auto'; s.dispatchEvent(new Event('change'));});
// low quality toggle recreates renderer
await pg.click('nav button[data-t=train]'); await pg.click('#lowq'); await new Promise(r=>setTimeout(r,300));
// flick sim
await pg.click('#startBtn');
const fl=await pg.evaluate(async()=>{ EZ.forceRun(); const dpc=0.022; for(let k=0;k<20&&EZ.state();k++){ const t=EZ.state().t;
  for(let i=0;i<60;i++){ const dy=((t.ty-EZ.view.yaw+540)%360)-180, dp=t.tp-EZ.view.pitch; EZ.simMove(-dy/dpc/2,-dp/dpc/2); await new Promise(r=>requestAnimationFrame(r)); if(Math.hypot(dy,dp)<0.2)break; }
  EZ.simShoot(); } return EZ.state()?'still running':'finished'; });
console.log('flick', fl, await pg.$eval('#lastRound',e=>e.innerText.replace(/\s+/g,' ')));
const ovFlick=await pg.$eval('#ov',e=>e.innerText.replace(/\s+/g,' '));
console.log('flick overlay', ovFlick);
if(!/Time-to-hit|First shot|Accuracy|NEW BEST|Best/.test(ovFlick)) throw new Error('flick results overlay missing recap stats: '+ovFlick);
await pg.screenshot({path:'/tmp/pw/train.png'});
// tracking must stay above the floor even with a strong downward velocity;
// off-screen hint must follow the target live as the view turns
await pg.click('#drills button[data-d=track]'); await pg.click('#startBtn');
const trackHint=await pg.evaluate(()=>{
  EZ.forceRun();
  const T=EZ.state().tr; T.pitch=-80; T.vp=-120; T.tp=-120;
  const ys=[]; for(let i=0;i<180;i++){ EZ.tick(16); ys.push(EZ.targetPos().y-EZ.targetRad()); }
  const minClear=Math.min(...ys);
  T.vy=0; T.vp=0; T.ty=0; T.tp=0; T.next=999; T.yaw=0; T.pitch=0;
  EZ.placeTarget(0,0,1.3);
  EZ.view.pitch=0;
  EZ.view.yaw=90; const right=EZ.hintSample()[0];
  EZ.view.yaw=70; const stillRight=EZ.hintSample()[0];
  EZ.view.yaw=-90; const left=EZ.hintSample()[0];
  EZ.view.yaw=0; const on=EZ.hintSample()[0];
  return {minClear,floor:EZ.FLOOR_Y,endPitch:EZ.state().tr.pitch,
    right:{alpha:right&&right.alpha,x:right&&right.x,ang:right&&right.ang},
    stillRight:{alpha:stillRight&&stillRight.alpha,x:stillRight&&stillRight.x,ang:stillRight&&stillRight.ang},
    left:{alpha:left&&left.alpha,x:left&&left.x,ang:left&&left.ang},
    onAlpha:on&&on.alpha, hintOn:EZ.S.hint};
});
console.log('track floor + hint', JSON.stringify(trackHint));
if(trackHint.minClear<trackHint.floor-1e-3) throw new Error('tracking target went through the floor: clearance '+trackHint.minClear);
if(!(trackHint.right.alpha>0.5 && trackHint.right.x>0)) throw new Error('hint should sit on the right edge when the target is 90° off to the right');
if(!(trackHint.stillRight.alpha>0.5 && trackHint.stillRight.x>0)) throw new Error('hint should keep pointing right as the view turns toward the target');
if(!(trackHint.left.alpha>0.5 && trackHint.left.x<0)) throw new Error('hint should move to the left edge when the view turns the other way');
if(!(trackHint.onAlpha<0.05)) throw new Error('hint should fade out when the target is on-screen');
// custom tab
// per-game crosshair editor: save, switch, restore, export/import, CSGO code
await pg.click('nav button[data-t=train]');
const xh=await pg.evaluate(()=>{
  const a={style:'t',color:'#ff3355',size:12,thick:3,gap:-1,outline:true,outlineW:2,dot:true,opacity:0.8,dynamic:true};
  EZ.saveXH(a);
  const code=EZ.xhCode();
  const cs2=JSON.parse(JSON.stringify(EZ.currentXH()));
  EZ.setGame('valorant');
  const after=JSON.parse(JSON.stringify(EZ.currentXH()));
  EZ.setGame('cs2');
  const back=JSON.parse(JSON.stringify(EZ.currentXH()));
  const rst=(()=>{ EZ.saveXH(EZMath.XH_DEF); return EZ.currentXH().style; })();
  EZ.setGame('cs2'); // still cs2
  const imp=EZ.importXH(code);
  const fromCs=EZ.importXH('CSGO-Cn37R-YE7vo-pLCAL-aURmZ-z6zkG');
  const skipNew=EZ.importXH('CSvbPubOq37zTGqtsPTP5QTrp5CB4xFXiKRLfzJsm49ZRe');
  return {code,cs2,after,back,rst,impOk:!!(imp&&imp.ok),fromCs:fromCs&&fromCs.xh,skipNew:skipNew&&skipNew.error,parts:document.querySelectorAll('#xh i').length,gameName:document.querySelector('[data-xh-game]')&&document.querySelector('[data-xh-game]').textContent};
});
console.log('xh profiles', JSON.stringify(xh));
if(xh.after.style==='t'&&xh.after.color==='#ff3355') throw new Error('valorant should start on the default profile, not inherit the CS2 edit');
if(!(xh.back.style==='t'&&xh.back.color==='#ff3355'&&xh.back.dynamic)) throw new Error('CS2 crosshair did not reload after switching back');
if(!xh.impOk) throw new Error('EZX import failed');
if(!(xh.fromCs&&xh.fromCs.style==='t'&&xh.fromCs.color==='#af51d5')) throw new Error('CSGO share code did not import');
if(xh.skipNew!=='cs2-new') throw new Error('new CS2 codes should be skipped, got '+xh.skipNew);
await pg.click('nav button[data-t=finder]'); await new Promise(r=>setTimeout(r,200));

const finderIdle=await pg.evaluate(()=>({ov:document.querySelector('#ov').innerText.replace(/\s+/g,' '), hud:document.querySelector('#ahud').classList.contains('show'), hudText:document.querySelector('#ahud').innerText.replace(/\s+/g,' ')}));
console.log('finder idle', finderIdle);
if(/Micro|Flick 1|on target|19\/20/.test(finderIdle.ov) || finderIdle.hud) throw new Error('finder tab leaked the previous drill HUD/overlay: '+JSON.stringify(finderIdle));
if(!/Sens Finder|Start finder/i.test(finderIdle.ov)) throw new Error('finder idle overlay should mention the finder: '+finderIdle.ov);
await pg.click('nav button[data-t=custom]'); await pg.type('#cname','My Game'); await pg.type('#cyaw','0.05');
await pg.click('#csave'); console.log('custom saved', await pg.$eval('#clist',e=>e.innerText.replace(/\s+/g,' ')));
await pg.click('nav button[data-t=about]'); console.log('about rows', await pg.$$eval('#yawTbl tr',r=>r.length));
await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); await pg.click('nav button[data-t=setup]'); await new Promise(r=>setTimeout(r,300));
await pg.screenshot({path:'/tmp/pw/mobile.png'});
console.log('blocked network requests:',net); console.log('errors:',errs); await b.close();})();
