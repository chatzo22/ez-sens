const THREE = await import(URL.createObjectURL(new Blob([document.getElementById('three-src').textContent],{type:'text/javascript'})));
const M = window.EZMath;
const $ = s=>document.querySelector(s), $$ = s=>[...document.querySelectorAll(s)];
const LS='ezsens.v1';
const DEF={range:{size:0.22,speed:1.2,count:3,moving:false,dur:60,viewmodel:true,xh:{style:'dot',color:'#ffffff',size:6,gap:3,outline:true}},xh:{style:'cross',color:'#36f1a6',size:8,thick:2,gap:2,outline:true,outlineW:1,dot:false,opacity:1,dynamic:false},xhs:{},dpi:800,game:'cs2',sens:1,params:{},fav:['cs2','finals','arc'],custom:[],fps:'auto',fpsCustom:165,showFps:true,scale:'1',lowq:false,sound:true,hint:true,env:'night',theme:'dark',flash:{preset:'val',diff:'normal',count:8,audio:true,tVol:0.4,reduced:false,warned:false,safe:90},afov:''};
const store = Object.assign({settings:{},history:[],finder:null}, JSON.parse(localStorage.getItem(LS)||'{}'));
const S = store.settings = Object.assign({},DEF,store.settings);
S.range=Object.assign({},DEF.range,S.range); S.range.xh=Object.assign({},DEF.range.xh,S.range.xh);
S.xhs=S.xhs&&typeof S.xhs==='object'?S.xhs:{}; S.xh=M.normXH(S.xh||DEF.xh);
if(!Object.keys(S.xhs).length){ S.xhs[S.game||'cs2']=M.normXH(S.xh.style?S.xh:S.range.xh); }
Object.keys(S.xhs).forEach(k=>S.xhs[k]=M.normXH(S.xhs[k]));
if(!S.xhs[S.game]) S.xhs[S.game]=M.normXH(S.xh); S.xh=S.xhs[S.game];
if(S.env!=='sunrise'&&S.env!=='day'&&S.env!=='night') S.env='night';
if(S.theme!=='light'&&S.theme!=='dark') S.theme='dark';
S.flash=Object.assign({},DEF.flash,S.flash||{});
if(S.flash.preset!=='cs2') S.flash.preset='val';
if(!['easy','normal','hard'].includes(S.flash.diff)) S.flash.diff='normal';
S.flash.count=Math.max(5,Math.min(15,+S.flash.count||8));
S.flash.tVol=Math.max(0,Math.min(1,S.flash.tVol==null?0.4:+S.flash.tVol));
store.rangeHistory=store.rangeHistory||[]; store.flashHistory=store.flashHistory||[];
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
  const tab=b.dataset.t, from=document.querySelector('#nav button.on'), fromT=from&&from.dataset.t;
  if(fromT&&fromT!==tab){ abandonArenaRound(); abandonFlash(); }
  $$('#nav button').forEach(x=>x.classList.toggle('on',x===b));
  $$('section.tab').forEach(s=>s.classList.toggle('on',s.id==='t-'+b.dataset.t));
  setMode(tab==='range'?'range':tab==='flash'?'flash':'arena', tab);
  if(tab==='range')mountStage('#stageHost0'); if(tab==='train')mountStage('#stageHost'); if(tab==='flash')mountStage('#stageHost3'); if(tab==='finder')mountStage('#stageHost2');
  if(tab==='results')renderHist(); refresh();});

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
  $('#sens').value=S.sens; loadGameXH(); save(); renderParams(); refresh(); }
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
  { const ri=$('#rangeInfo'); if(ri) ri.innerHTML=good?`<b>${fmt(cm,1)} cm/360</b> (${esc(short(g.name))} ${S.sens} @ ${S.dpi} DPI — change it in the Converter tab)`:'your converter settings'; }
  $('#trainInfo').innerHTML=info; $('#finderInfo').innerHTML=info; const fi=$('#flashInfo'); if(fi)fi.innerHTML=info;
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
stage.innerHTML=`<div id="ahud"><span><small id="hudK1">TARGETS</small><b id="hudV1">—</b></span><span><small id="hudK2">ACCURACY</small><b id="hudV2">—</b></span><span><small id="hudK3">BEST</small><b id="hudV3">—</b></span></div><div class="hud-cm" id="hudCm"></div><div id="hudFps"></div><canvas id="edgeHint"></canvas><div id="xh"></div><div id="hitFx"></div><div id="flashFx"></div><div id="rhud"><span><small>POINTS</small><b id="rPts">0</b></span><span><small>TIME</small><b id="rTime">01:00</b></span><span><small>ACCURACY</small><b id="rAcc">—</b></span></div><details class="rpanel" id="rpanel"><summary>⚙ Range settings</summary><div id="rpanelBody"></div></details><div class="overlay" id="ov"><div class="big">EZ Sens</div><div class="muted">Pick a drill and press Start.</div></div>`;
$('#stageHost0').appendChild(stage);
function mountStage(sel){ $(sel).appendChild(stage); resize(); }
let renderer=null;
function makeRenderer(){ if(renderer){ renderer.dispose(); renderer.domElement.remove(); }
  const c=document.createElement('canvas'); const attrs={antialias:!S.lowq,alpha:false,powerPreference:'high-performance',desynchronized:true,preserveDrawingBuffer:false};
  const ctx=c.getContext('webgl2',attrs)||c.getContext('webgl',attrs);
  renderer=new THREE.WebGLRenderer({canvas:c,context:ctx,antialias:!S.lowq,powerPreference:'high-performance'}); stage.prepend(c);
  scene.fog=S.lowq?null:fog; resize(); }
let MODE='range';
const scene=new THREE.Scene();
const fog=new THREE.Fog(0x070a0f,40,110);
const camera=new THREE.PerspectiveCamera(70,16/9,0.05,300); camera.rotation.order='YXZ';
const hemi=new THREE.HemisphereLight(0x9fb6ff,0x10151c,0.9); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,0.9); sun.position.set(10,30,5); scene.add(sun);
const floor=new THREE.Mesh(new THREE.CircleGeometry(90,64),new THREE.MeshStandardMaterial({color:0x0f141b,roughness:1}));
floor.rotation.x=-Math.PI/2; floor.position.y=-1.7; scene.add(floor);
let grid=null;
function makeGrid(c1,c2){ if(grid){ scene.remove(grid); grid.geometry.dispose(); const m=grid.material; if(Array.isArray(m))m.forEach(x=>x.dispose()); else if(m)m.dispose(); } grid=new THREE.PolarGridHelper(90,36,18,64,c1,c2); grid.position.y=-1.69; scene.add(grid); }
makeGrid(0x1d2a3a,0x141c27);
const pillars=[];
for(let a=0;a<360;a+=10){const r=Math.PI*a/180, major=a%90===0;
  const p=new THREE.Mesh(new THREE.BoxGeometry(major?1.4:0.8,major?14:8+(a%30===0?3:0),major?1.4:0.8),
    new THREE.MeshStandardMaterial({color:major?0x2b3a55:0x18212e,emissive:major?0x0d1630:0x000000}));
  p.position.set(Math.sin(r)*48,(major?14:8)/2-1.7,-Math.cos(r)*48); scene.add(p); pillars.push({mesh:p,major});}
