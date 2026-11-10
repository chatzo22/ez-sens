const THREE = await import(URL.createObjectURL(new Blob([document.getElementById('three-src').textContent],{type:'text/javascript'})));
const M = window.EZMath;
const $ = s=>document.querySelector(s), $$ = s=>[...document.querySelectorAll(s)];
const LS='ezsens.v1';
const DEF={dpi:800,game:'cs2',sens:1,params:{},fav:['cs2','finals','arc'],custom:[],fps:'auto',fpsCustom:165,showFps:true,scale:'1',lowq:false,sound:true,afov:''};
const store = Object.assign({settings:{},history:[],finder:null}, JSON.parse(localStorage.getItem(LS)||'{}'));
const S = store.settings = Object.assign({},DEF,store.settings);
if(S.arcFov){ S.params.arc=Object.assign({fov:S.arcFov},S.params.arc); delete S.arcFov; }
M.setCustom(S.custom); if(!safeGet(S.game)) S.game='cs2';
function safeGet(id){ try{return M.get(id);}catch(e){return null;} }
const save=()=>localStorage.setItem(LS,JSON.stringify(store));
const fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
const fmtS=(g,v)=>!Number.isFinite(v)?'out of range':(g.round!=null?v.toFixed(g.round):(+v.toPrecision(4)).toString());
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TAGTXT={verified:'VERIFIED',consensus:'CONSENSUS',community:'COMMUNITY-MEASURED',disputed:'DISPUTED',custom:'CUSTOM'};
const tag=st=>`<span class="tag ${st}">${TAGTXT[st]}</span>`;
const P=id=>Object.assign(M.defaults(id),S.params[id]||{});
const isFav=id=>S.fav.includes(id);
const short=n=>n.replace('Counter-Strike 2','CS2').replace(/ \(.*\)/,'');

/* ---------- tabs ---------- */
$('#nav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  $$('#nav button').forEach(x=>x.classList.toggle('on',x===b));
  $$('section.tab').forEach(s=>s.classList.toggle('on',s.id==='t-'+b.dataset.t));
  if(b.dataset.t==='train')mountStage('#stageHost'); if(b.dataset.t==='finder')mountStage('#stageHost2');
  if(b.dataset.t==='results')renderHist(); refresh();});

/* ---------- game picker ---------- */
function sortedGames(q){ q=(q||'').toLowerCase().trim();
  return M.all().filter(g=>!q||(g.name+' '+(g.aka||'')).toLowerCase().includes(q))
    .sort((a,b)=>(isFav(b.id)-isFav(a.id))||(!!a.custom-!!b.custom)||0); }
function fillSelect(){ const q=$('#gsearch').value, gs=sortedGames(q); const cur=M.get(S.game);
  const fav=gs.filter(g=>isFav(g.id)), rest=gs.filter(g=>!isFav(g.id)&&!g.custom), cus=gs.filter(g=>!isFav(g.id)&&g.custom);
  const opt=g=>`<option value="${g.id}">${esc(g.name)}</option>`;
  let h=(fav.length?`<optgroup label="★ Favorites">${fav.map(opt).join('')}</optgroup>`:'')+(rest.length?`<optgroup label="Games">${rest.map(opt).join('')}</optgroup>`:'')+(cus.length?`<optgroup label="Custom">${cus.map(opt).join('')}</optgroup>`:'');
  if(!gs.find(g=>g.id===cur.id)) h=`<option value="${cur.id}">${esc(cur.name)}</option>`+h;
  $('#game').innerHTML=h; $('#game').value=S.game; }
$('#gsearch').addEventListener('input',()=>{ fillSelect(); const first=sortedGames($('#gsearch').value)[0]; });
$('#gsearch').addEventListener('keydown',e=>{ if(e.key==='Enter'){ const f=sortedGames($('#gsearch').value)[0]; if(f){ setGame(f.id); $('#gsearch').value=''; fillSelect(); } } });
$('#game').addEventListener('change',()=>setGame($('#game').value));
function setGame(id){ if(id===S.game)return; const cm=currentCm(); const old=S.game; S.game=id;
  // keep the same 360 distance when switching the "your game" selector
  if(Number.isFinite(cm)){ const s=M.menuRound(id,M.sensForCm(cm,S.dpi,id,P(id))); if(Number.isFinite(s)) S.sens=+(+s).toPrecision(5); }
  $('#sens').value=S.sens; save(); renderParams(); refresh(); }
$('#favBtn').onclick=()=>toggleFav(S.game);
function toggleFav(id){ S.fav=isFav(id)?S.fav.filter(x=>x!==id):S.fav.concat(id); save(); fillSelect(); refresh(); }
function renderParams(){ const g=M.get(S.game); const p=P(S.game);
  $('#params').innerHTML=(g.params||[]).map(x=>`<label>${esc(x.label)}</label><input data-pk="${x.k}" type="number" min="${x.min}" max="${x.max}" step="${x.step}" value="${p[x.k]}">`).join('');
  $('#unit').textContent=g.unit?`(${g.unit})`:''; $('#sens').step=g.round===0?1:0.01; }
$('#params').addEventListener('input',e=>{const k=e.target.dataset.pk;if(!k)return; S.params[S.game]=Object.assign(P(S.game),{[k]:+e.target.value}); save(); refresh();});
['#dpi','#sens'].forEach(id=>$(id).addEventListener('input',()=>{ S.dpi=+$('#dpi').value; S.sens=+$('#sens').value; save(); refresh(); }));
$('#tsearch').addEventListener('input',refresh); $('#favOnly').addEventListener('change',refresh);
$('#conv').addEventListener('click',e=>{const b=e.target.closest('.star');if(b)toggleFav(b.dataset.id);});
$('#conv').addEventListener('change',e=>{const i=e.target;if(!i.dataset.pg)return; S.params[i.dataset.pg]=Object.assign(P(i.dataset.pg),{[i.dataset.pk]:+i.value}); save(); refresh();});

