// Hook Practice panel: opens, casts a hook, registers a hit (and a minion block).
// Run: NODE_PATH=/tmp/pw/node_modules node test/hook.headless.js [file URL]
const p=require('puppeteer-core');
const URL_=process.argv[2]||'file://'+require('path').resolve(__dirname,'../index.html');
(async()=>{
  const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await b.newPage(); await pg.setViewport({width:1400,height:1000});
  const errs=[];
  pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
  pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
  await pg.setRequestInterception(true);
  pg.on('request',r=>{
    const u=r.url();
    if(u===URL_||u.startsWith('blob:')||u.startsWith('data:')||/^https:\/\/ddragon\.leagueoflegends\.com\//.test(u)) r.continue();
    else r.abort();
  });
  await pg.goto(URL_,{waitUntil:'load'});
  await pg.waitForFunction(()=>document.documentElement.dataset.ready==='1',{timeout:20000});
  const tab=await pg.$('nav button[data-t=hook]');
  if(!tab) throw new Error('Hook Practice tab missing');
  await tab.click();
  await new Promise(r=>setTimeout(r,400));
  const boot=await pg.evaluate(()=>{
    const on=document.querySelector('#nav button.on');
    const cv=document.querySelector('#hookCv');
    const disc=document.querySelector('.hook-disc');
    return {
      tab:on&&on.textContent,
      mode:EZ.mode(),
      canvas:!!(cv&&cv.getContext),
      cw:cv&&cv.width, ch:cv&&cv.height,
      champs:[...document.querySelectorAll('#hookChamps button')].map(b=>b.dataset.champ),
      ability:document.querySelector('#hookAbility')&&document.querySelector('#hookAbility').textContent,
      disc:disc&&disc.textContent.includes("isn't endorsed by Riot Games"),
      api:typeof EZ.startHook==='function' && typeof EZ.hookFireAt==='function'
    };
  });
  console.log('boot', JSON.stringify(boot));
  if(boot.tab!=='Hook Practice') throw new Error('tab not selected: '+boot.tab);
  if(boot.mode!=='hook') throw new Error('mode not hook: '+boot.mode);
  if(!boot.canvas||boot.cw<10) throw new Error('canvas missing');
  if(boot.champs.join()!=='Blitzcrank,Thresh,Nautilus,Pyke') throw new Error('champs '+boot.champs);
  if(!/Rocket Grab/.test(boot.ability||'')) throw new Error('ability text '+boot.ability);
  if(!boot.disc) throw new Error('Riot disclaimer missing');
  if(!boot.api) throw new Error('EZ hook API missing');

  // Stationary Jinx in front of Blitz; skip wind-up and step until the hook lands.
  const hit=await pg.evaluate(()=>{
    EZ.startHook('free');
    EZ.hookSetChamp('Blitzcrank');
    EZ.hookFreeze(true);
    EZ.hookPlace({clear:true, player:{x:700,y:220}, units:[{champ:'Jinx',role:'adc',x:700,y:900}]});
    const fired=EZ.hookFireAt(700,900,{skipCast:true});
    const c=EZMath.hookChamp('Blitzcrank');
    const dist=500, need=((dist/c.speed)+0.05)*1000;
    for(let t=0;t<need;t+=16) EZ.hookStep(16);
    const st=EZ.hookState();
    return {fired, casts:st.casts, hits:st.hits, misses:st.misses, blocked:st.blocked, hook:st.hook&&{alive:st.hook.alive,result:st.hook.result&&st.hook.result.kind}, phase:st.phase};
  });
  console.log('hit', JSON.stringify(hit));
  if(!hit.fired) throw new Error('hook did not fire');
  if(hit.hits!==1 || hit.casts!==1) throw new Error('expected 1 hit / 1 cast, got '+JSON.stringify(hit));

  // Minion standing in front of the champion should block.
  const blocked=await pg.evaluate(()=>{
    EZ.hookPlace({clear:true, player:{x:700,y:220}, units:[{champ:'Jinx',role:'adc',x:700,y:1100}], minions:[{x:700,y:700,r:36,team:'enemy'}]});
    EZ.hookFireAt(700,1100,{skipCast:true});
    const c=EZMath.hookChamp('Blitzcrank');
    const need=((800/c.speed)+0.1)*1000;
    for(let t=0;t<need;t+=16) EZ.hookStep(16);
    const st=EZ.hookState();
    return {casts:st.casts, hits:st.hits, blocked:st.blocked, last:st.hook&&st.hook.result&&st.hook.result.kind};
  });
  console.log('blocked', JSON.stringify(blocked));
  if(blocked.blocked<1) throw new Error('expected a minion block, got '+JSON.stringify(blocked));

  // Thresh Death Sentence is in the picker; switching works.
  const sw=await pg.evaluate(()=>{ EZ.hookSetChamp('Thresh'); return {champ:EZ.hookChamp(), text:document.querySelector('#hookAbility').textContent}; });
  console.log('switch', JSON.stringify(sw));
  if(sw.champ!=='Thresh' || !/Death Sentence/.test(sw.text)) throw new Error('champ switch failed');

  // Leave the tab so other tests are not stuck in hook mode.
  await pg.click('nav button[data-t=setup]');
  await new Promise(r=>setTimeout(r,200));
  const left=await pg.evaluate(()=>EZ.mode());
  console.log('left', left);
  if(left==='hook') throw new Error('still in hook mode after leaving tab');

  const realErrs=errs.filter(e=>!/Failed to load|net::ERR|ddragon/i.test(e));
  if(realErrs.length) throw new Error('page errors: '+realErrs.join(' | '));
  console.log('hook headless ok');
  await b.close();
})().catch(e=>{ console.error(e); process.exit(1); });