const SKY_R=220;
const skyGeo=new THREE.SphereGeometry(SKY_R,48,24);
const skyMesh=new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false}));
scene.add(skyMesh);
function paintSky(top,mid,hor,down){
  const pos=skyGeo.attributes.position, c=new THREE.Color(), Ctop=new THREE.Color(top), Cmid=new THREE.Color(mid), Chor=new THREE.Color(hor), Cdown=new THREE.Color(down);
  let attr=skyGeo.attributes.color; if(!attr||attr.count!==pos.count){ attr=new THREE.BufferAttribute(new Float32Array(pos.count*3),3); skyGeo.setAttribute('color',attr); }
  const arr=attr.array;
  for(let i=0;i<pos.count;i++){
    const u=pos.getY(i)/SKY_R;
    if(u>=0.22) c.copy(Cmid).lerp(Ctop,(u-0.22)/0.78);
    else if(u>=0) c.copy(Chor).lerp(Cmid,u/0.22);
    else c.copy(Chor).lerp(Cdown,Math.min(1,-u));
    arr[i*3]=c.r; arr[i*3+1]=c.g; arr[i*3+2]=c.b;
  }
  attr.needsUpdate=true;
}
const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xfff2c0,fog:false,depthWrite:false}));
const sunHalo=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xffb060,transparent:true,opacity:0.28,fog:false,depthWrite:false,side:THREE.FrontSide}));
sunHalo.scale.setScalar(2.6); sunDisc.add(sunHalo); scene.add(sunDisc);
const ENV={
  night:{
    skyTop:0x070a0f,skyMid:0x0a1018,skyHor:0x10161f,skyDown:0x05070b,
    fog:0x070a0f,fogNear:40,fogFar:110,
    hemiSky:0x9fb6ff,hemiGround:0x10151c,hemi:0.9,
    sunCol:0xffffff,sunI:0.9,sunPos:[10,30,5],sunVis:false,sunScale:4,sunDisc:0xfff2c0,sunHalo:0x88a0ff,
    floor:0x0f141b,gridA:0x1d2a3a,gridB:0x141c27,
    pilMaj:0x2b3a55,pilMajEm:0x0d1630,pilMin:0x18212e,pilMinEm:0x000000,
    tgt:0x36f1a6,tgtEm:0x0d6b47,
    hint:{c0:[255,64,100],c1:[255,36,140],c2:[150,24,210],c3:[50,0,80],edge:[255,190,220]}
  },
  day:{
    skyTop:0x3a7ec8,skyMid:0x8ec4ee,skyHor:0xe4eef6,skyDown:0x8aa0b0,
    fog:0xc5d8ea,fogNear:70,fogFar:180,
    hemiSky:0xe8f2ff,hemiGround:0x6a7a88,hemi:1.45,
    sunCol:0xfff6e0,sunI:1.7,sunPos:[22,55,-70],sunVis:true,sunScale:5.5,sunDisc:0xfff8e0,sunHalo:0xffe8a8,
    floor:0x3a4552,gridA:0x5a6a7a,gridB:0x4a5562,
    pilMaj:0x5a6a7c,pilMajEm:0x1a2430,pilMin:0x4a5560,pilMinEm:0x000000,
    tgt:0x12e878,tgtEm:0x0a8a40,
    hint:{c0:[255,40,60],c1:[255,24,80],c2:[200,16,48],c3:[80,0,16],edge:[255,210,210]}
  },
  sunrise:{
    skyTop:0x1a2868,skyMid:0xe8789a,skyHor:0xff9a4a,skyDown:0x6a3a28,
    fog:0xe8a078,fogNear:55,fogFar:150,
    hemiSky:0xffc8a8,hemiGround:0x3a2818,hemi:1.15,
    sunCol:0xffb060,sunI:1.55,sunPos:[16,12,-80],sunVis:true,sunScale:8,sunDisc:0xffe0a0,sunHalo:0xff8a4a,
    floor:0x2a221c,gridA:0x5a4038,gridB:0x3a2e28,
    pilMaj:0x5a4038,pilMajEm:0x2a1810,pilMin:0x3a2e28,pilMinEm:0x100804,
    tgt:0x2affc8,tgtEm:0x0a7a58,
    hint:{c0:[255,80,160],c1:[200,40,200],c2:[120,30,220],c3:[40,0,80],edge:[255,180,230]}
  }
};
let tgtEmHex=0x0d6b47, hintPal=ENV.night.hint;
function applyEnv(id){
  const e=ENV[id]||ENV.night;
  paintSky(e.skyTop,e.skyMid,e.skyHor,e.skyDown);
  scene.background=new THREE.Color(e.fog);
  fog.color.setHex(e.fog); fog.near=e.fogNear; fog.far=e.fogFar;
  if(!S.lowq) scene.fog=fog;
  hemi.color.setHex(e.hemiSky); hemi.groundColor.setHex(e.hemiGround); hemi.intensity=e.hemi;
  sun.color.setHex(e.sunCol); sun.intensity=e.sunI; sun.position.set(e.sunPos[0],e.sunPos[1],e.sunPos[2]);
  sunDisc.visible=!!e.sunVis; sunHalo.visible=!!e.sunVis;
  if(e.sunVis){
    sunDisc.position.copy(sun.position).setLength(180);
    sunDisc.scale.setScalar(e.sunScale);
    sunDisc.material.color.setHex(e.sunDisc);
    sunHalo.material.color.setHex(e.sunHalo);
  }
  floor.material.color.setHex(e.floor);
  makeGrid(e.gridA,e.gridB);
  pillars.forEach(p=>{ p.mesh.material.color.setHex(p.major?e.pilMaj:e.pilMin); p.mesh.material.emissive.setHex(p.major?e.pilMajEm:e.pilMinEm); });
  tgtMat.color.setHex(e.tgt); tgtMat.emissive.setHex(e.tgtEm); tgtEmHex=e.tgtEm; hintPal=e.hint;
}
function setEnv(id){ if(!ENV[id]) id='night'; S.env=id; save(); applyEnv(id); syncEnvUI(); }
function syncEnvUI(){ $$('[data-envseg] button[data-env]').forEach(b=>b.classList.toggle('on',b.dataset.env===S.env)); }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-envseg] button[data-env]'); if(!b)return; setEnv(b.dataset.env); });
function applyTheme(id){ document.documentElement.dataset.theme=id==='light'?'light':'dark'; }
function setTheme(id){ S.theme=id==='light'?'light':'dark'; save(); applyTheme(S.theme); syncThemeUI(); const f=store.finder; if(f) drawChart(f); }
function syncThemeUI(){ $$('[data-themeseg] button[data-theme]').forEach(b=>b.classList.toggle('on',b.dataset.theme===S.theme)); }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-themeseg] button[data-theme]'); if(!b)return; setTheme(b.dataset.theme); });
const tgtMat=new THREE.MeshStandardMaterial({color:0x36f1a6,emissive:0x0d6b47,roughness:.4});
const tgt=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),tgtMat); tgt.visible=false; scene.add(tgt);
const DIST=M.ARENA.dist, FLOOR_Y=M.ARENA.floorY, CEIL_Y=M.ARENA.ceilY;
function scaleRatio(){ return S.scale==='native'?Math.min(2,devicePixelRatio):(+S.scale||1)*(S.lowq?Math.min(1,devicePixelRatio):1); }
function resize(){ if(!renderer)return; const w=stage.clientWidth||960,h=stage.clientHeight||540; renderer.setPixelRatio(scaleRatio()); renderer.setSize(w,h,false); camera.aspect=w/h; setFov(); if(typeof rangeCam!=='undefined'){rangeCam.aspect=w/h; setRangeFov();} const hc=$('#edgeHint'); if(hc){ hc.width=w; hc.height=h; } }
addEventListener('resize',resize); document.addEventListener('fullscreenchange',()=>setTimeout(resize,50));
function arenaHFov(){ if(+S.afov>=60)return +S.afov; const g=M.get(S.game); if(g.hfovFn)return g.hfovFn(P(g.id)); return g.hfov||103; }
function setFov(){const h=arenaHFov()*Math.PI/180; camera.fov=2*Math.atan(Math.tan(h/2)/camera.aspect)*180/Math.PI; camera.updateProjectionMatrix();}
const view={yaw:0,pitch:0};
const D2R=Math.PI/180;
function dirFrom(yaw,pitch){const y=yaw*D2R,p=pitch*D2R;return new THREE.Vector3(-Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p));}
const wrap=a=>((a+540)%360)-180;
function angErr(ty,tp){ const a=dirFrom(view.yaw,view.pitch),b=dirFrom(ty,tp); const ang=Math.acos(Math.min(1,a.dot(b)))/D2R;
  return {ang,dx:wrap(ty-view.yaw)*Math.cos(tp*D2R),dy:tp-view.pitch};}
function placeTarget(ty,tp,radDeg){ tp=M.clampPitch(tp,DIST,radDeg,FLOOR_Y,CEIL_Y); const d=dirFrom(ty,tp).multiplyScalar(DIST); tgt.position.copy(d); tgt.scale.setScalar(M.targetRadius(DIST,radDeg)); tgt.visible=true; return tp;}

/* ---------- sound ---------- */
let actx=null;
function beep(f,dur,type='sine',vol=0.06){ if(!S.sound)return; try{ actx=actx||new AudioContext(); const o=actx.createOscillator(),g=actx.createGain(); o.type=type;o.frequency.value=f; g.gain.setValueAtTime(vol,actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime+dur);}catch(e){} }

/* ---------- input (raw, per-event, no smoothing) ---------- */
let degPerCount=0, rawOK=null, locked=null;
async function lockEl(el){ try{ await el.requestPointerLock({unadjustedMovement:true}); rawOK=true; }
  catch(e){ try{ await el.requestPointerLock(); }catch(_){} rawOK=false; } }
document.addEventListener('pointerlockchange',()=>{ locked=document.pointerLockElement; stage.classList.toggle('locked',locked===stage);
  if(locked!==stage&&RG&&RG.phase==='run'){ RG.phase='pause'; rangeOverlay(); }
  if(locked!==pad&&swipe.on){ swipe.on=false; swipe.done=true; pad.classList.remove('on'); padTxt(); calcCustom(); }
  if(locked!==stage&&R&&R.phase==='run'){R.phase='pause';showOv(`<div class="big">Paused</div><div class="muted">Click to resume · or press Start to restart</div>`);}
  if(locked!==stage&&FL&&FL.phase==='run'){FL.phase='pause';showOv(`<div class="big">Paused</div><div class="muted">Click to resume · or press Start to restart</div>`);} });
function look(dx,dy){ if(MODE==='range'){ if(RG&&RG.phase==='run'){ rview.yaw-=dx*degPerCountRange(); rview.pitch=Math.max(-89,Math.min(89,rview.pitch-dy*degPerCountRange())); } return; } if(!((R&&R.phase==='run')||(FL&&FL.phase==='run')))return; view.yaw-=dx*degPerCount; view.pitch=Math.max(-89,Math.min(89,view.pitch-dy*degPerCount)); }
function onMove(e){ if(!locked)return; if(locked===stage) look(e.movementX,e.movementY); else if(locked===pad&&swipe.on){ swipe.counts+=e.movementX; padTxt(); } }
const RAW_EVT=('onpointerrawupdate' in window)?'pointerrawupdate':'mousemove';
document.addEventListener(RAW_EVT,onMove,{passive:true});
stage.addEventListener('mousedown',e=>{ if(e.button!==0)return;
  if(MODE==='range'){ if(e.target.closest('.rpanel'))return; if(locked!==stage){ if(!ok())return alert('Fill in the converter first.'); lockEl(stage).then(()=>{ if(document.pointerLockElement===stage)rangeBeginOrResume(); }); } else rangeShoot(); return; }
  if(MODE==='flash'){ if(locked!==stage){ if(!ok())return alert('Fill in the converter first.'); if(FL&&(FL.phase==='pause'||FL.phase==='ready')) lockEl(stage).then(()=>{ if(document.pointerLockElement!==stage)return; if(FL.phase==='pause'){FL.phase='run';hideOv();FL.last=performance.now();} else flashCountdown(); }); } return; }
  if(locked!==stage){ if(R&&(R.phase==='pause'||R.phase==='ready')){ lockEl(stage).then(()=>{ if(R.phase==='pause'){R.phase='run';hideOv();R.last=performance.now();} else beginCountdown(); }); } return; }
  shoot(); });
function showOv(h){const o=$('#ov');o.innerHTML=h;o.classList.remove('hide');} function hideOv(){$('#ov').classList.add('hide');}
$('#fsBtn').onclick=$('#fsBtn2').onclick=$('#fsBtn3').onclick=$('#fsBtn4').onclick=()=>stage.requestFullscreen&&stage.requestFullscreen();

/* ---------- frame pacing ---------- */
const F={hz:60,deltas:[],last:0,lastDraw:0,next:0,draws:[],ft:0};
function capFps(){ const t=S.fps==='auto'?Infinity:(S.fps==='custom'?+S.fpsCustom:+S.fps); return Math.min(t||Infinity,F.hz); }
function measure(now){ if(F.last){ const d=now-F.last; if(d>0.2&&d<100){ F.deltas.push(d); if(F.deltas.length>120)F.deltas.shift(); } } F.last=now;
  if(F.deltas.length>=20&&F.deltas.length%10===0){ const s=[...F.deltas].sort((a,b)=>a-b); F.hz=Math.round(1000/s[s.length>>1]); perfInfo(); } }
function shouldDraw(now){ const cap=capFps(); if(cap>=F.hz-0.5)return true; const iv=1000/cap;
  if(now<F.next-1)return false; F.next=Math.max(F.next+iv,now-iv/2); if(now-F.next>iv)F.next=now; return true; }
const DESK={on:!!window.ezsensDesktop,unlock:false};
function perfInfo(){ const cap=capFps(); const want=S.fps==='custom'?+S.fpsCustom:+S.fps;
  $('#perfInfo').innerHTML=`${DESK.unlock?'<b>Desktop app · FPS unlocked</b> — max render rate ≈ <b>'+F.hz+' fps</b>':'Display ≈ <b>'+F.hz+' Hz</b>'} · cap ${S.fps==='auto'?'= display':Math.round(cap)+' fps'}${(S.fps!=='auto'&&want>F.hz)?` <span class="warn">(${want} is above ${DESK.unlock?'what your PC can render':'your display\'s refresh rate'}, so it runs at ${F.hz}${DESK.on&&!DESK.unlock?' — turn on Unlock FPS to go higher':''})</span>`:''}<br>Input: ${RAW_EVT==='pointerrawupdate'?'pointerrawupdate (lowest latency)':'mousemove'} · raw ${rawOK===null?'(lock to check)':rawOK?'ON':'<span class="warn">OFF</span>'}`; }
function syncPerf(){ $('#fps').value=S.fps; $('#fpsCustom').value=S.fpsCustom; $('#fpsCustomWrap').classList.toggle('hide',S.fps!=='custom'); $('#scale').value=S.scale; $('#lowq').checked=S.lowq; $('#showFps').checked=S.showFps; $('#sound').checked=S.sound; const ho=$('#hintOpt'); if(ho)ho.checked=!!S.hint; $('#afov').value=S.afov; $('#hudFps').classList.toggle('hide',!S.showFps);
  syncXHEditors(); drawCurrentXH(); perfInfo(); }