function ok(){ return S.dpi>0&&S.sens>0&&Number.isFinite(currentCmRaw()); }
function currentCmRaw(){ try{return M.cm360(S.dpi,S.sens,S.game,P(S.game));}catch(e){return NaN;} }
function currentCm(){ return currentCmRaw(); }
function equiv(cm,g){ const exact=M.sensForCm(cm,S.dpi,g.id,P(g.id)); const r=M.menuRound(g.id,exact);
  return {g,exact,r,cmR:Number.isFinite(r)?M.cm360(S.dpi,r,g.id,P(g.id)):NaN}; }
function paramCell(g){ return (g.params||[]).map(x=>` <span class="small muted">@</span><input class="mini" data-pg="${g.id}" data-pk="${x.k}" type="number" min="${x.min}" max="${x.max}" step="${x.step}" value="${P(g.id)[x.k]}" title="${esc(x.label)}"> <span class="small muted">FOV</span>`).join(''); }
function refresh(){
  const good=ok(), cm=good?currentCm():NaN, g=M.get(S.game);
  const dpcv=good?M.dpc(S.game,S.sens,P(S.game)):NaN;
  $('#stats').innerHTML=[['cm / 360°',fmt(cm,1)],['inches / 360°',fmt(cm/2.54,1)],['eDPI',good?(+M.edpi(S.dpi,S.sens).toPrecision(5)).toLocaleString():'—'],['° per count',fmt(dpcv,5)],['counts / 360°',good?Math.round(M.countsPer360(cm,S.dpi)).toLocaleString():'—']]
    .map(([k,v])=>`<div class="card stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  $('#favBtn').classList.toggle('on',isFav(S.game)); $('#gnote').innerHTML=`${tag(g.status)} ${esc(g.note||'')}`;
  const q=$('#tsearch').value, fo=$('#favOnly').checked;
  $('#conv').innerHTML=good?sortedGames(q).filter(x=>!fo||isFav(x.id)||x.id===S.game).map(x=>{const e=equiv(cm,x),me=x.id===S.game;
    return `<tr class="${me?'me':''}"><td><button class="star ${isFav(x.id)?'on':''}" data-id="${x.id}" title="Favorite">★</button></td><td><b>${esc(x.name)}</b>${me?' <span class="muted small">(yours)</span>':''}</td><td><b style="color:var(--acc);font-size:18px">${me?S.sens:fmtS(x,e.r)}</b>${x.unit?' '+x.unit:''}</td><td>${Number.isFinite(e.exact)?(+e.exact.toPrecision(5)):'—'}</td><td>${fmt(me?cm:e.cmR,1)}</td><td class="small"><code>${esc(x.model)}</code>${paramCell(x)}</td><td>${tag(x.status)}</td></tr>`;}).join(''):'<tr><td colspan="7" class="muted">Enter a DPI and sensitivity.</td></tr>';
  $('#yawTbl').innerHTML=M.GAMES.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td><code>${esc(x.model)}</code></td><td>${tag(x.status)}</td><td class="small">${esc(x.note)}</td><td class="small">${x.src.map(k=>M.SOURCES[k]).filter(Boolean).map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join('<br>')}</td></tr>`).join('');
  const pick=[...new Set([S.game,...S.fav])].map(safeGet).filter(Boolean).slice(0,6);
  const info=good?`Arena turns at <b>${fmt(cm,1)} cm/360</b> = ${pick.map(x=>`${esc(short(x.name))} ${x.id===S.game?S.sens:fmtS(x,equiv(cm,x).r)}`).join(' · ')} @ ${S.dpi} DPI`:'Fill in the converter first.';
  $('#trainInfo').innerHTML=info; $('#finderInfo').innerHTML=info;
  $$('.cdpi').forEach(e=>e.textContent=S.dpi+' DPI'); $('#cpc').textContent=good?Math.round(M.countsPer360(cm,S.dpi)).toLocaleString():'—';
  renderCustomList(); calcCustom();
}

/* ---------- share / export ---------- */
const enc=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const dec=s=>JSON.parse(decodeURIComponent(escape(atob(s.trim().replace(/-/g,'+').replace(/_/g,'/')))));
const shareObj=()=>({v:1,dpi:S.dpi,game:S.game,sens:S.sens,params:S.params,fav:S.fav,custom:S.custom});
function applyShare(o){ if(!o||typeof o!=='object')throw new Error('bad code');
  ['dpi','sens'].forEach(k=>{if(+o[k]>0)S[k]=+o[k];});
  if(o.params&&typeof o.params==='object')S.params=o.params; if(Array.isArray(o.fav))S.fav=o.fav.map(String);
  if(Array.isArray(o.custom)){ const ids=new Set(S.custom.map(c=>c.id)); o.custom.forEach(c=>{ if(c&&c.id&&+c.yaw>0&&!ids.has(c.id)) S.custom.push({id:String(c.id),name:String(c.name||'Custom').slice(0,40),yaw:+c.yaw,how:String(c.how||'').slice(0,40)}); }); M.setCustom(S.custom); }
  if(o.game&&safeGet(o.game))S.game=o.game; save(); syncInputs(); }
