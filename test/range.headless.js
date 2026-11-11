const p=require('puppeteer-core');
const URL_=process.argv[2]||'file:///workspace/out/ez-sens/index.html';
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage(); await pg.setViewport({width:1400,height:1000}); const errs=[],net=[];
pg.on('pageerror',e=>errs.push('pageerror: '+e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
await pg.setRequestInterception(true); pg.on('request',r=>{const u=r.url(); if(u.split('?')[0]===URL_.split('?')[0]||u.startsWith('blob:')||u.startsWith('data:'))r.continue(); else {net.push(u);r.abort();}});
await pg.goto(URL_,{waitUntil:'load'}); await pg.waitForFunction(()=>document.documentElement.dataset.ready==='1',{timeout:20000}); await new Promise(r=>setTimeout(r,800));
console.log('default tab:', await pg.$eval('#nav button.on',e=>e.textContent), '| mode', await pg.evaluate(()=>EZ.mode()), '| overlay:', await pg.$eval('#ov',e=>e.innerText.replace(/\s+/g,' ')), '| hud:', await pg.$eval('#rhud',e=>e.innerText.replace(/\s+/g,' ')));
await pg.click('#rpanel summary'); await new Promise(r=>setTimeout(r,200));
await pg.screenshot({path:'/tmp/pw/range0.png'});
const res=await pg.evaluate(async()=>{ EZ.rangeBegin(); const dpc=0.022; let hits=0;
  const aim=async(t)=>{ for(let i=0;i<80;i++){ const c=EZ.rangeCamPos(); const dx=t.x-c.x,dy=t.y-c.y,dz=t.z-c.z; const L=Math.hypot(dx,dy,dz);
      const ty=Math.atan2(-dx,-dz)*180/Math.PI, tp=Math.asin(dy/L)*180/Math.PI; const ey=((ty-EZ.rview.yaw+540)%360)-180, ep=tp-EZ.rview.pitch;
      if(Math.hypot(ey,ep)<0.03)break; EZ.simMove(-ey/dpc/2,-ep/dpc/2); await new Promise(r=>requestAnimationFrame(r)); } };
  for(let k=0;k<6;k++){ const t=EZ.rangeTargets()[0]; await aim(t); EZ.rangeShoot(); }
  EZ.simMove(300,0); EZ.rangeShoot(); EZ.simMove(-300,0); // deliberate miss, then face forward again
  const mid={pts:document.querySelector('#rPts').textContent,time:document.querySelector('#rTime').textContent,acc:document.querySelector('#rAcc').textContent};
  return mid; });
console.log('mid-run HUD', res);
await pg.screenshot({path:'/tmp/pw/range1.png'});
await pg.evaluate(()=>{EZ.range().remaining=50;}); await new Promise(r=>setTimeout(r,400));
console.log('after end:', await pg.$eval('#ov',e=>e.innerText.replace(/\s+/g,' ')), '| history', await pg.evaluate(()=>JSON.parse(localStorage.getItem('ezsens.v1')).rangeHistory.length));
// crosshair customizer + panel changes
await pg.select('#rpanelBody select[data-xh=style]','crossdot'); console.log('crosshair parts', await pg.$$eval('#xh i',e=>e.length), 'style', await pg.evaluate(()=>EZ.currentXH().style));
await pg.click('#rpanelBody input[data-r=moving]'); console.log('moving saved', await pg.evaluate(()=>EZ.S.range.moving));
await pg.evaluate(()=>EZ.rangeBegin()); const p0=await pg.evaluate(()=>EZ.rangeTargets()[0].x); await new Promise(r=>setTimeout(r,500)); const move=await pg.evaluate(()=>{ const ts=EZ.rangeTargets(); return {p1:ts[0].x, ys:ts.map(t=>t.y), minY:0.8, size:EZ.S.range.size}; });
console.log('moving target dx', (move.p1-p0).toFixed(3), 'ys', move.ys);
if(move.ys.some(y=>y<move.minY+move.size-1e-6)) throw new Error('range target went through the floor');
await pg.screenshot({path:'/tmp/pw/range2.png'});
// arena still fine
await pg.click('nav button[data-t=train]'); console.log('train mode', await pg.evaluate(()=>EZ.mode()), await pg.$eval('#ov',e=>e.innerText.replace(/\s+/g,' ')));
await pg.click('nav button[data-t=results]'); console.log('results range rows', await pg.$$eval('#rhist tr',r=>r.length));
console.log('blocked network:',net); console.log('errors:',errs); await b.close();})();