if(DESK.on){ const w=document.createElement('label'); w.className='inl'; w.innerHTML='<input type="checkbox" id="unlockFps"> Unlock FPS (app restart)'; $('#lowq').closest('div').appendChild(w);
  window.ezsensDesktop.get().then(c=>{ DESK.unlock=!!c.unlockFps; $('#unlockFps').checked=DESK.unlock; perfInfo(); });
  $('#unlockFps').onchange=()=>window.ezsensDesktop.setUnlock($('#unlockFps').checked);
  document.addEventListener('keydown',e=>{ if(e.key==='F11'){ e.preventDefault(); window.ezsensDesktop.toggleFullscreen(); } }); }
$('#fps').onchange=()=>{S.fps=$('#fps').value;F.next=0;save();syncPerf();};
$('#fpsCustom').oninput=()=>{S.fpsCustom=Math.max(20,+$('#fpsCustom').value||60);save();perfInfo();};
$('#scale').onchange=()=>{S.scale=$('#scale').value;save();resize();};
$('#lowq').onchange=()=>{S.lowq=$('#lowq').checked;save();makeRenderer();};
$('#showFps').onchange=()=>{S.showFps=$('#showFps').checked;save();syncPerf();};
$('#sound').onchange=()=>{S.sound=$('#sound').checked;save();};
$('#hintOpt').onchange=()=>{S.hint=$('#hintOpt').checked;save(); if(!S.hint)clearHint();};
$('#afov').oninput=()=>{S.afov=$('#afov').value;save();setFov();};

/* ---------- rounds ---------- */
let R=null;
const rnd=(a,b)=>a+Math.random()*(b-a);
const SEG={flick:{min:12,max:60,rad:1.5},micro:{min:2,max:8,rad:0.45}};
function newRound(segments,cm,onDone,label){
  degPerCount=M.degPerCountFromCm(cm,S.dpi); setFov();
  view.yaw=0;view.pitch=4;
  R={segments,si:0,cm,onDone,label,phase:'ready',fpsAcc:0,fpsN:0,st:{clicks:0,hits:0,ttk:[],land:[],over:0,under:0,on:0,trackT:0,lead:0,leadN:0,trOver:0,trUnder:0,react:[]}};
  tgt.visible=false; clearHud();
  showOv(`<div class="big">${label}</div><div class="muted">Click here to lock your mouse and start</div><div class="small muted">Esc to pause</div>`);
}
function beginCountdown(){ R.phase='count'; let n=3; const tick=()=>{ if(!R||R.phase!=='count')return; if(n===0){hideOv();R.phase='run';R.last=performance.now();startSeg();beep(880,0.08);return;} showOv(`<div class="big">${n}</div>`); beep(440,0.06); n--; setTimeout(tick,450);}; tick(); }
function startSeg(){const s=R.segments[R.si]; s.done=0; s.t0=performance.now();
  if(s.type==='track'){ const p0=M.clampPitch(view.pitch,DIST,1.3,FLOOR_Y,CEIL_Y); R.tr={yaw:view.yaw-3,pitch:p0,vy:0,vp:0,ty:0,tp:0,next:0,el:0}; placeTarget(R.tr.yaw,R.tr.pitch,1.3);} else spawn();}
function spawn(){const s=R.segments[R.si],c=SEG[s.type]; const mag=rnd(c.min,c.max),th=rnd(0,Math.PI*2);
  let ty=view.yaw+Math.cos(th)*mag, tp=view.pitch+Math.sin(th)*mag*0.55;
  tp=M.clampPitch(tp,DIST,c.rad,FLOOR_Y,CEIL_Y);
  R.t={ty,tp,rad:c.rad,t0:performance.now(),landed:false,peak:0}; const e=angErr(ty,tp); R.t.d0=[e.dx,e.dy]; R.t.n0=Math.hypot(e.dx,e.dy)||1; placeTarget(ty,tp,c.rad);}
function along(){const e=angErr(R.t.ty,R.t.tp);return (e.dx*R.t.d0[0]+e.dy*R.t.d0[1])/R.t.n0;}
function recordLanding(){ if(R.t.landed)return; R.t.landed=true; const a=along(), e=angErr(R.t.ty,R.t.tp);
  const s=R.st; if(e.ang<=R.t.rad*1.15){s.land.push(0);} else if(a<0){s.over++;s.land.push(a/R.t.n0);} else {s.under++;s.land.push(a/R.t.n0);} }
function shoot(){ if(!R||R.phase!=='run')return; const s=R.segments[R.si]; if(s.type==='track')return;
  if(!R.t.shot){ R.t.shot=true; R.st.react.push(performance.now()-R.t.t0); }
  R.st.clicks++; const e=angErr(R.t.ty,R.t.tp);
  if(e.ang<=R.t.rad){ recordLanding(); R.st.hits++; R.st.ttk.push(performance.now()-R.t.t0); flash(); hitFx('hit'); beep(1320,0.05,'triangle'); s.done++; if(s.done>=s.count) nextSeg(); else spawn(); }
  else { hitFx('miss'); beep(180,0.05,'square',0.03); if(!R.t.landed) recordLanding(); } }
function flash(){tgtMat.emissive.setHex(0xffffff);setTimeout(()=>tgtMat.emissive.setHex(tgtEmHex),60);}
function nextSeg(){ R.si++; tgt.visible=false; if(R.si>=R.segments.length) return finish(); startSeg(); }
function step(now){ const dt=Math.min(0.05,(now-R.last)/1000); R.last=now; const s=R.segments[R.si]; if(!s)return;
  if(s.type==='track'){ const T=R.tr; T.el+=dt;
    if(T.el>=T.next){T.next=T.el+rnd(0.5,1.4); const sp=rnd(22,62), th=Math.random()<0.75?(Math.random()<0.5?0:Math.PI)+rnd(-0.35,0.35):rnd(0,Math.PI*2); T.ty=Math.cos(th)*sp; T.tp=Math.sin(th)*sp*0.5;}
    const k=1-Math.exp(-dt*6); T.vy+=(T.ty-T.vy)*k; T.vp+=(T.tp-T.vp)*k; T.yaw+=T.vy*dt; T.pitch+=T.vp*dt;
    const b=M.bouncePitch(T.pitch,T.vp,DIST,1.3,FLOOR_Y,CEIL_Y); T.pitch=b.pitch; T.vp=b.vp;
    if(T.pitch<=b.lim.min+0.15) T.tp=Math.abs(T.tp); if(T.pitch>=b.lim.max-0.15) T.tp=-Math.abs(T.tp);
    placeTarget(T.yaw,T.pitch,1.3);
    if(T.el>0.6){ R.st.trackT+=dt; const e=angErr(T.yaw,T.pitch); if(e.ang<=1.3)R.st.on+=dt;
      const v=Math.hypot(T.vy,T.vp); if(v>8&&e.ang<6){ const lead=-(e.dx*T.vy+e.dy*T.vp)/v; R.st.lead+=lead;R.st.leadN++; if(e.ang>1.3){ if(lead>0)R.st.trOver+=dt; else R.st.trUnder+=dt; } } }
    if(T.el>=s.dur+0.6) nextSeg();
  } else { const t=R.t; const sp=R.lastV&&dt>0?Math.hypot(wrap(view.yaw-R.lastV[0]),view.pitch-R.lastV[1])/dt:0; t.peak=Math.max(t.peak,sp);
    const prog=1-along()/t.n0; if(!t.landed&&t.peak>Math.max(15,t.n0*1.5)&&sp<t.peak*0.2&&prog>0.4) recordLanding();
    if(now-t.t0>4000){ if(!t.landed)recordLanding(); R.st.ttk.push(4000); s.done++; if(s.done>=s.count) nextSeg(); else spawn(); } }
  if(R&&R.phase==='run'){R.lastV=[view.yaw,view.pitch]; hud();} }
function hud(){ const s=R.segments[R.si]; if(!s)return; const st=R.st;
  const bar=$('#ahud'); if(bar)bar.classList.add('show');
  if(s.type==='track'){
    $('#hudK1').textContent='TIME'; $('#hudV1').textContent=Math.max(0,s.dur+0.6-R.tr.el).toFixed(1)+'s';
    $('#hudK2').textContent='ON TARGET'; $('#hudV2').textContent=st.trackT?Math.round(100*st.on/st.trackT)+'%':'—';
  } else {
    $('#hudK1').textContent=s.type==='micro'?'MICRO':'TARGETS'; $('#hudV1').textContent=s.done+'/'+s.count;
    $('#hudK2').textContent='ACCURACY'; $('#hudV2').textContent=st.clicks?Math.round(100*st.hits/st.clicks)+'%':'—';
  }
  const best=bestOf(R.label==='Warm-up'||R.hideCm?null: (s.type==='micro'?'micro':s.type==='track'?'track':'flick'));
  $('#hudK3').textContent='BEST'; $('#hudV3').textContent=best?Math.round(best):'—';
  const cm=$('#hudCm'); if(cm) cm.textContent=R.hideCm?R.label:`${fmt(R.cm,1)} cm/360${rawOK===false?' · raw input OFF':''}`; }
function scoreOf(st){
  const acc=st.clicks?st.hits/st.clicks:0, ttk=st.ttk.length?st.ttk.reduce((a,b)=>a+b,0)/st.ttk.length:NaN;
  const flick=st.ttk.length?Math.min(130,100*acc*500/Math.max(250,ttk)):null;
  const track=st.trackT?100*st.on/st.trackT:null;
  const parts=[flick,track].filter(x=>x!=null); const score=parts.reduce((a,b)=>a+b,0)/parts.length;
  const nl=st.over+st.under+st.land.filter(x=>x===0).length;
  const bF=nl?(st.over-st.under)/nl:null; const bT=st.leadN?Math.max(-1,Math.min(1,(st.lead/st.leadN)/1.3)):null;
  const bs=[bF,bT].filter(x=>x!=null); const bias=bs.length?bs.reduce((a,b)=>a+b,0)/bs.length:0;
  const react=st.react&&st.react.length?st.react.reduce((a,b)=>a+b,0)/st.react.length:NaN;
  return {score,acc,ttk,flick,track,bias,over:st.over,under:st.under,trOver:st.trOver,trUnder:st.trUnder,react};
}
function finish(){ const res=Object.assign(scoreOf(R.st),{cm:R.cm,label:R.label,fps:R.fpsN?Math.round(1000/(R.fpsAcc/R.fpsN)):null}); R.phase='done'; tgt.visible=false; clearHud(); if(document.pointerLockElement===stage)document.exitPointerLock();
  beep(660,0.12); const cb=R.onDone; R=null; cb(res); }
function loop(now){ requestAnimationFrame(loop); measure(now);
  if(!shouldDraw(now))return;
  const ft=F.lastDraw?now-F.lastDraw:0; F.lastDraw=now; F.ft=F.ft?F.ft*0.9+ft*0.1:ft;
  if(MODE==='range'){ if(RG&&RG.phase==='run')rangeStep(now); rangeCam.rotation.set(rview.pitch*D2R,rview.yaw*D2R,0); vmAnim(now); renderer.render(rscene,rangeCam); }
  else { if(R&&R.phase==='run'){ step(now); if(R){R.fpsAcc+=ft;R.fpsN++;} }
    if(FL&&FL.phase==='run') flashStep(now);
    camera.rotation.set(view.pitch*D2R,view.yaw*D2R,0); renderer.render(scene,camera); }
  if(xhKick>0){ xhKick*=0.78; if(xhKick<0.04)xhKick=0; drawCurrentXH(); }
  paintHint(now);
  if(S.showFps&&(F.dc=(F.dc||0)+1)%8===0) $('#hudFps').textContent=`${F.ft?Math.round(1000/F.ft):0} fps · ${F.ft.toFixed(2)} ms · ${F.hz} Hz${capFps()<F.hz?' · cap '+Math.round(capFps()):''}`; }