async function copy(t,msg){ try{await navigator.clipboard.writeText(t);$('#shareMsg').textContent=msg;}catch(e){$('#code').value=t;$('#shareMsg').textContent='Copy it from the box above.';} }
$('#copyLink').onclick=()=>copy(location.href.split('#')[0]+'#cfg='+enc(shareObj()),'Link copied.');
$('#copyCode').onclick=()=>copy(enc(shareObj()),'Code copied.');
$('#importBtn').onclick=()=>{ try{ let t=$('#code').value; if(t.includes('#cfg='))t=t.split('#cfg=')[1]; applyShare(dec(t)); $('#shareMsg').textContent='Imported.'; }catch(e){ $('#shareMsg').textContent='That code could not be read.'; } };
let pendingShare=null;
if(location.hash.startsWith('#cfg=')){ try{ pendingShare=dec(location.hash.slice(5)); $('#shareBanner').classList.remove('hide'); }catch(e){} }
$('#shareLoad').onclick=()=>{ try{applyShare(pendingShare);}catch(e){} $('#shareBanner').classList.add('hide'); history.replaceState(null,'',location.pathname); };
$('#shareIgnore').onclick=()=>{ $('#shareBanner').classList.add('hide'); history.replaceState(null,'',location.pathname); };
function syncInputs(){ $('#dpi').value=S.dpi; $('#sens').value=S.sens; fillSelect(); renderParams(); refresh(); }

/* ---------- custom game / calibration ---------- */
let cmode='yaw', swipe={on:false,counts:0,done:false};
$('#cmode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cmode=b.dataset.m;
  $$('#cmode button').forEach(x=>x.classList.toggle('on',x===b)); $$('[data-mode]').forEach(d=>d.classList.toggle('hide',d.dataset.mode!==cmode)); calcCustom();});
['#cname','#cyaw','#rsens','#rturns','#rdist','#runit','#ssens','#sturns'].forEach(id=>$(id).addEventListener('input',calcCustom));
let cyawVal=NaN;
function calcCustom(){ let y=NaN,how='';
  if(cmode==='yaw'){ y=+$('#cyaw').value; how='entered'; }
  else if(cmode==='ruler'){ const d=+$('#rdist').value; if(d>0) y=M.yawFromRuler({sens:+$('#rsens').value,dpi:S.dpi,dist:d,unit:$('#runit').value,turns:+$('#rturns').value||1}); how='ruler, '+(+$('#rturns').value||1)+' turns'; }
  else { if(swipe.done&&swipe.counts) y=M.yawFromCounts({sens:+$('#ssens').value,counts:swipe.counts,turns:+$('#sturns').value||1}); how='counted, '+(+$('#sturns').value||1)+' turns'; }
  cyawVal=(y>0&&isFinite(y))?y:NaN;
  $('#cres').innerHTML=Number.isFinite(cyawVal)?`Yaw = <b>${(+cyawVal.toPrecision(6))}</b> °/count → at sens 1 and ${S.dpi} DPI that's ${fmt(M.K/(S.dpi*cyawVal),1)} cm/360. Same as CS2 ×${(+(cyawVal/0.022).toPrecision(4))}.`:'<span class="muted">Fill in the steps to calculate the yaw.</span>';
  $('#csave').disabled=!(Number.isFinite(cyawVal)&&$('#cname').value.trim()); $('#csave').dataset.how=how; }
$('#csave').onclick=()=>{ const name=$('#cname').value.trim().slice(0,40); if(!name||!Number.isFinite(cyawVal))return;
  S.custom.push({id:'c_'+Date.now().toString(36),name,yaw:+cyawVal.toPrecision(8),how:$('#csave').dataset.how}); M.setCustom(S.custom); save(); fillSelect(); refresh(); $('#cres').innerHTML=`Saved <b>${esc(name)}</b>. Pick it in the converter.`; };