const biasTxt=b=>Math.abs(b)<0.15?'balanced':(b>0?`overshoots (${Math.round(b*100)}%)`:`undershoots (${Math.round(-b*100)}%)`);

/* ---------- train ---------- */
let drill='flick';
$('#drills').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;drill=b.dataset.d;$$('#drills button').forEach(x=>x.classList.toggle('on',x===b));});
const DRILLS={flick:()=>[{type:'flick',count:20}],micro:()=>[{type:'micro',count:20}],track:()=>[{type:'track',dur:25}]};
$('#startBtn').onclick=()=>{ if(!ok())return alert('Fill in the converter first.'); mountStage('#stageHost');
  newRound(DRILLS[drill](),currentCm(),res=>{ const prev=bestOf(drill); res.isBest=res.score>prev&&res.score>0; addHist(drill,res); showRes(res); showRoundOv(drill,res); renderDrillBests(); },drill[0].toUpperCase()+drill.slice(1)); };
function showRes(r){ $('#lastRound').innerHTML=[['Score',Math.round(r.score)],['Accuracy',r.flick!=null?Math.round(r.acc*100)+'%':'—'],['Time-to-hit',Number.isFinite(r.ttk)?Math.round(r.ttk)+' ms':'—'],['First shot',Number.isFinite(r.react)?Math.round(r.react)+' ms':'—'],['On target',r.track!=null?Math.round(r.track)+'%':'—'],['Overshoot / undershoot',r.flick!=null?`${r.over} / ${r.under}`:`${r.trOver.toFixed(1)}s / ${r.trUnder.toFixed(1)}s`],['Tendency',biasTxt(r.bias)],['Avg FPS',r.fps||'—']]
  .map(([k,v])=>`<div class="card stat"><div class="k">${k}</div><div class="v" style="font-size:22px">${v}</div></div>`).join(''); }
function addHist(drill,r){ store.history.unshift({at:Date.now(),drill,cm:r.cm,score:r.score,acc:r.acc,ttk:r.ttk,react:r.react,track:r.track,over:r.over,under:r.under,bias:r.bias,fps:r.fps}); store.history=store.history.slice(0,200); save(); }
function bestOf(drill){ if(!drill)return 0; return store.history.filter(h=>h.drill===drill).reduce((m,h)=>Math.max(m,+h.score||0),0); }
function renderDrillBests(){ $$('#drills .best').forEach(el=>{ const b=bestOf(el.dataset.best); el.textContent=b?('Best '+Math.round(b)):''; }); }
function cell(k,v){ return `<div><div class="k">${k}</div><div class="v">${v}</div></div>`; }
function showRoundOv(kind,res){
  const cells=[];
  if(res.flick!=null) cells.push(cell('Accuracy',Math.round(res.acc*100)+'%'), cell('Time-to-hit',Number.isFinite(res.ttk)?Math.round(res.ttk)+' ms':'—'), cell('First shot',Number.isFinite(res.react)?Math.round(res.react)+' ms':'—'));
  if(res.track!=null) cells.push(cell('On target',Math.round(res.track)+'%'), cell('Over / under',`${res.trOver.toFixed(1)}s / ${res.trUnder.toFixed(1)}s`));
  if(res.flick!=null) cells.push(cell('Over / under',`${res.over} / ${res.under}`));
  cells.push(cell('Tendency',biasTxt(res.bias)));
  const best=bestOf(kind);
  const badge=res.isBest?'<div class="badge">NEW BEST</div>':(best?`<div class="subscore">Best ${Math.round(best)}</div>`:'');
  const title=kind[0].toUpperCase()+kind.slice(1);
  showOv(`<div class="subscore">${esc(title)}</div><div class="big">${Math.round(res.score)}</div>${badge}<div class="resgrid">${cells.join('')}</div><div class="small muted">Click the arena or press Start to go again</div>`);
}
function clearHud(){ const a=$('#ahud'); if(a){ a.classList.remove('show'); ['hudV1','hudV2','hudV3'].forEach(id=>{const e=$('#'+id); if(e)e.textContent='—';}); } const c=$('#hudCm'); if(c)c.textContent=''; }
function abandonArenaRound(){ if(R){ R=null; tgt.visible=false; } clearHud(); if(document.pointerLockElement===stage) document.exitPointerLock(); }
function hitFx(kind){ const el=$('#hitFx'); if(!el)return; el.className=''; void el.offsetWidth; el.className=kind==='miss'?'miss':'hit';
  if(currentXH().dynamic){ xhKick=1; drawCurrentXH(); } }