function renderCustomList(){ $('#clist').innerHTML=S.custom.length?S.custom.map(c=>`<tr><td>${esc(c.name)}<div class="small muted">${esc(c.how||'')}</div></td><td><code>${c.yaw}</code></td><td>${fmt(M.K/(S.dpi*c.yaw),1)}</td><td><button class="btn alt sm" data-del="${c.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="4" class="muted">None yet.</td></tr>'; }
$('#clist').addEventListener('click',e=>{const id=e.target.dataset.del;if(!id)return; if(!confirm('Delete this custom game?'))return; S.custom=S.custom.filter(c=>c.id!==id); S.fav=S.fav.filter(x=>x!==id); if(S.game===id)S.game='cs2'; M.setCustom(S.custom); save(); syncInputs();});
const pad=$('#pad');
pad.addEventListener('mousedown',async e=>{ if(e.button!==0)return;
  if(!swipe.on){ swipe={on:true,counts:0,done:false}; await lockEl(pad); pad.classList.add('on'); padTxt(); }
  else { swipe.on=false; swipe.done=true; pad.classList.remove('on'); document.exitPointerLock(); padTxt(); calcCustom(); } });
function padTxt(){ pad.innerHTML=swipe.on?`Counting… <b style="font-size:28px">&nbsp;${Math.abs(swipe.counts)}</b>&nbsp; counts — click to stop`:(swipe.done?`Measured <b>&nbsp;${Math.abs(swipe.counts)}&nbsp;</b> counts (${(Math.abs(swipe.counts)/(+$('#sturns').value||1)).toFixed(0)} per 360°). Click to measure again.`:'Click to start counting'); }

/* ---------- 3D arena ---------- */
const stage=document.createElement('div'); stage.id='stage';
stage.innerHTML=`<div class="hud"><span id="hudL"></span><span id="hudR"></span></div><div id="hudFps"></div><div class="xh"><i></i></div><div class="overlay" id="ov"><div class="big">EZ Sens</div><div class="muted">Pick a drill and press Start.</div></div>`;
$('#stageHost').appendChild(stage);
function mountStage(sel){ $(sel).appendChild(stage); resize(); }
let renderer=null;
function makeRenderer(){ if(renderer){ renderer.dispose(); renderer.domElement.remove(); }
  const c=document.createElement('canvas'); const attrs={antialias:!S.lowq,alpha:false,powerPreference:'high-performance',desynchronized:true,preserveDrawingBuffer:false};
  const ctx=c.getContext('webgl2',attrs)||c.getContext('webgl',attrs);
  renderer=new THREE.WebGLRenderer({canvas:c,context:ctx,antialias:!S.lowq,powerPreference:'high-performance'}); stage.prepend(c);
  scene.fog=S.lowq?null:fog; resize(); }
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x070a0f); const fog=new THREE.Fog(0x070a0f,40,110);
const camera=new THREE.PerspectiveCamera(70,16/9,0.05,300); camera.rotation.order='YXZ';
scene.add(new THREE.HemisphereLight(0x9fb6ff,0x10151c,0.9));
const sun=new THREE.DirectionalLight(0xffffff,0.9); sun.position.set(10,30,5); scene.add(sun);
const floor=new THREE.Mesh(new THREE.CircleGeometry(90,64),new THREE.MeshStandardMaterial({color:0x0f141b,roughness:1}));
floor.rotation.x=-Math.PI/2; floor.position.y=-1.7; scene.add(floor);
const grid=new THREE.PolarGridHelper(90,36,18,64,0x1d2a3a,0x141c27); grid.position.y=-1.69; scene.add(grid);
for(let a=0;a<360;a+=10){const r=Math.PI*a/180, major=a%90===0;
  const p=new THREE.Mesh(new THREE.BoxGeometry(major?1.4:0.8,major?14:8+(a%30===0?3:0),major?1.4:0.8),
    new THREE.MeshStandardMaterial({color:major?0x2b3a55:0x18212e,emissive:major?0x0d1630:0x000000}));
  p.position.set(Math.sin(r)*48,(major?14:8)/2-1.7,-Math.cos(r)*48); scene.add(p);}
const tgtMat=new THREE.MeshStandardMaterial({color:0x36f1a6,emissive:0x0d6b47,roughness:.4});
const tgt=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),tgtMat); tgt.visible=false; scene.add(tgt);
const DIST=20;
function scaleRatio(){ return S.scale==='native'?Math.min(2,devicePixelRatio):(+S.scale||1)*(S.lowq?Math.min(1,devicePixelRatio):1); }
function resize(){ if(!renderer)return; const w=stage.clientWidth||960,h=stage.clientHeight||540; renderer.setPixelRatio(scaleRatio()); renderer.setSize(w,h,false); camera.aspect=w/h; setFov(); }
addEventListener('resize',resize); document.addEventListener('fullscreenchange',()=>setTimeout(resize,50));
function arenaHFov(){ if(+S.afov>=60)return +S.afov; const g=M.get(S.game); if(g.hfovFn)return g.hfovFn(P(g.id)); return g.hfov||103; }
function setFov(){const h=arenaHFov()*Math.PI/180; camera.fov=2*Math.atan(Math.tan(h/2)/camera.aspect)*180/Math.PI; camera.updateProjectionMatrix();}
const view={yaw:0,pitch:0};
const D2R=Math.PI/180;
function dirFrom(yaw,pitch){const y=yaw*D2R,p=pitch*D2R;return new THREE.Vector3(-Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p));}
const wrap=a=>((a+540)%360)-180;
function angErr(ty,tp){ const a=dirFrom(view.yaw,view.pitch),b=dirFrom(ty,tp); const ang=Math.acos(Math.min(1,a.dot(b)))/D2R;
  return {ang,dx:wrap(ty-view.yaw)*Math.cos(tp*D2R),dy:tp-view.pitch};}
function placeTarget(ty,tp,radDeg){const d=dirFrom(ty,tp).multiplyScalar(DIST); tgt.position.copy(d); tgt.scale.setScalar(DIST*Math.tan(radDeg*D2R)); tgt.visible=true;}

/* ---------- sound ---------- */
let actx=null;
function beep(f,dur,type='sine',vol=0.06){ if(!S.sound)return; try{ actx=actx||new AudioContext(); const o=actx.createOscillator(),g=actx.createGain(); o.type=type;o.frequency.value=f; g.gain.setValueAtTime(vol,actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime+dur);}catch(e){} }

/* ---------- input (raw, per-event, no smoothing) ---------- */
let degPerCount=0, rawOK=null, locked=null;
async function lockEl(el){ try{ await el.requestPointerLock({unadjustedMovement:true}); rawOK=true; }
  catch(e){ try{ await el.requestPointerLock(); }catch(_){} rawOK=false; } }
document.addEventListener('pointerlockchange',()=>{ locked=document.pointerLockElement;
  if(locked!==pad&&swipe.on){ swipe.on=false; swipe.done=true; pad.classList.remove('on'); padTxt(); calcCustom(); }
  if(locked!==stage&&R&&R.phase==='run'){R.phase='pause';showOv(`<div class="big">Paused</div><div class="muted">Click to resume · or press Start to restart</div>`);} });
function look(dx,dy){ if(!R||R.phase!=='run')return; view.yaw-=dx*degPerCount; view.pitch=Math.max(-89,Math.min(89,view.pitch-dy*degPerCount)); }
function onMove(e){ if(!locked)return; if(locked===stage) look(e.movementX,e.movementY); else if(locked===pad&&swipe.on){ swipe.counts+=e.movementX; padTxt(); } }
const RAW_EVT=('onpointerrawupdate' in window)?'pointerrawupdate':'mousemove';
document.addEventListener(RAW_EVT,onMove,{passive:true});
stage.addEventListener('mousedown',e=>{ if(e.button!==0)return;
  if(locked!==stage){ if(R&&(R.phase==='pause'||R.phase==='ready')){ lockEl(stage).then(()=>{ if(R.phase==='pause'){R.phase='run';hideOv();R.last=performance.now();} else beginCountdown(); }); } return; }
  shoot(); });
function showOv(h){const o=$('#ov');o.innerHTML=h;o.classList.remove('hide');} function hideOv(){$('#ov').classList.add('hide');}
$('#fsBtn').onclick=$('#fsBtn2').onclick=()=>stage.requestFullscreen&&stage.requestFullscreen();

/* ---------- frame pacing ---------- */
const F={hz:60,deltas:[],last:0,lastDraw:0,next:0,draws:[],ft:0};
function capFps(){ const t=S.fps==='auto'?Infinity:(S.fps==='custom'?+S.fpsCustom:+S.fps); return Math.min(t||Infinity,F.hz); }
function measure(now){ if(F.last){ const d=now-F.last; if(d>2&&d<100){ F.deltas.push(d); if(F.deltas.length>120)F.deltas.shift(); } } F.last=now;
  if(F.deltas.length>=20&&F.deltas.length%10===0){ const s=[...F.deltas].sort((a,b)=>a-b); F.hz=Math.round(1000/s[s.length>>1]); perfInfo(); } }
function shouldDraw(now){ const cap=capFps(); if(cap>=F.hz-0.5)return true; const iv=1000/cap;
  if(now<F.next-1)return false; F.next=Math.max(F.next+iv,now-iv/2); if(now-F.next>iv)F.next=now; return true; }
function perfInfo(){ const cap=capFps(); const want=S.fps==='custom'?+S.fpsCustom:+S.fps;
  $('#perfInfo').innerHTML=`Display ≈ <b>${F.hz} Hz</b> · cap ${S.fps==='auto'?'= display':Math.round(cap)+' fps'}${(S.fps!=='auto'&&want>F.hz)?` <span class="warn">(${want} is above your display's refresh rate, so it runs at ${F.hz})</span>`:''}<br>Input: ${RAW_EVT==='pointerrawupdate'?'pointerrawupdate (lowest latency)':'mousemove'} · raw ${rawOK===null?'(lock to check)':rawOK?'ON':'<span class="warn">OFF</span>'}`; }
function syncPerf(){ $('#fps').value=S.fps; $('#fpsCustom').value=S.fpsCustom; $('#fpsCustomWrap').classList.toggle('hide',S.fps!=='custom'); $('#scale').value=S.scale; $('#lowq').checked=S.lowq; $('#showFps').checked=S.showFps; $('#sound').checked=S.sound; $('#afov').value=S.afov; $('#hudFps').classList.toggle('hide',!S.showFps); perfInfo(); }
$('#fps').onchange=()=>{S.fps=$('#fps').value;F.next=0;save();syncPerf();};
$('#fpsCustom').oninput=()=>{S.fpsCustom=Math.max(20,+$('#fpsCustom').value||60);save();perfInfo();};
$('#scale').onchange=()=>{S.scale=$('#scale').value;save();resize();};
$('#lowq').onchange=()=>{S.lowq=$('#lowq').checked;save();makeRenderer();};
$('#showFps').onchange=()=>{S.showFps=$('#showFps').checked;save();syncPerf();};
$('#sound').onchange=()=>{S.sound=$('#sound').checked;save();};
$('#afov').oninput=()=>{S.afov=$('#afov').value;save();setFov();};

/* ---------- rounds ---------- */
let R=null;
const rnd=(a,b)=>a+Math.random()*(b-a);
const SEG={flick:{min:12,max:60,rad:1.5},micro:{min:2,max:8,rad:0.45}};
function newRound(segments,cm,onDone,label){
  degPerCount=M.degPerCountFromCm(cm,S.dpi); setFov();
  view.yaw=0;view.pitch=4;
  R={segments,si:0,cm,onDone,label,phase:'ready',fpsAcc:0,fpsN:0,st:{clicks:0,hits:0,ttk:[],land:[],over:0,under:0,on:0,trackT:0,lead:0,leadN:0,trOver:0,trUnder:0}};
  tgt.visible=false; $('#hudL').textContent=''; $('#hudR').textContent='';
  showOv(`<div class="big">${label}</div><div class="muted">Click here to lock your mouse and start</div><div class="small muted">Esc to pause</div>`);
}
function beginCountdown(){ R.phase='count'; let n=3; const tick=()=>{ if(!R||R.phase!=='count')return; if(n===0){hideOv();R.phase='run';R.last=performance.now();startSeg();beep(880,0.08);return;} showOv(`<div class="big">${n}</div>`); beep(440,0.06); n--; setTimeout(tick,450);}; tick(); }
function startSeg(){const s=R.segments[R.si]; s.done=0; s.t0=performance.now();
  if(s.type==='track'){R.tr={yaw:view.yaw-3,pitch:view.pitch,vy:0,vp:0,ty:0,tp:0,next:0,el:0}; placeTarget(R.tr.yaw,R.tr.pitch,1.3);} else spawn();}
function spawn(){const s=R.segments[R.si],c=SEG[s.type]; const mag=rnd(c.min,c.max),th=rnd(0,Math.PI*2);
  let ty=view.yaw+Math.cos(th)*mag, tp=view.pitch+Math.sin(th)*mag*0.55; tp=Math.max(-18,Math.min(32,tp));
  R.t={ty,tp,rad:c.rad,t0:performance.now(),landed:false,peak:0}; const e=angErr(ty,tp); R.t.d0=[e.dx,e.dy]; R.t.n0=Math.hypot(e.dx,e.dy)||1; placeTarget(ty,tp,c.rad);}
function along(){const e=angErr(R.t.ty,R.t.tp);return (e.dx*R.t.d0[0]+e.dy*R.t.d0[1])/R.t.n0;}
function recordLanding(){ if(R.t.landed)return; R.t.landed=true; const a=along(), e=angErr(R.t.ty,R.t.tp);
  const s=R.st; if(e.ang<=R.t.rad*1.15){s.land.push(0);} else if(a<0){s.over++;s.land.push(a/R.t.n0);} else {s.under++;s.land.push(a/R.t.n0);} }
function shoot(){ if(!R||R.phase!=='run')return; const s=R.segments[R.si]; if(s.type==='track')return;
  R.st.clicks++; const e=angErr(R.t.ty,R.t.tp);
  if(e.ang<=R.t.rad){ recordLanding(); R.st.hits++; R.st.ttk.push(performance.now()-R.t.t0); flash(); beep(1320,0.05,'triangle'); s.done++; if(s.done>=s.count) nextSeg(); else spawn(); }
  else { beep(180,0.05,'square',0.03); if(!R.t.landed) recordLanding(); } }
function flash(){tgtMat.emissive.setHex(0xffffff);setTimeout(()=>tgtMat.emissive.setHex(0x0d6b47),60);}
function nextSeg(){ R.si++; tgt.visible=false; if(R.si>=R.segments.length) return finish(); startSeg(); }
function step(now){ const dt=Math.min(0.05,(now-R.last)/1000); R.last=now; const s=R.segments[R.si]; if(!s)return;
  if(s.type==='track'){ const T=R.tr; T.el+=dt;
    if(T.el>=T.next){T.next=T.el+rnd(0.5,1.4); const sp=rnd(22,62), th=Math.random()<0.75?(Math.random()<0.5?0:Math.PI)+rnd(-0.35,0.35):rnd(0,Math.PI*2); T.ty=Math.cos(th)*sp; T.tp=Math.sin(th)*sp*0.5;}
    if(T.pitch>22)T.tp=-Math.abs(T.tp); if(T.pitch<-8)T.tp=Math.abs(T.tp);
    const k=1-Math.exp(-dt*6); T.vy+=(T.ty-T.vy)*k; T.vp+=(T.tp-T.vp)*k; T.yaw+=T.vy*dt; T.pitch+=T.vp*dt; placeTarget(T.yaw,T.pitch,1.3);
    if(T.el>0.6){ R.st.trackT+=dt; const e=angErr(T.yaw,T.pitch); if(e.ang<=1.3)R.st.on+=dt;
      const v=Math.hypot(T.vy,T.vp); if(v>8&&e.ang<6){ const lead=-(e.dx*T.vy+e.dy*T.vp)/v; R.st.lead+=lead;R.st.leadN++; if(e.ang>1.3){ if(lead>0)R.st.trOver+=dt; else R.st.trUnder+=dt; } } }
    if(T.el>=s.dur+0.6) nextSeg();
  } else { const t=R.t; const sp=R.lastV&&dt>0?Math.hypot(wrap(view.yaw-R.lastV[0]),view.pitch-R.lastV[1])/dt:0; t.peak=Math.max(t.peak,sp);
    const prog=1-along()/t.n0; if(!t.landed&&t.peak>Math.max(15,t.n0*1.5)&&sp<t.peak*0.2&&prog>0.4) recordLanding();
    if(now-t.t0>4000){ if(!t.landed)recordLanding(); R.st.ttk.push(4000); s.done++; if(s.done>=s.count) nextSeg(); else spawn(); } }
  if(R&&R.phase==='run'){R.lastV=[view.yaw,view.pitch]; hud();} }
function hud(){ const s=R.segments[R.si]; if(!s)return; const st=R.st;
  $('#hudL').textContent=s.type==='track'?`Tracking ${Math.max(0,s.dur+0.6-R.tr.el).toFixed(1)}s · on target ${st.trackT?Math.round(100*st.on/st.trackT):0}%`:`${s.type==='micro'?'Micro':'Flick'} ${s.done}/${s.count} · acc ${st.clicks?Math.round(100*st.hits/st.clicks):100}%`;
  $('#hudR').textContent=R.hideCm?R.label:`${fmt(R.cm,1)} cm/360${rawOK===false?' · raw input OFF':''}`; }
function scoreOf(st){
  const acc=st.clicks?st.hits/st.clicks:0, ttk=st.ttk.length?st.ttk.reduce((a,b)=>a+b,0)/st.ttk.length:NaN;
  const flick=st.ttk.length?Math.min(130,100*acc*500/Math.max(250,ttk)):null;
  const track=st.trackT?100*st.on/st.trackT:null;
  const parts=[flick,track].filter(x=>x!=null); const score=parts.reduce((a,b)=>a+b,0)/parts.length;
  const nl=st.over+st.under+st.land.filter(x=>x===0).length;
  const bF=nl?(st.over-st.under)/nl:null; const bT=st.leadN?Math.max(-1,Math.min(1,(st.lead/st.leadN)/1.3)):null;
  const bs=[bF,bT].filter(x=>x!=null); const bias=bs.length?bs.reduce((a,b)=>a+b,0)/bs.length:0;
  return {score,acc,ttk,flick,track,bias,over:st.over,under:st.under,trOver:st.trOver,trUnder:st.trUnder};
}
function finish(){ const res=Object.assign(scoreOf(R.st),{cm:R.cm,label:R.label,fps:R.fpsN?Math.round(1000/(R.fpsAcc/R.fpsN)):null}); R.phase='done'; tgt.visible=false; if(document.pointerLockElement===stage)document.exitPointerLock();
  beep(660,0.12); const cb=R.onDone; R=null; cb(res); }
function loop(now){ requestAnimationFrame(loop); measure(now);
  if(!shouldDraw(now))return;
  const ft=F.lastDraw?now-F.lastDraw:0; F.lastDraw=now; F.ft=F.ft?F.ft*0.9+ft*0.1:ft;
  if(R&&R.phase==='run'){ step(now); if(R){R.fpsAcc+=ft;R.fpsN++;} }
  camera.rotation.set(view.pitch*D2R,view.yaw*D2R,0); renderer.render(scene,camera);
  if(S.showFps&&(F.dc=(F.dc||0)+1)%8===0) $('#hudFps').textContent=`${F.ft?Math.round(1000/F.ft):0} fps · ${F.ft.toFixed(2)} ms · ${F.hz} Hz${capFps()<F.hz?' · cap '+Math.round(capFps()):''}`; }
const biasTxt=b=>Math.abs(b)<0.15?'balanced':(b>0?`overshoots (${Math.round(b*100)}%)`:`undershoots (${Math.round(-b*100)}%)`);

/* ---------- train ---------- */
let drill='flick';
$('#drills').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;drill=b.dataset.d;$$('#drills button').forEach(x=>x.classList.toggle('on',x===b));});
const DRILLS={flick:()=>[{type:'flick',count:20}],micro:()=>[{type:'micro',count:20}],track:()=>[{type:'track',dur:25}]};
$('#startBtn').onclick=()=>{ if(!ok())return alert('Fill in the converter first.'); mountStage('#stageHost');
  newRound(DRILLS[drill](),currentCm(),res=>{ addHist(drill,res); showRes(res); showOv(`<div class="big">${Math.round(res.score)}</div><div class="muted">score · ${biasTxt(res.bias)}</div><div class="small muted">Press Start to go again</div>`); },drill[0].toUpperCase()+drill.slice(1)); };
function showRes(r){ $('#lastRound').innerHTML=[['Score',Math.round(r.score)],['Accuracy',r.flick!=null?Math.round(r.acc*100)+'%':'—'],['Avg time-to-kill',Number.isFinite(r.ttk)?Math.round(r.ttk)+' ms':'—'],['On target',r.track!=null?Math.round(r.track)+'%':'—'],['Overshoot / undershoot',r.flick!=null?`${r.over} / ${r.under}`:`${r.trOver.toFixed(1)}s / ${r.trUnder.toFixed(1)}s`],['Tendency',biasTxt(r.bias)],['Avg FPS',r.fps||'—']]
  .map(([k,v])=>`<div class="card stat"><div class="k">${k}</div><div class="v" style="font-size:22px">${v}</div></div>`).join(''); }
function addHist(drill,r){ store.history.unshift({at:Date.now(),drill,cm:r.cm,score:r.score,acc:r.acc,ttk:r.ttk,over:r.over,under:r.under,bias:r.bias,fps:r.fps}); store.history=store.history.slice(0,200); save(); }
function renderHist(){ $('#hist').innerHTML=store.history.map(h=>`<tr><td>${new Date(h.at).toLocaleString()}</td><td>${h.drill}</td><td>${fmt(h.cm,1)}</td><td>${Math.round(h.score)}</td><td>${h.drill==='track'?'—':Math.round(h.acc*100)+'%'}</td><td>${Number.isFinite(h.ttk)?Math.round(h.ttk)+' ms':'—'}</td><td>${biasTxt(h.bias||0)}</td><td>${h.fps||'—'}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">No rounds yet.</td></tr>'; }
$('#clearBtn').onclick=()=>{ if(confirm('Clear all saved results?')){store.history=[];store.finder=null;save();renderHist();renderFinder();} };

/* ---------- finder ---------- */
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const FSEG=()=>[{type:'flick',count:10},{type:'track',dur:8}];
function recommend(results){
  const pts=results.map(r=>({x:Math.log(r.cm),y:r.score})); const xs=pts.map(p=>p.x);
  const lo=Math.min(...xs),hi=Math.max(...xs); let best=results.reduce((a,b)=>b.score>a.score?b:a); let x=Math.log(best.cm), fit=false;
  if(new Set(xs.map(v=>v.toFixed(4))).size>=3){
    const m=xs.reduce((a,b)=>a+b,0)/xs.length; const u=pts.map(p=>p.x-m);
    let A=[[0,0,0],[0,0,0],[0,0,0]],T=[0,0,0]; pts.forEach((p,i)=>{const v=[u[i]*u[i],u[i],1];for(let r=0;r<3;r++){T[r]+=v[r]*p.y;for(let c=0;c<3;c++)A[r][c]+=v[r]*v[c];}});
    const det=Q=>Q[0][0]*(Q[1][1]*Q[2][2]-Q[1][2]*Q[2][1])-Q[0][1]*(Q[1][0]*Q[2][2]-Q[1][2]*Q[2][0])+Q[0][2]*(Q[1][0]*Q[2][1]-Q[1][1]*Q[2][0]);
    const D=det(A); if(Math.abs(D)>1e-12){ const col=k=>A.map((row,r)=>row.map((v,c)=>c===k?T[r]:v)); const a=det(col(0))/D,b=det(col(1))/D;
      if(a<0){ x=Math.max(lo,Math.min(hi,m-b/(2*a))); fit=true; } } }
  const bias=results.reduce((s,r)=>s+(r.bias||0),0)/results.length; const adj=1+0.06*Math.max(-1,Math.min(1,bias));
  const scores=results.map(r=>r.score), spread=(Math.max(...scores)-Math.min(...scores))/Math.max(1,Math.max(...scores));
  return {cm:Math.exp(x)*adj,raw:Math.exp(x),bias,adj,fit,spread};
}
window.EZRecommend=recommend;
$('#finderBtn').onclick=()=>{ if(!ok())return alert('Fill in the converter first.'); mountStage('#stageHost2');
  const base=currentCm(); const plan=[{cm:base,warm:true},...shuffle([0.75,1,1.33]).map(m=>({cm:base*m}))]; const results=[]; let i=0;
  $('#finderOut').innerHTML='';
  const run=()=>{ const p=plan[i]; $('#fprog').style.width=(100*i/6)+'%';
    newRound(FSEG(),p.cm,res=>{ if(!p.warm)results.push(res); i++;
      if(i===4){ const best=results.reduce((a,b)=>b.score>a.score?b:a); shuffle([0.87,1.15]).forEach(m=>plan.push({cm:best.cm*m})); }
      if(i<plan.length){ setTimeout(run,0);} else done(); }, p.warm?'Warm-up':`Round ${i}/5`);
    R.hideCm=true; };
  const done=()=>{ $('#fprog').style.width='100%'; const rec=recommend(results); store.finder={at:Date.now(),dpi:S.dpi,base,rec,results:results.map(r=>({cm:r.cm,score:r.score,bias:r.bias}))}; save(); renderFinder(); showOv(`<div class="big">${fmt(rec.cm,1)} cm</div><div class="muted">recommended cm/360 — see below</div>`); };
  run(); };
function renderFinder(){ const f=store.finder; if(!f){$('#finderOut').innerHTML='';return;}
  const ids=[...new Set([S.game,...S.fav,'cs2','finals','arc'])]; const main=ids.map(safeGet).filter(Boolean), rest=M.all().filter(g=>!ids.includes(g.id));
  const row=g=>{const e=equiv(f.rec.cm,g); return `<tr><td>${esc(g.name)}</td><td><b style="color:var(--acc);font-size:18px">${fmtS(g,e.r)}</b>${g.unit?' '+g.unit:''}</td><td class="small muted">${fmt(e.cmR,1)} cm</td><td>${tag(g.status)}</td></tr>`;};
  $('#finderOut').innerHTML=`<div class="grid g2"><div class="card"><div class="k muted small">RECOMMENDED</div><div class="rec">${fmt(f.rec.cm,1)} cm/360</div>
   <div class="muted">${fmt(f.rec.cm/2.54,1)} in/360 · at ${f.dpi} DPI · you started at ${fmt(f.base,1)} cm</div>
   <p class="small">Tendency: <b>${biasTxt(f.rec.bias)}</b>${Math.abs(f.rec.adj-1)>0.005?` → adjusted ${f.rec.adj>1?'slower':'faster'} by ${Math.abs(Math.round((f.rec.adj-1)*100))}%`:''}. ${f.rec.fit?'Curve fit found a peak.':'No clear peak — best round used.'}${f.rec.spread<0.06?' <span class="warn">Scores were very close: your current sens is already fine within noise.</span>':''}</p>
   <div class="tw"><table>${main.map(row).join('')}</table></div>
   <details><summary class="small muted" style="cursor:pointer;margin-top:8px">All games</summary><div class="tw"><table>${rest.map(row).join('')}</table></div></details></div>
   <div class="card"><div class="k muted small">SCORE BY 360° DISTANCE</div><canvas id="chart" width="900" height="440"></canvas></div></div>`;
  drawChart(f); }
function drawChart(f){ const c=$('#chart'),x=c.getContext('2d'),W=c.width,H=c.height,Pd=50; const rs=[...f.results].sort((a,b)=>a.cm-b.cm);
  const cms=rs.map(r=>r.cm).concat(f.rec.cm),lo=Math.min(...cms)*0.95,hi=Math.max(...cms)*1.05,ys=rs.map(r=>r.score),ymax=Math.max(10,...ys)*1.15;
  const X=v=>Pd+(W-2*Pd)*(Math.log(v)-Math.log(lo))/(Math.log(hi)-Math.log(lo)),Y=v=>H-Pd-(H-2*Pd)*v/ymax;
  x.fillStyle='#18202c';x.fillRect(0,0,W,H);x.strokeStyle='#243042';x.lineWidth=2;x.strokeRect(Pd,Pd,W-2*Pd,H-2*Pd);
  x.fillStyle='#8a9bb0';x.font='22px system-ui';x.fillText('faster ← cm/360 → slower',W/2-120,H-12);
  x.strokeStyle='#36f1a6';x.setLineDash([8,8]);x.beginPath();x.moveTo(X(f.rec.cm),Pd);x.lineTo(X(f.rec.cm),H-Pd);x.stroke();x.setLineDash([]);
  x.strokeStyle='#7c8cff';x.beginPath();rs.forEach((r,i)=>i?x.lineTo(X(r.cm),Y(r.score)):x.moveTo(X(r.cm),Y(r.score)));x.stroke();
  rs.forEach(r=>{x.fillStyle='#7c8cff';x.beginPath();x.arc(X(r.cm),Y(r.score),8,0,7);x.fill();x.fillStyle='#e6edf5';x.fillText(r.cm.toFixed(1),X(r.cm)-20,Y(r.score)-16);}); }

/* test hooks for headless checks */
window.EZ={simMove:(dx,dy)=>look(dx,dy),simShoot:()=>shoot(),forceRun:()=>{if(R){R.phase='run';R.last=performance.now();hideOv();startSeg();}},state:()=>R,view,frame:F,capFps,rawEvt:RAW_EVT,setGame,applyShare,enc,dec,S};
makeRenderer(); syncInputs(); syncPerf(); renderHist(); renderFinder(); requestAnimationFrame(loop);
document.documentElement.dataset.ready='1';