function renderRangeHist(){ const rows=store.rangeHistory.map(h=>`<tr><td>${new Date(h.at).toLocaleString()}</td><td><b>${h.points}</b></td><td>${h.shots?Math.round(100*h.hits/h.shots)+'%':'—'}</td><td>${h.hits} / ${h.shots}</td><td>${h.tth?Math.round(h.tth)+' ms':'—'}</td><td class="small">${esc(h.setup)}</td><td>${fmt(h.cm,1)}</td></tr>`).join(''); const el=$('#rhist'); if(el)el.innerHTML=rows||'<tr><td colspan="7" class="muted">No range runs yet.</td></tr>'; }
function renderFlashHist(){ const el=$('#fhist'); if(!el)return; const rows=(store.flashHistory||[]).map(h=>`<tr><td>${new Date(h.at).toLocaleString()}</td><td>${h.preset==='cs2'?'CS2-style':'Valorant-style'}</td><td><b>${Math.round(h.score)}</b></td><td>${h.dodged}</td><td>${h.partial}</td><td>${h.full}</td><td>${Math.round(h.dodgePct)}%</td><td>${Number.isFinite(h.react)?Math.round(h.react)+' ms':'—'}</td><td>${fmt(h.cm,1)}</td></tr>`).join(''); el.innerHTML=rows||'<tr><td colspan="9" class="muted">No flash rounds yet.</td></tr>'; }
function bestFlash(preset){ return (store.flashHistory||[]).filter(h=>!preset||h.preset===preset).reduce((m,h)=>Math.max(m,+h.score||0),0); }
function renderFlashBests(){ $$('#flashPresets .best').forEach(el=>{ const b=bestFlash(el.dataset.fbest); el.textContent=b?('Best '+Math.round(b)):''; }); }
function renderHist(){ renderRangeHist(); renderDrillBests(); renderFlashHist(); renderFlashBests(); const pb=$('#pbests'); if(pb){ const tile=(k,v)=>`<div class="card stat"><div class="k">${k}</div><div class="v">${v||'—'}</div></div>`;
    pb.innerHTML=tile('Flick best',bestOf('flick')||'')+tile('Tracking best',bestOf('track')||'')+tile('Micro best',bestOf('micro')||'')+tile('Range best',bestPts()||'')+tile('Flash (Val) best',bestFlash('val')||'')+tile('Flash (CS2) best',bestFlash('cs2')||''); }
  $('#hist').innerHTML=store.history.map(h=>`<tr><td>${new Date(h.at).toLocaleString()}</td><td>${h.drill}</td><td>${fmt(h.cm,1)}</td><td>${Math.round(h.score)}</td><td>${h.drill==='track'?(h.track!=null?Math.round(h.track)+'%':'—'):(h.acc!=null?Math.round(h.acc*100)+'%':'—')}</td><td>${Number.isFinite(h.ttk)?Math.round(h.ttk)+' ms':'—'}</td><td>${biasTxt(h.bias||0)}</td><td>${h.fps||'—'}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">No rounds yet.</td></tr>'; }
$('#clearBtn').onclick=()=>{ if(confirm('Clear all saved results?')){store.history=[];store.finder=null;store.flashHistory=[];save();renderHist();renderFinder();renderFlashBests();} };

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
  const dark=S.theme!=='light'; x.fillStyle=dark?'#18202c':'#f3f6fa';x.fillRect(0,0,W,H);x.strokeStyle=dark?'#243042':'#c5d0dc';x.lineWidth=2;x.strokeRect(Pd,Pd,W-2*Pd,H-2*Pd);
  x.fillStyle=dark?'#8a9bb0':'#5a6b7c';x.font='22px system-ui';x.fillText('faster ← cm/360 → slower',W/2-120,H-12);
  x.strokeStyle='#36f1a6';x.setLineDash([8,8]);x.beginPath();x.moveTo(X(f.rec.cm),Pd);x.lineTo(X(f.rec.cm),H-Pd);x.stroke();x.setLineDash([]);
  x.strokeStyle='#7c8cff';x.beginPath();rs.forEach((r,i)=>i?x.lineTo(X(r.cm),Y(r.score)):x.moveTo(X(r.cm),Y(r.score)));x.stroke();
  rs.forEach(r=>{x.fillStyle='#7c8cff';x.beginPath();x.arc(X(r.cm),Y(r.score),8,0,7);x.fill();x.fillStyle=dark?'#e6edf5':'#15202b';x.fillText(r.cm.toFixed(1),X(r.cm)-20,Y(r.score)-16);}); }

/* ---------- crosshair (customizable, original) ---------- */
function currentXH(){ const id=S.game||'cs2'; if(!S.xhs[id]) S.xhs[id]=M.normXH(M.XH_DEF); S.xh=S.xhs[id]; return S.xh; }
function loadGameXH(){ currentXH(); drawCurrentXH(); syncXHEditors(); }
function saveXH(x){ x=M.normXH(x); S.xhs[S.game]=x; S.xh=x; save(); drawCurrentXH(); syncXHEditors(); }
function xhCss(c){ const h=(c.color||'#fff').replace('#',''); const n=parseInt(h,16); if(!Number.isFinite(n)||h.length!==6) return c.color||'#fff';
  const a=c.opacity==null?1:c.opacity; return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
let xhKick=0;
function drawXH(c,el){ el=el||$('#xh'); if(!el)return; c=M.normXH(c); const col=xhCss(c), ow=c.outline?c.outlineW:0, sh=ow?`box-shadow:0 0 0 ${ow}px #000c;`:'';
  const kick=c.dynamic&&xhKick>0?xhKick*Math.max(4,c.size*0.45):0;
  const s=+c.size, g=(+c.gap)+kick, t=Math.max(1,+c.thick), parts=[];
  const box=(x,y,w,h,extra='')=>parts.push(`<i style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${col};${sh}${extra}"></i>`);
  const dot=(d)=>{ d=Math.max(2,d); box(-d/2,-d/2,d,d,'border-radius:50%;'); };
  if(c.style==='dot'){ dot(s); }
  else if(c.style==='circle'){ const stroke=Math.max(2,t); parts.push(`<i style="left:${-s}px;top:${-s}px;width:${2*s}px;height:${2*s}px;border:${stroke}px solid ${col};border-radius:50%;box-sizing:border-box;background:transparent;${c.outline?`box-shadow:0 0 0 ${ow}px #000c, inset 0 0 0 ${ow}px #000c;`:''}"></i>`); if(c.dot)dot(Math.max(2,t+1)); }
  else {
    const arms=c.style==='t'?'t':'cross';
    if(arms==='t'){ box(-t/2,g,t,s); box(-g-s,-t/2,s,t); box(g,-t/2,s,t); } // no top arm
    else { box(-t/2,-g-s,t,s); box(-t/2,g,t,s); box(-g-s,-t/2,s,t); box(g,-t/2,s,t); }
    if(c.dot||c.style==='crossdot') dot(Math.max(2,t+1));
  }
  el.innerHTML=parts.join(''); }
function drawCurrentXH(){ drawXH(currentXH()); $$('.xh-origin').forEach(el=>drawXH(currentXH(),el)); }
function setMode(m,tab){ MODE=m; stage.classList.toggle('range',m==='range'); $('#ov').classList.toggle('begin',m==='range'); drawCurrentXH();
  if(m==='range'){ setRangeFov(); rangeOverlay(); }
  else if(m==='flash'){ clearHud(); $('#ov').classList.remove('begin'); if(!FL||FL.phase==='done') flashIdleOv(); }
  else if(!R){ clearHud(); $('#ov').classList.remove('begin');
    if(tab==='finder') showOv(`<div class="big">Sens Finder</div><div class="muted">Press Start finder, then click the arena to lock and begin.</div>`);
    else showOv(`<div class="big">EZ Sens</div><div class="muted">Pick a drill and press Start.</div>`); } }


function xhEditorHTML(){ const x=currentXH(); const g=safeGet(S.game); const name=g?g.name:S.game;
  const games=M.all();
  const styles=[['cross','Cross'],['dot','Dot'],['crossdot','Cross + dot'],['circle','Circle'],['t','T']];
  return `<div class="xhhead"><label>Crosshair for <b data-xh-game>${esc(short(name))}</b> <span class="muted small">(Train, Range and Flash)</span></label><div class="xhprev"><div class="xh-origin"></div></div></div>
  <div class="grid2">
    <div><label>Style</label><select data-xh="style">${styles.map(([v,l])=>`<option value="${v}" ${x.style===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div><label>Color</label><input data-xh="color" type="color" value="${x.color}" style="height:36px;padding:2px"></div>
    <div><label>Length <span class="muted" data-xh-val="size">${x.size}px</span></label><input data-xh="size" type="range" min="1" max="32" step="1" value="${x.size}"></div>
    <div><label>Thickness <span class="muted" data-xh-val="thick">${x.thick}px</span></label><input data-xh="thick" type="range" min="1" max="10" step="1" value="${x.thick}"></div>
    <div><label>Gap <span class="muted" data-xh-val="gap">${x.gap}px</span></label><input data-xh="gap" type="range" min="-8" max="20" step="1" value="${x.gap}"></div>
    <div><label>Outline width <span class="muted" data-xh-val="outlineW">${x.outlineW}px</span></label><input data-xh="outlineW" type="range" min="1" max="4" step="1" value="${x.outlineW}"></div>
    <div><label>Opacity <span class="muted" data-xh-val="opacity">${Math.round(x.opacity*100)}%</span></label><input data-xh="opacity" type="range" min="0.1" max="1" step="0.05" value="${x.opacity}"></div>
    <div style="display:flex;flex-direction:column;gap:6px;justify-content:flex-end">
      <label class="inl"><input data-xh="outline" type="checkbox" ${x.outline?'checked':''}> Outline</label>
      <label class="inl"><input data-xh="dot" type="checkbox" ${x.dot?'checked':''}> Center dot</label>
      <label class="inl"><input data-xh="dynamic" type="checkbox" ${x.dynamic?'checked':''}> Dynamic (opens on shot)</label>
    </div>
  </div>
  <div class="actions">
    <button type="button" class="btn alt sm" data-xh-act="reset">Reset default</button>
    <select data-xh-copy>${games.map(g=>`<option value="${g.id}" ${g.id===S.game?'disabled':''}>Copy from ${esc(short(g.name))}</option>`).join('')}</select>
    <button type="button" class="btn alt sm" data-xh-act="copy">Copy</button>
  </div>
  <div class="actions">
    <input type="text" data-xh-code placeholder="EZX1-… or a CSGO- share code" value="${esc(M.xhCode(x))}">
    <button type="button" class="btn alt sm" data-xh-act="export">Copy code</button>
    <button type="button" class="btn sm" data-xh-act="import">Import</button>
    <span class="msg" data-xh-msg></span>
  </div>`; }
function fillXHEditors(){ $$('[data-xhedit]').forEach(root=>{ root.innerHTML=xhEditorHTML(); const prev=root.querySelector('.xh-origin'); if(prev)drawXH(currentXH(),prev); }); }
function syncXHEditors(){ const x=currentXH();
  $$('[data-xhedit]').forEach(root=>{
    if(!root.querySelector('[data-xh=style]')) return;
    const set=(k,v)=>{ const el=root.querySelector('[data-xh="'+k+'"]'); if(!el)return; if(el.type==='checkbox')el.checked=!!v; else el.value=v; };
    set('style',x.style); set('color',x.color); set('size',x.size); set('thick',x.thick); set('gap',x.gap); set('outlineW',x.outlineW); set('opacity',x.opacity); set('outline',x.outline); set('dot',x.dot); set('dynamic',x.dynamic);
    const lab=(k,s)=>{ const e=root.querySelector('[data-xh-val="'+k+'"]'); if(e)e.textContent=s; };
    lab('size',x.size+'px'); lab('thick',x.thick+'px'); lab('gap',x.gap+'px'); lab('outlineW',x.outlineW+'px'); lab('opacity',Math.round(x.opacity*100)+'%');
    const gn=root.querySelector('[data-xh-game]'); if(gn){ const g=safeGet(S.game); gn.textContent=g?short(g.name):S.game; }
    const code=root.querySelector('[data-xh-code]'); if(code&&document.activeElement!==code) code.value=M.xhCode(x);
    const prev=root.querySelector('.xh-origin'); if(prev)drawXH(x,prev);
  }); }
function readXHFrom(root){ const v=k=>{ const el=root.querySelector('[data-xh="'+k+'"]'); if(!el)return; return el.type==='checkbox'?el.checked:(el.type==='range'||el.type==='number'?+el.value:el.value); };
  return M.normXH({style:v('style'),color:v('color'),size:v('size'),thick:v('thick'),gap:v('gap'),outline:v('outline'),outlineW:v('outlineW'),dot:v('dot'),opacity:v('opacity'),dynamic:v('dynamic')}); }
function xhMsg(root,text,ok){ const m=root.querySelector('[data-xh-msg]'); if(!m)return; m.textContent=text; m.className='msg '+(ok?'ok':'bad'); }
function importXH(s){ const r=M.parseXHCode(s); if(r&&r.ok&&r.xh){ saveXH(r.xh); return r; } return r||{error:'bad'}; }
function bindXHEditors(){ document.addEventListener('input',e=>{ const root=e.target.closest('[data-xhedit]'); if(!root)return;
  if(e.target.dataset.xh){ const x=readXHFrom(root); saveXH(x); } });
  document.addEventListener('click',e=>{ const root=e.target.closest('[data-xhedit]'); if(!root)return; const act=e.target.dataset.xhAct; if(!act)return;
    if(act==='reset'){ saveXH(M.XH_DEF); xhMsg(root,'Reset to the default green cross.',true); }
    if(act==='copy'){ const id=root.querySelector('[data-xh-copy]').value; if(id&&id!==S.game){ const src=S.xhs[id]?M.normXH(S.xhs[id]):M.XH_DEF; saveXH(src); xhMsg(root,'Copied.',true); } }
    if(act==='export'){ const code=M.xhCode(currentXH()); const box=root.querySelector('[data-xh-code]'); if(box)box.value=code;
      (async()=>{ try{ await navigator.clipboard.writeText(code); xhMsg(root,'Code copied.',true); }catch(err){ xhMsg(root,'Copy it from the box.',true); } })(); }
    if(act==='import'){ const raw=(root.querySelector('[data-xh-code]')||{}).value||''; const r=importXH(raw);
      if(r&&r.ok) xhMsg(root,r.src==='csgo'?'Imported from a CSGO share code.':'Imported.',true);
      else if(r&&r.error==='cs2-new') xhMsg(root,'That looks like a new CS2 code (no dashes). Only classic CSGO- codes can be imported right now.',false);
      else xhMsg(root,'Could not read that code.',false); }
  }); }

/* ---------- shooting range (original design) ---------- */
let RG=null; const rview={yaw:0,pitch:2};
const rscene=new THREE.Scene();
const rangeCam=new THREE.PerspectiveCamera(70,16/9,0.03,500); rangeCam.rotation.order='YXZ'; rangeCam.position.set(0,1.6,0); rscene.add(rangeCam);
function degPerCountRange(){ return M.degPerCountFromCm(currentCm(),S.dpi); }
function setRangeFov(){ const h=arenaHFov()*D2R; rangeCam.fov=2*Math.atan(Math.tan(h/2)/rangeCam.aspect)/D2R; rangeCam.updateProjectionMatrix(); }
const RB={x:5.8,yMin:0.8,yMax:4.4,z:-15.6}; // target area on the back wall
const rTargets=[]; const rTgtGeo=new THREE.SphereGeometry(1,28,18);
const rTgtMat=()=>new THREE.MeshStandardMaterial({color:0x1d222b,roughness:.55,metalness:.1,emissive:0x000000});
let vm=null, vmKick=0;
function buildRange(){
  // sky dome with a vertical gradient
  const sg=new THREE.SphereGeometry(300,32,16), cols=[], top=new THREE.Color(0x4f8fd8), hor=new THREE.Color(0xdbe9f6), c=new THREE.Color();
  const pos=sg.attributes.position; for(let i=0;i<pos.count;i++){ const t=Math.max(0,Math.min(1,pos.getY(i)/300)); c.copy(hor).lerp(top,Math.pow(t,0.6)); cols.push(c.r,c.g,c.b); }
  sg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  rscene.add(new THREE.Mesh(sg,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false})));
  rscene.add(new THREE.HemisphereLight(0xffffff,0xc4c9d1,2.2));
  const sunL=new THREE.DirectionalLight(0xffffff,2.0); sunL.position.set(6,14,8); rscene.add(sunL);
  const std=(col,r=0.95)=>new THREE.MeshStandardMaterial({color:col,roughness:r});
  const W=14,L=16;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,L+6),std(0xd9dce1)); floor.rotation.x=-Math.PI/2; floor.position.set(0,0,-L/2+3); rscene.add(floor);
  for(let x=-W/2+2;x<=W/2-2;x+=2){ const ln=new THREE.Mesh(new THREE.PlaneGeometry(0.05,L-1.5),std(0x9da5b0)); ln.rotation.x=-Math.PI/2; ln.position.set(x,0.002,-L/2-0.75+1.5); rscene.add(ln); }
  const sl=new THREE.Mesh(new THREE.PlaneGeometry(W,0.12),std(0x4a5260)); sl.rotation.x=-Math.PI/2; sl.position.set(0,0.003,-1.2); rscene.add(sl);
  const wallM=std(0xcdd2d9), backM=std(0xe6e8ec);
  [-1,1].forEach(s=>{ const w=new THREE.Mesh(new THREE.BoxGeometry(0.4,4.2,L+6),wallM); w.position.set(s*(W/2+0.2),2.1,-L/2+3); rscene.add(w); });
  const back=new THREE.Mesh(new THREE.BoxGeometry(W+0.8,6,0.4),backM); back.position.set(0,3,-L+0.2); rscene.add(back);
  const behind=new THREE.Mesh(new THREE.BoxGeometry(W+0.8,4.2,0.4),wallM); behind.position.set(0,2.1,3.2); rscene.add(behind);
  // low-poly viewmodel: an original blocky "marker" blaster
  vm=new THREE.Group(); const dark=std(0x2a2f38,0.6), mid=std(0x434a56,0.6), accent=new THREE.MeshStandardMaterial({color:0x36f1a6,emissive:0x0f6b48,roughness:.4});
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.085,0.30),mid); vm.add(body);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.025,0.22),dark); rail.position.set(0,0.055,-0.01); vm.add(rail);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.02,0.18,6),dark); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.012,-0.23); vm.add(barrel);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.13,0.06),dark); grip.position.set(0,-0.09,0.07); grip.rotation.x=0.28; vm.add(grip);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(0.078,0.012,0.16),accent); strip.position.set(0,0.0,-0.03); vm.add(strip);
  vm.scale.setScalar(0.75); vm.position.set(0.17,-0.15,-0.42); rangeCam.add(vm);
}
function vmAnim(){ if(!vm)return; vm.visible=!!S.range.viewmodel; vmKick*=0.82; vm.position.z=-0.42+vmKick*0.06; vm.rotation.x=vmKick*0.12; }
function clearTargets(){ rTargets.splice(0).forEach(t=>rscene.remove(t.mesh)); }
function placeRT(t){ const r=S.range.size; let tries=0,x,y;
  do{ x=rnd(-RB.x+r,RB.x-r); y=rnd(RB.yMin+r,RB.yMax-r); tries++; } while(tries<40&&rTargets.some(o=>o!==t&&Math.hypot(o.mesh.position.x-x,o.mesh.position.y-y)<r*3.5));
  t.mesh.scale.setScalar(r); t.mesh.position.set(x,y,RB.z+r); t.vx=(Math.random()<0.5?-1:1)*S.range.speed; t.ph=rnd(0,6.28); t.y0=y; t.born=performance.now(); }
function layoutTargets(){ clearTargets(); for(let i=0;i<S.range.count;i++){ const t={mesh:new THREE.Mesh(rTgtGeo,rTgtMat())}; rscene.add(t.mesh); rTargets.push(t); placeRT(t); } }
function rangeOverlay(){ const o=$('#ov'); o.classList.add('begin');
  if(RG&&RG.phase==='pause') showOv(`<div class="big">PAUSED</div><div>Click to continue · ${fmtT(RG.remaining)} left</div>`);
  else if(RG&&RG.last&&RG.result){ const r=RG.result; showOv(`<div class="big">CLICK TO BEGIN</div><div style="font-size:20px;font-weight:800">Last run: ${r.points} points · ${r.shots?Math.round(100*r.hits/r.shots):0}% accuracy</div><div class="small">${r.best?'New best! 🎯':'Best: '+bestPts()+' points'}</div>`); }
  else showOv(`<div class="big">CLICK TO BEGIN</div><div class="small">${fmtT(S.range.dur*1000)} timed run · Esc to pause</div>`); }
const fmtT=ms=>{ const s=Math.max(0,Math.ceil(ms/1000)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
const bestPts=()=>store.rangeHistory.reduce((m,h)=>Math.max(m,h.points),0);
function rangeBeginOrResume(){ if(RG&&RG.phase==='pause'){ RG.phase='run'; RG.last=performance.now(); hideOv(); return; }
  RG={phase:'run',remaining:S.range.dur*1000,last:performance.now(),points:0,hits:0,shots:0,tth:[],cm:currentCm(),result:null};
  rview.yaw=0; rview.pitch=2; layoutTargets(); hideOv(); rhud(); beep(880,0.08); }
function rangeShoot(){ if(!RG||RG.phase!=='run')return; RG.shots++; vmKick=1;
  const o=new THREE.Vector3(); rangeCam.getWorldPosition(o); const d=new THREE.Vector3(); rangeCam.getWorldDirection(d);
  let best=null,bd=Infinity; for(const t of rTargets){ const c=t.mesh.position, r=S.range.size; const oc=c.clone().sub(o); const tc=oc.dot(d); if(tc<0)continue; const d2=oc.lengthSq()-tc*tc; if(d2<=r*r&&tc<bd){bd=tc;best=t;} }
  if(best){ const tth=performance.now()-best.born; RG.tth.push(tth); RG.hits++; RG.points+=100+Math.max(0,Math.round((1000-tth)/20)); beep(1250,0.05,'triangle');
    best.mesh.material.emissive.setHex(0xffffff); const m=best.mesh.material; setTimeout(()=>m.emissive.setHex(0),50); hitFx('hit'); placeRT(best); }
  else { hitFx('miss'); beep(170,0.05,'square',0.025); }
  rhud(); }
function rangeStep(now){ const dt=Math.min(0.05,(now-RG.last)/1000); RG.last=now; RG.remaining-=dt*1000;
  if(S.range.moving) for(const t of rTargets){ const p=t.mesh.position, r=S.range.size; p.x+=t.vx*dt; if(p.x>RB.x-r){p.x=RB.x-r;t.vx=-Math.abs(t.vx);} if(p.x<-RB.x+r){p.x=-RB.x+r;t.vx=Math.abs(t.vx);} t.ph+=dt*1.3; p.y=Math.max(RB.yMin+r,Math.min(RB.yMax-r,t.y0+Math.sin(t.ph)*0.35*S.range.speed)); }
  if(RG.remaining<=0) return rangeEnd(); if((RG.fr=(RG.fr||0)+1)%4===0) rhud(); }
function rhud(){ $('#rPts').textContent=RG?RG.points:0; $('#rTime').textContent=fmtT(RG?RG.remaining:S.range.dur*1000); $('#rAcc').textContent=RG&&RG.shots?Math.round(100*RG.hits/RG.shots)+'%':'—'; }
function rangeEnd(){ RG.remaining=0; RG.phase='ready'; rhud(); beep(520,0.2); const prevBest=bestPts();
  const h={at:Date.now(),points:RG.points,hits:RG.hits,shots:RG.shots,tth:RG.tth.length?RG.tth.reduce((a,b)=>a+b,0)/RG.tth.length:0,cm:RG.cm,
    setup:`${S.range.dur}s · size ${S.range.size} · ${S.range.count} tgt${S.range.moving?' · moving '+S.range.speed:''}`};
  store.rangeHistory.unshift(h); store.rangeHistory=store.rangeHistory.slice(0,200); save(); RG.result=Object.assign({best:h.points>prevBest&&h.points>0},h);
  if(document.pointerLockElement===stage)document.exitPointerLock(); clearTargets(); renderRangeHist(); renderPanel(); rangeOverlay(); }
function renderPanel(){ const r=S.range,x=r.xh, top=[...store.rangeHistory].sort((a,b)=>b.points-a.points).slice(0,3), rec=store.rangeHistory.slice(0,5);
  $('#rpanelBody').innerHTML=`
  <div class="rowx"><div><label>Run length</label><select data-r="dur">${[30,60,90,120].map(v=>`<option ${v==r.dur?'selected':''} value="${v}">${fmtT(v*1000)}</option>`).join('')}</select></div>
  <div><label>Targets</label><input data-r="count" type="number" min="1" max="8" value="${r.count}"></div></div>
  <label>Target size <span class="muted" id="szv">${Math.round(r.size*200)} cm</span></label><input data-r="size" type="range" min="0.08" max="0.6" step="0.01" value="${r.size}">
  <label class="inl" style="margin-top:8px"><input data-r="moving" type="checkbox" ${r.moving?'checked':''}> Moving targets</label>
  <label>Speed <span class="muted" id="spv">${r.speed} m/s</span></label><input data-r="speed" type="range" min="0.3" max="5" step="0.1" value="${r.speed}">
  <div class="rowx" style="margin-top:8px"><label class="inl"><input data-r="viewmodel" type="checkbox" ${r.viewmodel?'checked':''}> Viewmodel</label><label class="inl"><input data-g="sound" type="checkbox" ${S.sound?'checked':''}> Hit sounds</label></div>
  <label class="inl" style="margin-top:6px"><input data-g="hint" type="checkbox" ${S.hint?'checked':''}> Off-screen target hint</label>
  <div class="xhedit" data-xhedit></div>
  <label>Best runs</label><table>${top.map(h=>`<tr><td><b>${h.points}</b></td><td>${h.shots?Math.round(100*h.hits/h.shots):0}%</td><td class="muted">${new Date(h.at).toLocaleDateString()}</td></tr>`).join('')||'<tr><td class="muted">No runs yet</td></tr>'}</table>
  <label>Recent</label><table>${rec.map(h=>`<tr><td>${h.points}</td><td>${h.shots?Math.round(100*h.hits/h.shots):0}%</td><td class="muted small">${esc(h.setup)}</td></tr>`).join('')||'<tr><td class="muted">—</td></tr>'}</table>`;
  fillXHEditors(); }
function onPanel(e){ const el=e.target, v=el.type==='checkbox'?el.checked:(el.type==='color'||el.tagName==='SELECT'&&el.dataset.x)?el.value:+el.value;
  if(el.dataset.r){ const k=el.dataset.r; S.range[k]=k==='count'?Math.max(1,Math.min(8,Math.round(v)||1)):v; if(k==='size')$('#szv').textContent=Math.round(v*200)+' cm'; if(k==='speed')$('#spv').textContent=v+' m/s';
    if(RG&&(RG.phase==='pause')&&['size','count','moving','speed'].includes(k)) layoutTargets(); if(k==='dur'&&(!RG||RG.phase!=='pause'))rhud(); }
  if(el.dataset.g==='sound'){ S.sound=v; const sb=$('#sound'); if(sb)sb.checked=v; }
  if(el.dataset.g==='hint'){ S.hint=v; const ho=$('#hintOpt'); if(ho)ho.checked=v; if(!S.hint)clearHint(); }
  save(); }
function RANGE_INIT(){ buildRange(); $('#rpanelBody').addEventListener('input',onPanel); $('#rpanelBody').addEventListener('change',onPanel);
  ['mousedown','click'].forEach(t=>$('#rpanel').addEventListener(t,e=>e.stopPropagation()));
  $('#rangeReset').onclick=()=>{ if(document.pointerLockElement===stage)document.exitPointerLock(); RG=null; clearTargets(); rhud(); rangeOverlay(); };
  renderPanel(); RG=null; rhud(); setMode('range'); }

/* ---------- off-screen target hint (original edge glow, updated every frame) ---------- */
const _hintV=new THREE.Vector3(), _hintCv=$('#edgeHint');
let _hintHad=false, _lastHints=[];
function clearHint(){ if(!_hintCv)return; const c=_hintCv.getContext('2d'); c.clearRect(0,0,_hintCv.width,_hintCv.height); _hintHad=false; _lastHints=[]; }
function worldToHint(pos,cam){
  _hintV.copy(pos).applyMatrix4(cam.matrixWorldInverse);
  const behind=_hintV.z>=0; let x=_hintV.x,y=_hintV.y;
  if(behind){ const len=Math.hypot(x,y); if(len<1e-8){x=1;y=0;} else {x=x/len*2;y=y/len*2;} return {x,y,behind:true}; }
  _hintV.copy(pos).project(cam); return {x:_hintV.x,y:_hintV.y,behind:false};
}
function applyCams(){
  camera.rotation.set(view.pitch*D2R,view.yaw*D2R,0); camera.updateMatrixWorld();
  rangeCam.rotation.set(rview.pitch*D2R,rview.yaw*D2R,0); rangeCam.updateMatrixWorld();
}
function sampleHints(){
  applyCams();
  const out=[];
  if(MODE==='range'){
    if(RG&&RG.phase==='run') for(const t of rTargets){ if(t.mesh&&t.mesh.visible) out.push(Object.assign(worldToHint(t.mesh.position,rangeCam),{r:S.range.size})); }
  } else if(R&&R.phase==='run'&&tgt.visible){
    out.push(Object.assign(worldToHint(tgt.position,camera),{r:tgt.scale.x}));
  }
  return out.map(s=>{ const h=M.offscreenHint(s.x,s.y,s.behind); return Object.assign(s,h); });
}
function drawHintArc(ctx,W,H,h,now){
  if(h.alpha<=0.01)return;
  const px=(h.x*0.5+0.5)*W, py=(0.5-h.y*0.5)*H, cx=W/2, cy=H/2;
  const ang=Math.atan2(py-cy,px-cx), reach=Math.hypot(px-cx,py-cy);
  const A=h.alpha*(0.78+0.22*Math.sin(now*0.007));
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.translate(cx,cy); ctx.rotate(ang);
  let g=ctx.createRadialGradient(reach-8,0,2,reach-8,0,210);
  const P=hintPal||ENV.night.hint, rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
  g.addColorStop(0,rgba(P.c0,0.58*A));
  g.addColorStop(0.18,rgba(P.c1,0.34*A));
  g.addColorStop(0.48,rgba(P.c2,0.14*A));
  g.addColorStop(1,rgba(P.c3,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(reach-10,0,74,180,0,0,Math.PI*2); ctx.fill();
  g=ctx.createLinearGradient(reach-36,-100,reach-36,100);
  g.addColorStop(0,rgba(P.c1,0));
  g.addColorStop(0.32,rgba(P.c0,0.75*A));
  g.addColorStop(0.5,`rgba(255,220,230,${0.95*A})`);
  g.addColorStop(0.68,rgba(P.c2,0.75*A));
  g.addColorStop(1,rgba(P.c3,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(reach-6,0,18,118,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=rgba(P.edge,0.9*A); ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.ellipse(reach+2,0,5,86,0,-1.15,1.15); ctx.stroke();
  ctx.restore();
}
function paintHint(now){
  if(!_hintCv)return;
  if(!S.hint){ if(_hintHad)clearHint(); return; }
  const W=_hintCv.width,H=_hintCv.height; if(!W||!H)return;
  const hints=sampleHints(); _lastHints=hints;
  const vis=hints.filter(h=>h.alpha>0.01);
  if(!vis.length){ if(_hintHad)clearHint(); return; }
  const ctx=_hintCv.getContext('2d'); ctx.clearRect(0,0,W,H);
  for(const h of vis) drawHintArc(ctx,W,H,h,now); _hintHad=true;
}


/* ---------- flash dodge ---------- */
let FL=null, grenade=null, _flashPeak=0, _flashUntil=0, _ringOsc=null;
const FDIFF={easy:{val:0.55,cs2:2.0,spread:80},normal:{val:0.42,cs2:1.5,spread:120},hard:{val:0.3,cs2:1.1,spread:160}};
function makeGrenade(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.16,16,12),new THREE.MeshStandardMaterial({color:0x4a5344,roughness:.7,metalness:.25}));
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.065,0.1,8),new THREE.MeshStandardMaterial({color:0x2a2e28,roughness:.55,metalness:.3}));
  cap.position.y=0.16;
  const lever=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.12,0.02),new THREE.MeshStandardMaterial({color:0x6a7060,roughness:.5,metalness:.4}));
  lever.position.set(0.08,0.12,0);
  const fuse=new THREE.Mesh(new THREE.SphereGeometry(0.035,8,8),new THREE.MeshStandardMaterial({color:0xffaa44,emissive:0xff5500,emissiveIntensity:1.2}));
  fuse.position.y=0.23;
  g.add(body,cap,lever,fuse); g.userData.fuse=fuse; return g;
}
function ensureGrenade(){ if(grenade)return grenade; grenade=makeGrenade(); grenade.visible=false; scene.add(grenade); return grenade; }
function hideGrenade(){ if(grenade)grenade.visible=false; }
function flashAngle(pos){ const dir=dirFrom(view.yaw,view.pitch); const to=pos.clone(); if(to.lengthSq()<1e-8)return 180; to.normalize(); return Math.acos(Math.min(1,Math.max(-1,dir.dot(to))))/D2R; }
function flashFactor(ang){ const safe=+S.flash.safe||90; if(ang>=safe)return 0; if(ang<=20)return 1; const t=(ang-20)/(safe-20); return Math.max(0,1-t*t); }
function flashIdleOv(){ showOv(`<div class="big">Flash dodge</div><div class="muted">Pick a preset and press Start, then click the arena to lock and begin.</div><div class="small muted">Turn away past 90° before it detonates. Esc pauses.</div>`); }
function syncFlashUI(){
  const f=S.flash;
  $$('#flashPresets button').forEach(b=>b.classList.toggle('on',b.dataset.fp===f.preset));
  const d=$('#flashDiff'); if(d)d.value=f.diff;
  const c=$('#flashCount'); if(c)c.value=String(f.count);
  const a=$('#flashAudio'); if(a)a.checked=!!f.audio;
  const r=$('#flashReduced'); if(r)r.checked=!!f.reduced;
  const v=$('#flashTvol'); if(v)v.value=f.tVol;
  const lab=$('#flashTvolLab'); if(lab)lab.textContent=Math.round(f.tVol*100)+'%';
  renderFlashBests();
}
function persistFlash(){ save(); syncFlashUI(); }
$('#flashPresets').addEventListener('click',e=>{ const b=e.target.closest('button[data-fp]'); if(!b)return; S.flash.preset=b.dataset.fp; persistFlash(); });
$('#flashDiff').onchange=()=>{S.flash.diff=$('#flashDiff').value;persistFlash();};
$('#flashCount').onchange=()=>{S.flash.count=Math.max(5,Math.min(15,+$('#flashCount').value||8));persistFlash();};
$('#flashAudio').onchange=()=>{S.flash.audio=$('#flashAudio').checked;persistFlash();};
$('#flashReduced').onchange=()=>{S.flash.reduced=$('#flashReduced').checked;persistFlash();};
$('#flashTvol').oninput=()=>{S.flash.tVol=Math.max(0,Math.min(1,+$('#flashTvol').value||0)); const lab=$('#flashTvolLab'); if(lab)lab.textContent=Math.round(S.flash.tVol*100)+'%'; save();};

function flashCue(kind,factor){
  if(!S.flash.audio)return;
  if(kind==='pop') beep(700,0.06,'square',0.04);
  else if(kind==='throw') beep(220,0.08,'sawtooth',0.03);
  else if(kind==='bang') beep(140,0.1,'square',0.05*(factor||1));
}
function startRing(factor,dur){
  stopRing();
  const vol=Math.max(0,Math.min(1,S.flash.tVol))*factor*(S.flash.reduced?0.45:0.7);
  if(vol<0.01||!S.flash.audio)return;
  try{
    actx=actx||new AudioContext();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine'; o.frequency.value=7800;
    g.gain.setValueAtTime(vol*0.08,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime+dur);
    _ringOsc={o,g};
  }catch(e){}
}
function stopRing(){ if(!_ringOsc)return; try{_ringOsc.o.stop();}catch(e){} _ringOsc=null; }

function whiteOut(factor){
  const el=$('#flashFx'); if(!el)return Math.max(350,300);
  const peak=factor*(S.flash.reduced?0.38:1);
  _flashPeak=peak;
  if(peak<=0.02){ el.style.opacity=0; _flashUntil=performance.now()+350; return 350; }
  const total=(S.flash.reduced?800:1900)*(0.5+0.5*factor);
  const fade=Math.max(300,total*0.55), hold=Math.max(80,total-fade);
  el.style.transition='opacity 70ms linear';
  el.style.background=S.flash.reduced?'rgb(255,255,236)':'#fff';
  el.style.opacity=String(peak);
  clearTimeout(whiteOut._t);
  whiteOut._t=setTimeout(()=>{ el.style.transition=`opacity ${fade}ms linear`; el.style.opacity='0'; },hold);
  const dur=hold+fade;
  _flashUntil=performance.now()+dur;
  startRing(factor,dur/1000);
  return dur;
}
function clearWhiteOut(){
  const el=$('#flashFx'); if(el){ el.style.transition='none'; el.style.opacity='0'; }
  clearTimeout(whiteOut._t); _flashPeak=0; _flashUntil=0; stopRing();
}

function flashWarnThen(go){
  if(S.flash.warned){ go(); return; }
  showOv(`<div class="big" style="font-size:34px">Photosensitivity notice</div>
    <p class="notice small">This drill uses a full-screen flash. If you are sensitive to flashing lights, choose <b>reduced intensity</b>. There is never more than one flash at a time, and every fade lasts at least 300 milliseconds. You can change this later in the Flash options.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      <button type="button" class="btn sm" id="flashWarnReduced">I understand — use reduced intensity</button>
      <button type="button" class="btn alt sm" id="flashWarnFull">I understand — full intensity</button>
    </div>`);
  const bind=(id,reduced)=>{ const b=$(id); if(!b)return; b.onclick=ev=>{ ev.stopPropagation(); S.flash.warned=true; S.flash.reduced=reduced; persistFlash(); go(); }; };
  bind('#flashWarnReduced',true); bind('#flashWarnFull',false);
}

function newFlashRound(){
  if(!ok())return alert('Fill in the converter first.');
  mountStage('#stageHost3'); setMode('flash','flash'); setFov();
  degPerCount=M.degPerCountFromCm(currentCm(),S.dpi);
  view.yaw=0; view.pitch=4; hideGrenade(); clearWhiteOut();
  const n=S.flash.count;
  FL={phase:'ready',preset:S.flash.preset,diff:S.flash.diff,n,i:0,bomb:null,busyUntil:0,cm:currentCm(),last:0,st:{dodged:0,partial:0,full:0,react:[]}};
  flashHud();
  showOv(`<div class="big">${S.flash.preset==='cs2'?'CS2-style':'Valorant-style'}</div><div class="muted">Click here to lock your mouse and start</div><div class="small muted">${n} flashes · ${S.flash.diff} · Esc to pause</div>`);
}
$('#flashBtn').onclick=()=>flashWarnThen(newFlashRound);

function flashCountdown(){ FL.phase='count'; let n=3; const tick=()=>{ if(!FL||FL.phase!=='count')return; if(n===0){hideOv();FL.phase='run';FL.last=performance.now();FL.busyUntil=FL.last+200;beep(880,0.08);return;} showOv(`<div class="big">${n}</div>`); beep(440,0.06); n--; setTimeout(tick,450);}; tick(); }

function spawnFlash(now){
  const d=FDIFF[FL.diff]||FDIFF.normal, g=ensureGrenade();
  const spread=d.spread, yaw=view.yaw+rnd(-spread,spread)* (Math.random()<0.15? (Math.random()<0.5?-1:1)*1.4 : 1);
  const bomb={kind:FL.preset,t0:now,appeared:now,safeAt:null,detonated:false,factor:null,fuse:0,pos:new THREE.Vector3(),vel:new THREE.Vector3()};
  if(FL.preset==='cs2'){
    bomb.fuse=d.cs2*1000;
    const pitch=rnd(6,16), spd=rnd(8,13);
    const dir=dirFrom(yaw,pitch);
    bomb.pos.set(0,-0.2,0); bomb.vel.copy(dir).multiplyScalar(spd); bomb.vel.y=rnd(5,9);
    flashCue('throw');
  }else{
    bomb.fuse=d.val*1000;
    const dist=rnd(7,13), tp=rnd(-4,18);
    const dir=dirFrom(yaw,tp);
    bomb.pos.copy(dir).multiplyScalar(dist);
    if(bomb.pos.y<FLOOR_Y+0.2) bomb.pos.y=FLOOR_Y+0.2;
    flashCue('pop');
  }
  g.position.copy(bomb.pos); g.visible=true; g.scale.setScalar(FL.preset==='val'?0.3:1);
  FL.bomb=bomb;
}
function flashStep(now){
  if(!FL||FL.phase!=='run')return;
  const dt=Math.min(0.05,(now-(FL.last||now))/1000); FL.last=now;
  const bomb=FL.bomb;
  if(!bomb){
    if(FL.i>=FL.n){ if(now>=FL.busyUntil) flashFinish(); return; }
    if(now>=FL.busyUntil) spawnFlash(now);
    flashHud(); return;
  }
  if(FL.preset==='cs2'){
    bomb.vel.y-=18*dt;
    bomb.pos.addScaledVector(bomb.vel,dt);
    const r=0.18;
    if(bomb.pos.y<FLOOR_Y+r){ bomb.pos.y=FLOOR_Y+r; if(bomb.vel.y<0) bomb.vel.y*=-0.38; bomb.vel.x*=0.72; bomb.vel.z*=0.72; if(Math.abs(bomb.vel.y)<0.9) bomb.vel.y=0; }
  }else if(grenade&&grenade.scale.x<1){ const s=Math.min(1,grenade.scale.x+dt*6); grenade.scale.setScalar(s); }
  if(grenade){ grenade.position.copy(bomb.pos); grenade.rotation.y+=dt*2.2; grenade.rotation.z+=dt*0.7;
    const fu=grenade.userData.fuse; if(fu){ const blink=0.5+0.5*Math.sin(now*0.03+(1-Math.max(0,(bomb.fuse-(now-bomb.t0))/bomb.fuse))*20); fu.material.emissiveIntensity=0.6+1.6*blink; } }
  const ang=flashAngle(bomb.pos);
  if(ang>=(S.flash.safe||90)&&bomb.safeAt==null) bomb.safeAt=now;
  if(ang<(S.flash.safe||90)) bomb.safeAt=null; // must still be turned away at detonation? 
  // Reaction time is time from appearance to first becoming safe, but classification uses angle at detonation.
  // Keep first-safe timestamp even if they look back: store firstSafe separately.
  if(bomb.firstSafe==null && ang>=(S.flash.safe||90)) bomb.firstSafe=now;
  if(now-bomb.t0>=bomb.fuse) detonateFlash(now);
  flashHud();
}
function detonateFlash(now){
  const bomb=FL.bomb; if(!bomb||bomb.detonated)return;
  bomb.detonated=true;
  const ang=flashAngle(bomb.pos); const factor=flashFactor(ang);
  bomb.factor=factor; bomb.ang=ang;
  hideGrenade();
  const dur=whiteOut(factor);
  flashCue('bang',factor);
  let kind='full'; if(factor<=0.02) kind='dodged'; else if(factor<0.7) kind='partial';
  FL.st[kind]++;
  if(kind==='dodged') FL.st.react.push((bomb.firstSafe!=null?bomb.firstSafe:now)-bomb.appeared);
  FL.i++; FL.bomb=null; FL.busyUntil=now+dur+400;
}
function flashScore(st,n){
  const dodgePct=n?100*st.dodged/n:0;
  const react=st.react.length?st.react.reduce((a,b)=>a+b,0)/st.react.length:NaN;
  // 100 per dodge, 40 per partial (scaled by leftover), 0 full; + speed bonus on dodges already in react quality
  let score=0;
  score += st.dodged*100 + st.partial*40;
  if(st.react.length){ const avg=st.react.reduce((a,b)=>a+b,0)/st.react.length; score += Math.max(0,20*(1-avg/1200))*st.dodged; }
  score = n?score/n:0;
  return {score,dodgePct,react,dodged:st.dodged,partial:st.partial,full:st.full,n};
}
function flashHud(){
  if(!FL)return;
  const bar=$('#ahud'); if(bar)bar.classList.add('show');
  $('#hudK1').textContent='FLASH'; $('#hudV1').textContent=FL.i+'/'+FL.n;
  $('#hudK2').textContent='DODGED'; $('#hudV2').textContent=FL.i?Math.round(100*FL.st.dodged/FL.i)+'%':'—';
  const best=bestFlash(FL.preset);
  $('#hudK3').textContent='BEST'; $('#hudV3').textContent=best?Math.round(best):'—';
  const cm=$('#hudCm'); if(cm) cm.textContent=`${FL.preset==='cs2'?'CS2-style':'Valorant-style'} · ${FL.diff}`;
}
function flashFinish(){
  const res=flashScore(FL.st,FL.n); res.cm=FL.cm; res.preset=FL.preset; res.diff=FL.diff;
  const prev=bestFlash(FL.preset); res.isBest=res.score>prev&&res.score>0;
  store.flashHistory.unshift({at:Date.now(),preset:FL.preset,diff:FL.diff,cm:FL.cm,score:res.score,dodged:res.dodged,partial:res.partial,full:res.full,dodgePct:res.dodgePct,react:res.react});
  store.flashHistory=store.flashHistory.slice(0,200); save();
  FL.phase='done'; hideGrenade(); clearHud();
  if(document.pointerLockElement===stage)document.exitPointerLock();
  const cells=[cell('Dodged',res.dodged+' / '+res.n),cell('Partial',String(res.partial)),cell('Full flash',String(res.full)),cell('Dodge %',Math.round(res.dodgePct)+'%'),cell('Avg reaction',Number.isFinite(res.react)?Math.round(res.react)+' ms':'—')];
  const badge=res.isBest?'<div class="badge">NEW BEST</div>':(prev?`<div class="subscore">Best ${Math.round(prev)}</div>`:'');
  const title=FL.preset==='cs2'?'CS2-style':'Valorant-style';
  showOv(`<div class="subscore">${esc(title)}</div><div class="big">${Math.round(res.score)}</div>${badge}<div class="resgrid">${cells.join('')}</div><div class="small muted">Click Start to go again</div>`);
  const last=$('#lastFlash');
  if(last) last.innerHTML=[['Score',Math.round(res.score)],['Dodged',res.dodged+' / '+res.n],['Partial / full',res.partial+' / '+res.full],['Dodge %',Math.round(res.dodgePct)+'%'],['Avg reaction',Number.isFinite(res.react)?Math.round(res.react)+' ms':'—'],['Best',Math.round(Math.max(prev,res.score))||'—']]
    .map(([k,v])=>`<div class="card stat"><div class="k">${k}</div><div class="v" style="font-size:22px">${v}</div></div>`).join('');
  renderFlashBests(); renderFlashHist();
  FL=null;
}
function abandonFlash(){
  if(FL){ FL=null; hideGrenade(); }
  clearWhiteOut(); clearHud();
  if(MODE==='flash'&&document.pointerLockElement===stage) document.exitPointerLock();
}


/* test hooks for headless checks */
window.EZ={range:()=>RG,rview,rangeTargets:()=>rTargets.map(t=>t.mesh.position.clone()),rangeCamPos:()=>{const v=new THREE.Vector3();rangeCam.getWorldPosition(v);return v;},rangeBegin:()=>rangeBeginOrResume(),rangeShoot:()=>rangeShoot(),setMode:(m,tab)=>setMode(m,tab),mode:()=>MODE,simMove:(dx,dy)=>look(dx,dy),simShoot:()=>shoot(),forceRun:()=>{if(R){R.phase='run';R.last=performance.now();hideOv();startSeg();}},tick:(ms)=>{if(!R)return; if(R.phase!=='run'){R.phase='run';hideOv();} step((R.last||performance.now())+ms);},state:()=>R,view,frame:F,capFps,rawEvt:RAW_EVT,setGame,applyShare,enc,dec,S,
  FLOOR_Y,CEIL_Y,DIST,targetPos:()=>tgt.position.clone(),targetRad:()=>tgt.scale.x,targetVisible:()=>tgt.visible,hintSample:()=>sampleHints(),paintHint,bestOf,clearHud,placeTarget,
  currentXH,saveXH,loadGameXH,xhCode:()=>M.xhCode(currentXH()),importXH:s=>importXH(s),
  setEnv,env:()=>S.env,envInfo:()=>({mode:S.env,fog:fog.color.getHex(),fogNear:fog.near,fogFar:fog.far,hemi:hemi.intensity,hemiSky:hemi.color.getHex(),sunI:sun.intensity,sunCol:sun.color.getHex(),sunPos:sun.position.toArray(),sunDisc:sunDisc.visible,sunScale:sunDisc.scale.x,floor:floor.material.color.getHex(),tgt:tgtMat.color.getHex(),tgtEm:tgtMat.emissive.getHex(),bg:scene.background&&scene.background.getHex(),sky:!!skyMesh.parent,hint:hintPal}),
  setTheme,theme:()=>S.theme,applyTheme,
  flash:()=>FL,startFlash:()=>{S.flash.warned=true;newFlashRound();},flashCountdown,spawnFlash,detonateFlash,flashFinish,abandonFlash,flashFactor,flashAngle,flashScore,whiteOut,clearWhiteOut,
  flashPeak:()=>_flashPeak,flashUntil:()=>_flashUntil,grenade:()=>grenade,forceFlashRun:()=>{if(FL){FL.phase='run';FL.last=performance.now();hideOv();}},
  lookAway:()=>{view.yaw+=180;},lookAtBomb:()=>{if(!FL||!FL.bomb)return; const p=FL.bomb.pos; const yaw=Math.atan2(-p.x,-p.z)/D2R, pitch=Math.asin(Math.max(-1,Math.min(1,p.y/Math.max(1e-6,p.length()))))/D2R; view.yaw=yaw; view.pitch=pitch;}};
RANGE_INIT(); makeRenderer(); applyEnv(S.env); syncEnvUI(); applyTheme(S.theme); syncThemeUI(); syncFlashUI(); fillXHEditors(); bindXHEditors(); syncInputs(); syncPerf(); renderHist(); renderFinder(); renderDrillBests(); renderFlashBests(); requestAnimationFrame(loop);
document.documentElement.dataset.ready='1';
