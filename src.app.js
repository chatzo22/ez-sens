const THREE = await import(URL.createObjectURL(new Blob([document.getElementById('three-src').textContent],{type:'text/javascript'})));
const M = window.EZMath;
const $ = s=>document.querySelector(s), $$ = s=>[...document.querySelectorAll(s)];
const LS='ezsens.v1';
const DEF={range:{size:0.22,speed:1.2,count:3,moving:false,dur:60,viewmodel:true,xh:{style:'dot',color:'#ffffff',size:6,gap:3,outline:true}},xh:{style:'cross',color:'#36f1a6',size:8,thick:2,gap:2,outline:true,outlineW:1,dot:false,opacity:1,dynamic:false},xhs:{},dpi:800,game:'cs2',sens:1,params:{},fav:['cs2','finals','arc'],custom:[],fps:'auto',fpsCustom:165,showFps:true,scale:'1',lowq:false,sound:true,hint:true,env:'night',theme:'dark',flash:{preset:'val',diff:'normal',count:8,audio:true,tVol:0.4,reduced:false,warned:false,safe:90,scn:'hall',wasd:false,rand:true},afov:''};
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
S.flash.count=Math.max(1,Math.min(15,+S.flash.count||8));
S.flash.tVol=Math.max(0,Math.min(1,S.flash.tVol==null?0.4:+S.flash.tVol));
if(!['hall','hold','anchor','entry','retake','overwall','mid','ramp','mix'].includes(S.flash.scn)) S.flash.scn='hall';
S.flash.wasd=!!S.flash.wasd;
S.flash.rand=S.flash.rand!==false;
S.bot=Object.assign({shape:'dot',dmg:'hs',body:'#f4f6f8',head:'#00e8ff',stance:'mix'},S.bot||{});
if(S.bot.shape!=='bot') S.bot.shape='dot';
if(!M.DMG_IDS.includes(S.bot.dmg)) S.bot.dmg='hs';
const STANCE_IDS=['mix','stand','crouch','switch'];
if(!STANCE_IDS.includes(S.bot.stance)) S.bot.stance='mix';
if(!/^#[0-9a-fA-F]{6}$/.test(S.bot.body||'')) S.bot.body='#f4f6f8';
if(!/^#[0-9a-fA-F]{6}$/.test(S.bot.head||'')) S.bot.head='#00e8ff';
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
stage.innerHTML=`<div id="ahud"><span><small id="hudK1">TARGETS</small><b id="hudV1">—</b></span><span><small id="hudK2">ACCURACY</small><b id="hudV2">—</b></span><span><small id="hudK3">BEST</small><b id="hudV3">—</b></span></div><div class="hud-cm" id="hudCm"></div><div id="hudFps"></div><canvas id="edgeHint"></canvas><div id="xh"></div><div id="hitFx"></div><div id="flashFx"></div><div id="dmgFx"></div><div id="flashToast"></div><div id="rhud"><span><small>POINTS</small><b id="rPts">0</b></span><span><small>TIME</small><b id="rTime">01:00</b></span><span><small>ACCURACY</small><b id="rAcc">—</b></span></div><details class="rpanel" id="rpanel"><summary>⚙ Range settings</summary><div id="rpanelBody"></div></details><div class="overlay" id="ov"><div class="big">EZ Sens</div><div class="muted">Pick a drill and press Start.</div></div>`;
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
const camEye=new THREE.Vector3();
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
const arenaWalls=[];
(function collectArenaWalls(){
  // floor disc approximated as a wide thin box so downward shots can clip
  arenaWalls.push({min:new THREE.Vector3(-90,-1.85,-90),max:new THREE.Vector3(90,-1.55,90),role:'floor'});
  pillars.forEach(p=>{
    const m=p.mesh, pos=m.position, geo=m.geometry, par=geo.parameters||{};
    const sx=par.width||1, sy=par.height||8, sz=par.depth||1;
    arenaWalls.push({min:new THREE.Vector3(pos.x-sx/2,pos.y-sy/2,pos.z-sz/2),max:new THREE.Vector3(pos.x+sx/2,pos.y+sy/2,pos.z+sz/2),role:'wall'});
  });
})();
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
  if(MODE==='flash'){ setArenaDecor(false); if(typeof tintScn==='function') tintScn(); }
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
/* ---------- bots (original capsule + sphere; no third-party assets) ---------- */
const BOT_BODY_R=0.18, BOT_BODY_LEN=1.05, BOT_HEAD_R=0.14;
const BOT_BODY_H=BOT_BODY_LEN+BOT_BODY_R*2;
const BOT_HEAD_Y=BOT_BODY_H+BOT_HEAD_R*0.85;
const BOT_LEG_FROM_FEET=0.62;
const CROUCH_BODY_SY=0.58, CROUCH_HEAD_Y=0.90;
let botBodyGeo=null, botHeadGeo=null, trainBot=null, peekBots=[];
function botGeos(){
  if(!botBodyGeo){ botBodyGeo=new THREE.CapsuleGeometry(BOT_BODY_R,BOT_BODY_LEN,3,8); botHeadGeo=new THREE.SphereGeometry(BOT_HEAD_R,10,8); }
  return {body:botBodyGeo,head:botHeadGeo};
}
function hexOk(s){ return typeof s==='string'&&/^#[0-9a-fA-F]{6}$/.test(s)?s.toLowerCase():null; }
function botCols(){ return {body:hexOk(S.bot&&S.bot.body)||'#f4f6f8', head:hexOk(S.bot&&S.bot.head)||'#00e8ff'}; }
function useBots(){ return !!(S.bot&&S.bot.shape==='bot'); }
function currentDmg(){ return M.dmgModel(S.bot&&S.bot.dmg); }
function makeBot(sceneRef){
  const g=botGeos(), sc=sceneRef||scene;
  const group=new THREE.Group();
  const bodyMat=new THREE.MeshStandardMaterial({color:0xf4f6f8,roughness:.58,metalness:0});
  const headMat=new THREE.MeshStandardMaterial({color:0x00e8ff,emissive:0x00e8ff,emissiveIntensity:.35,roughness:.42,metalness:0});
  const body=new THREE.Mesh(g.body,bodyMat); body.position.y=BOT_BODY_H/2;
  const head=new THREE.Mesh(g.head,headMat); head.position.y=BOT_HEAD_Y;
  body.userData.zone='body'; head.userData.zone='head';
  group.add(body,head); sc.add(group);
  const bot={group,body,head,bodyMat,headMat,dead:false,state:null,dim:0,scale:1,scene:sc,shots:0,t0:0,firstHit:null,legLocalY:-BOT_BODY_H/2+BOT_LEG_FROM_FEET};
  body.userData.bot=bot; head.userData.bot=bot; paintBot(bot,0); return bot;
}
function paintBot(bot,dim){
  if(!bot)return; dim=dim==null?bot.dim||0:dim; bot.dim=dim;
  const c=botCols(), body=new THREE.Color(c.body), head=new THREE.Color(c.head), dark=new THREE.Color(0x2a3036);
  if(dim>0){ body.lerp(dark,dim*0.85); head.lerp(dark,dim*0.8); }
  bot.bodyMat.color.copy(body); bot.headMat.color.copy(head); bot.headMat.emissive.copy(head);
  bot.headMat.emissiveIntensity=0.35*(1-dim*0.92);
  const op=dim>0.5?0.38+0.5*(1-dim):1;
  bot.bodyMat.transparent=bot.headMat.transparent=op<1; bot.bodyMat.opacity=bot.headMat.opacity=op;
}
function armBot(bot,now){ if(!bot)return; bot.dead=false; bot.state=M.newBotState(currentDmg()); bot.shots=0; bot.t0=now||performance.now(); bot.firstHit=null; bot.group.visible=true; paintBot(bot,bot.dim||0); }
function scaleBot(bot,s){ bot.scale=s; bot.group.scale.setScalar(s); }
function placeBotFeet(bot,x,y,z){ bot.group.position.set(x,y,z); }
function placeBotHead(bot,x,y,z){ bot.group.position.set(x,y-(botCrouchHeadY(bot))*bot.scale,z); }
function botCrouchHeadY(bot){ const t=bot&&bot.crouch||0; return BOT_HEAD_Y+(CROUCH_HEAD_Y-BOT_HEAD_Y)*t; }
function applyCrouch(bot,t){
  if(!bot) return;
  t=Math.max(0,Math.min(1,+t||0));
  bot.crouch=t;
  const sy=1+(CROUCH_BODY_SY-1)*t;
  bot.body.scale.set(1,sy,1);
  bot.body.position.y=(BOT_BODY_H/2)*sy;
  bot.head.position.y=BOT_HEAD_Y+(CROUCH_HEAD_Y-BOT_HEAD_Y)*t;
  bot.legLocalY=-BOT_BODY_H/2+BOT_LEG_FROM_FEET;
  bot.group.updateMatrixWorld(true);
}
function botStanceMode(){ return STANCE_IDS.includes(S.bot&&S.bot.stance)?S.bot.stance:'mix'; }
function stanceUnit(rng){ return rng?+rng():((FL&&typeof frand==='function')?frand():Math.random()); }
function pickStanceKind(mode,rng){
  mode=STANCE_IDS.includes(mode)?mode:botStanceMode();
  if(mode==='stand'||mode==='crouch'||mode==='switch') return mode;
  const r=stanceUnit(rng);
  if(r<0.40) return 'stand';
  if(r<0.70) return 'crouch';
  return 'switch';
}
function assignGroupStances(n,mode,rng){
  n=Math.max(0,+n||0)|0; mode=STANCE_IDS.includes(mode)?mode:botStanceMode();
  const kinds=[]; for(let i=0;i<n;i++) kinds.push(pickStanceKind(mode,rng));
  if(mode==='mix'&&n>=2){
    const hasStand=kinds.some(k=>k==='stand');
    const hasLow=kinds.some(k=>k==='crouch'||k==='switch');
    if(!hasStand) kinds[0]='stand';
    if(!hasLow){ const j=kinds[0]==='stand'&&n>1?1:0; kinds[j]=(stanceUnit(rng)<0.5)?'switch':'crouch'; }
  }
  return kinds;
}
function planStanceToggles(kind,now,delay,windowMs,rng,opts){
  kind=kind||'stand'; now=+now||0; delay=+delay||0;
  const startWant=kind==='crouch'?1:kind==='stand'?0:(stanceUnit(rng)<0.5?1:0);
  const times=[];
  if(kind==='switch'){
    const t0=now+delay, end=now+(+windowMs||1100)-50;
    let t=t0+(180+stanceUnit(rng)*260), want=startWant?0:1;
    const max=(opts&&opts.max)||4;
    while(t<end&&times.length<max){ times.push({at:t,want}); want=want?0:1; t+=200+stanceUnit(rng)*240; }
  }
  return {kind,startWant,times,auto:!!(opts&&opts.auto)};
}
function applyBotStance(bot,plan,now){
  if(!bot||!plan) return;
  bot.stanceKind=plan.kind;
  bot.stancePlan=(plan.times||[]).slice();
  bot.stanceAuto=!!plan.auto;
  bot.crouchWant=plan.startWant;
  const last=bot.stancePlan.length?bot.stancePlan[bot.stancePlan.length-1].at:now;
  bot.nextStanceAt=(last||now||0)+250;
  applyCrouch(bot, plan.startWant);
}
function stepBotStance(bot,now){
  if(!bot||bot.dead) return;
  const plan=bot.stancePlan;
  if(plan&&plan.length){
    while(plan.length&&now>=plan[0].at){ bot.crouchWant=plan.shift().want; }
  }
  if(bot.stanceKind==='switch'&&bot.stanceAuto&&(!plan||!plan.length)&&now>=(bot.nextStanceAt||0)){
    bot.crouchWant=(bot.crouchWant>=0.5)?0:1;
    bot.nextStanceAt=now+220+((FL&&typeof frange==='function')?frange(0,240):Math.random()*240);
  }
}
function stepCrouch(bot,dt){
  if(!bot||bot.crouchWant==null) return;
  const cur=bot.crouch||0, want=+bot.crouchWant;
  if(Math.abs(want-cur)>0.001) applyCrouch(bot, cur+(want-cur)*Math.min(1,dt*8));
  else if(cur!==want) applyCrouch(bot,want);
}
function hideBot(bot){ if(bot){ bot.group.visible=false; bot.dead=true; } }
function disposeBot(bot){ if(!bot)return; bot.scene.remove(bot.group); bot.bodyMat.dispose(); bot.headMat.dispose(); }
const _ndc=new THREE.Vector2(0,0), _rc=new THREE.Raycaster();
function pickBots(list,cam){
  if(!cam||!list||!list.length)return null;
  if(typeof applyCams==='function') applyCams();
  cam.updateMatrixWorld(); _rc.setFromCamera(_ndc,cam);
  const meshes=[]; for(const b of list){ if(b&&!b.dead&&b.group.visible){ meshes.push(b.head,b.body); } }
  if(!meshes.length)return null;
  const hits=_rc.intersectObjects(meshes,false); if(!hits.length)return null;
  const h=hits[0];
  const blocked=firstSolidHit(_rc.ray.origin,_rc.ray.direction,h.distance-0.01,cam);
  if(blocked) return null;
  const bot=h.object.userData.bot; let zone=h.object.userData.zone||'body';
  if(zone==='body'){ const loc=bot.body.worldToLocal(h.point.clone()); if(loc.y<bot.legLocalY) zone='legs'; }
  return {bot,zone,dist:h.distance,point:h.point,blocked:false};
}
function showDmg(res){
  const el=$('#dmgFx'); if(!el)return;
  const sp=document.createElement('span');
  if(!res||res.miss){ sp.className='miss'; const z=res&&res.zone; sp.textContent=(!z||z==='head')?'MISS':((z==='legs'?'LEGS':'BODY')+(currentDmg().headOnly?' MISS':'')); }
  else { sp.className=res.zone==='head'?'hs':'ok'; sp.textContent=(res.zone==='head'?'HEAD':res.zone==='legs'?'LEGS':'BODY')+' '+Math.round(res.hpDmg)+(res.killed?' ✕':''); }
  sp.style.left=(50+rnd(-7,7))+'%'; sp.style.top=(46+rnd(-8,4))+'%'; el.appendChild(sp); setTimeout(()=>{ if(sp.parentNode)sp.parentNode.remove(); },600);
}
function syncBotSettings(el){
  const k=el.dataset.bot, v=el.value;
  if(k==='shape') S.bot.shape=v==='bot'?'bot':'dot';
  else if(k==='dmg') S.bot.dmg=M.DMG_IDS.includes(v)?v:'hs';
  else if(k==='stance') S.bot.stance=STANCE_IDS.includes(v)?v:'mix';
  else if(k==='body'||k==='head'){ const h=hexOk(v); if(h) S.bot[k]=h; }
  save(); syncBotUI();
  if(trainBot) paintBot(trainBot,0);
  if(MODE!=='range') syncTrainBot();
  if(MODE==='range') layoutTargets();
  peekBots.forEach(b=>paintBot(b,b.dim));
}
function syncBotUI(){
  if(!S.bot)return;
  $$('[data-bot]').forEach(el=>{
    const k=el.dataset.bot;
    if(k==='shape') el.value=S.bot.shape||'dot';
    else if(k==='dmg') el.value=S.bot.dmg||'hs';
    else if(k==='stance') el.value=STANCE_IDS.includes(S.bot.stance)?S.bot.stance:'mix';
    else if(k==='body'||k==='head') el.value=hexOk(S.bot[k])||(k==='head'?'#00e8ff':'#f4f6f8');
  });
}
document.addEventListener('change',e=>{ if(e.target&&e.target.dataset&&e.target.dataset.bot) syncBotSettings(e.target); });
document.addEventListener('input',e=>{ const t=e.target; if(t&&t.dataset&&(t.dataset.bot==='body'||t.dataset.bot==='head')) syncBotSettings(t); });
function ensureTrainBot(){ if(!trainBot) trainBot=makeBot(scene); return trainBot; }
function syncTrainBot(){
  const want=useBots()&&MODE!=='range'&&MODE!=='flash';
  if(!want){ if(trainBot) hideBot(trainBot); return; }
  const b=ensureTrainBot();
  let sc=Math.max(0.12,tgt.scale.x/BOT_HEAD_R);
  const maxS=(tgt.position.y-FLOOR_Y-0.02)/BOT_HEAD_Y; if(maxS>0.2) sc=Math.min(sc,maxS);
  scaleBot(b,sc); placeBotHead(b,tgt.position.x,tgt.position.y,tgt.position.z);
  b.group.visible=!!tgt.visible||(!!R&&R.phase==='run'&&!b.dead);
  if(b.group.visible) tgt.visible=false;
}
function clearPeekBots(){ peekBots.splice(0).forEach(disposeBot); }

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
function placeTarget(ty,tp,radDeg){ tp=M.clampPitch(tp,DIST,radDeg,FLOOR_Y,CEIL_Y); const d=dirFrom(ty,tp).multiplyScalar(DIST); tgt.position.copy(d); tgt.scale.setScalar(M.targetRadius(DIST,radDeg)); tgt.visible=true; if(useBots()&&MODE!=='range'&&MODE!=='flash'){ const b=ensureTrainBot(); if(R&&R.t&&R.t._armed!==R.t){ armBot(b); paintBot(b,0); R.t._armed=R.t; R.t.nShots=0; applyBotStance(b, planStanceToggles(pickStanceKind(), performance.now(), 0, 4000, null, {auto:true,max:8}), performance.now()); } if(R&&R.tr&&!R.t){ if(R.tr._armed!==R.tr){ armBot(b); paintBot(b,0); R.tr._armed=R.tr; applyBotStance(b, planStanceToggles(pickStanceKind(), performance.now(), 0, (R.segments[R.si]&&R.segments[R.si].dur||8)*1000+800, null, {auto:true,max:12}), performance.now()); } } let sc=Math.max(0.12,tgt.scale.x/BOT_HEAD_R); const maxS=(tgt.position.y-FLOOR_Y-0.02)/BOT_HEAD_Y; if(maxS>0.2) sc=Math.min(sc,maxS); scaleBot(b,sc); placeBotHead(b,tgt.position.x,tgt.position.y,tgt.position.z); b.group.visible=true; tgt.visible=false; } else if(trainBot) hideBot(trainBot); return tp;}

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
  if(MODE==='flash'){ if(locked!==stage){ if(!ok())return alert('Fill in the converter first.'); if(FL&&(FL.phase==='pause'||FL.phase==='ready')) lockEl(stage).then(()=>{ if(document.pointerLockElement!==stage)return; if(FL.phase==='pause'){FL.phase='run';hideOv();FL.last=performance.now();} else flashCountdown(); }); } else flashShoot(); return; }
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
  R={segments,si:0,cm,onDone,label,phase:'ready',fpsAcc:0,fpsN:0,st:{clicks:0,hits:0,ttk:[],land:[],over:0,under:0,on:0,trackT:0,lead:0,leadN:0,trOver:0,trUnder:0,react:[],hs:0,stk:[],botMode:useBots()}};
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
  R.st.clicks++; R.t.nShots=(R.t.nShots||0)+1;
  if(useBots()&&trainBot){
    const pick=pickBots([trainBot],camera);
    if(!pick){ showDmg(null); hitFx('miss'); beep(180,0.05,'square',0.03); if(!R.t.landed) recordLanding(); return; }
    const res=M.applyHit(currentDmg(),trainBot.state,pick.zone); showDmg(res);
    if(res.miss){ hitFx('miss'); beep(180,0.05,'square',0.03); if(!R.t.landed) recordLanding(); return; }
    recordLanding(); R.st.hits++; if(pick.zone==='head') R.st.hs++;
    if(res.killed){ R.st.ttk.push(performance.now()-R.t.t0); R.st.stk.push(R.t.nShots); hideBot(trainBot); flash(); hitFx('hit'); beep(1320,0.05,'triangle'); s.done++; if(s.done>=s.count) nextSeg(); else spawn(); }
    else { hitFx('hit'); beep(880,0.04,'triangle',0.04); }
    return;
  }
  const e=angErr(R.t.ty,R.t.tp);
  if(e.ang<=R.t.rad){ recordLanding(); R.st.hits++; R.st.ttk.push(performance.now()-R.t.t0); flash(); hitFx('hit'); beep(1320,0.05,'triangle'); s.done++; if(s.done>=s.count) nextSeg(); else spawn(); }
  else { hitFx('miss'); beep(180,0.05,'square',0.03); if(!R.t.landed) recordLanding(); } }
function flash(){tgtMat.emissive.setHex(0xffffff);setTimeout(()=>tgtMat.emissive.setHex(tgtEmHex),60);}
function nextSeg(){ R.si++; tgt.visible=false; if(trainBot) hideBot(trainBot); if(R.si>=R.segments.length) return finish(); startSeg(); }
function step(now){ const dt=Math.min(0.05,(now-R.last)/1000); R.last=now; const s=R.segments[R.si]; if(!s)return;
  if(useBots()&&trainBot&&!trainBot.dead){ stepBotStance(trainBot,now); stepCrouch(trainBot,dt); }
  if(s.type==='track'){ const T=R.tr; T.el+=dt;
    if(T.el>=T.next){T.next=T.el+rnd(0.5,1.4); const sp=rnd(22,62), th=Math.random()<0.75?(Math.random()<0.5?0:Math.PI)+rnd(-0.35,0.35):rnd(0,Math.PI*2); T.ty=Math.cos(th)*sp; T.tp=Math.sin(th)*sp*0.5;}
    const k=1-Math.exp(-dt*6); T.vy+=(T.ty-T.vy)*k; T.vp+=(T.tp-T.vp)*k; T.yaw+=T.vy*dt; T.pitch+=T.vp*dt;
    const b=M.bouncePitch(T.pitch,T.vp,DIST,1.3,FLOOR_Y,CEIL_Y); T.pitch=b.pitch; T.vp=b.vp;
    if(T.pitch<=b.lim.min+0.15) T.tp=Math.abs(T.tp); if(T.pitch>=b.lim.max-0.15) T.tp=-Math.abs(T.tp);
    placeTarget(T.yaw,T.pitch,1.3);
    if(T.el>0.6){ R.st.trackT+=dt; const e=angErr(T.yaw,T.pitch); let on=e.ang<=1.3; if(useBots()&&trainBot){ const p=pickBots([trainBot],camera); const model=currentDmg(); on=!!(p&&(!model.headOnly||p.zone==='head')); } if(on)R.st.on+=dt;
      const v=Math.hypot(T.vy,T.vp); if(v>8&&e.ang<6){ const lead=-(e.dx*T.vy+e.dy*T.vp)/v; R.st.lead+=lead;R.st.leadN++; if(!on){ if(lead>0)R.st.trOver+=dt; else R.st.trUnder+=dt; } } }
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
  const acc=st.clicks?st.hits/st.clicks:0, ttk=st.ttk.length?st.ttk.reduce((a,b)=>a+b,0)/st.ttk.length:NaN, hsPct=st.botMode&&st.hits?100*(st.hs||0)/st.hits:NaN, stk=st.botMode&&st.stk&&st.stk.length?st.stk.reduce((a,b)=>a+b,0)/st.stk.length:NaN;
  const flick=st.ttk.length?Math.min(130,100*acc*500/Math.max(250,ttk)):null;
  const track=st.trackT?100*st.on/st.trackT:null;
  const parts=[flick,track].filter(x=>x!=null); const score=parts.reduce((a,b)=>a+b,0)/parts.length;
  const nl=st.over+st.under+st.land.filter(x=>x===0).length;
  const bF=nl?(st.over-st.under)/nl:null; const bT=st.leadN?Math.max(-1,Math.min(1,(st.lead/st.leadN)/1.3)):null;
  const bs=[bF,bT].filter(x=>x!=null); const bias=bs.length?bs.reduce((a,b)=>a+b,0)/bs.length:0;
  const react=st.react&&st.react.length?st.react.reduce((a,b)=>a+b,0)/st.react.length:NaN;
  return {score,acc,ttk,flick,track,bias,over:st.over,under:st.under,trOver:st.trOver,trUnder:st.trUnder,react,hsPct,stk,hs:st.hs||0};
}
function finish(){ const res=Object.assign(scoreOf(R.st),{cm:R.cm,label:R.label,fps:R.fpsN?Math.round(1000/(R.fpsAcc/R.fpsN)):null}); R.phase='done'; tgt.visible=false; if(trainBot) hideBot(trainBot); clearHud(); if(document.pointerLockElement===stage)document.exitPointerLock();
  beep(660,0.12); const cb=R.onDone; R=null; cb(res); }
function loop(now){ requestAnimationFrame(loop); measure(now);
  if(!shouldDraw(now))return;
  const ft=F.lastDraw?now-F.lastDraw:0; F.lastDraw=now; F.ft=F.ft?F.ft*0.9+ft*0.1:ft;
  if(MODE==='range'){ if(RG&&RG.phase==='run')rangeStep(now); rangeCam.rotation.set(rview.pitch*D2R,rview.yaw*D2R,0); vmAnim(now); renderer.render(rscene,rangeCam); }
  else { if(R&&R.phase==='run'){ step(now); if(R){R.fpsAcc+=ft;R.fpsN++;} }
    if(FL&&FL.phase==='run') flashStep(now);
    camera.position.copy(camEye); camera.rotation.set(view.pitch*D2R,view.yaw*D2R,0); renderer.render(scene,camera); }
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
function showRes(r){ $('#lastRound').innerHTML=[['Score',Math.round(r.score)],['Accuracy',r.flick!=null?Math.round(r.acc*100)+'%':'—'],['Time-to-hit',Number.isFinite(r.ttk)?Math.round(r.ttk)+' ms':'—'],['First shot',Number.isFinite(r.react)?Math.round(r.react)+' ms':'—'],['On target',r.track!=null?Math.round(r.track)+'%':'—'],['Headshot %',Number.isFinite(r.hsPct)?Math.round(r.hsPct)+'%':'—'],['Avg STK',Number.isFinite(r.stk)?r.stk.toFixed(1):'—'],['Overshoot / undershoot',r.flick!=null?`${r.over} / ${r.under}`:`${r.trOver.toFixed(1)}s / ${r.trUnder.toFixed(1)}s`],['Tendency',biasTxt(r.bias)],['Avg FPS',r.fps||'—']]
  .map(([k,v])=>`<div class="card stat"><div class="k">${k}</div><div class="v" style="font-size:22px">${v}</div></div>`).join(''); }
function addHist(drill,r){ store.history.unshift({at:Date.now(),drill,cm:r.cm,score:r.score,acc:r.acc,ttk:r.ttk,react:r.react,track:r.track,over:r.over,under:r.under,bias:r.bias,fps:r.fps,hsPct:r.hsPct,stk:r.stk}); store.history=store.history.slice(0,200); save(); }
function bestOf(drill){ if(!drill)return 0; return store.history.filter(h=>h.drill===drill).reduce((m,h)=>Math.max(m,+h.score||0),0); }
function renderDrillBests(){ $$('#drills .best').forEach(el=>{ const b=bestOf(el.dataset.best); el.textContent=b?('Best '+Math.round(b)):''; }); }
function cell(k,v){ return `<div><div class="k">${k}</div><div class="v">${v}</div></div>`; }
function showRoundOv(kind,res){
  const cells=[];
  if(res.flick!=null) cells.push(cell('Accuracy',Math.round(res.acc*100)+'%'), cell('Time-to-hit',Number.isFinite(res.ttk)?Math.round(res.ttk)+' ms':'—'), cell('First shot',Number.isFinite(res.react)?Math.round(res.react)+' ms':'—'));
  if(res.track!=null) cells.push(cell('On target',Math.round(res.track)+'%'), cell('Over / under',`${res.trOver.toFixed(1)}s / ${res.trUnder.toFixed(1)}s`));
  if(res.flick!=null) cells.push(cell('Over / under',`${res.over} / ${res.under}`));
  if(Number.isFinite(res.hsPct)||Number.isFinite(res.stk)) cells.push(cell('Headshot %',Number.isFinite(res.hsPct)?Math.round(res.hsPct)+'%':'—'), cell('Avg STK',Number.isFinite(res.stk)?res.stk.toFixed(1):'—'));
  cells.push(cell('Tendency',biasTxt(res.bias)));
  const best=bestOf(kind);
  const badge=res.isBest?'<div class="badge">NEW BEST</div>':(best?`<div class="subscore">Best ${Math.round(best)}</div>`:'');
  const title=kind[0].toUpperCase()+kind.slice(1);
  showOv(`<div class="subscore">${esc(title)}</div><div class="big">${Math.round(res.score)}</div>${badge}<div class="resgrid">${cells.join('')}</div><div class="small muted">Click the arena or press Start to go again</div>`);
}
function clearHud(){ const a=$('#ahud'); if(a){ a.classList.remove('show'); ['hudV1','hudV2','hudV3'].forEach(id=>{const e=$('#'+id); if(e)e.textContent='—';}); } const c=$('#hudCm'); if(c)c.textContent=''; }
function abandonArenaRound(){ if(R){ R=null; tgt.visible=false; } if(trainBot) hideBot(trainBot); clearHud(); if(document.pointerLockElement===stage) document.exitPointerLock(); }
function hitFx(kind){ const el=$('#hitFx'); if(!el)return; el.className=''; void el.offsetWidth; el.className=kind==='miss'?'miss':'hit';
  if(currentXH().dynamic){ xhKick=1; drawCurrentXH(); } }

function renderRangeHist(){ const rows=store.rangeHistory.map(h=>`<tr><td>${new Date(h.at).toLocaleString()}</td><td><b>${h.points}</b></td><td>${h.shots?Math.round(100*h.hits/h.shots)+'%':'—'}</td><td>${h.hits} / ${h.shots}</td><td>${h.tth?Math.round(h.tth)+' ms':'—'}</td><td class="small">${esc(h.setup)}</td><td>${fmt(h.cm,1)}</td></tr>`).join(''); const el=$('#rhist'); if(el)el.innerHTML=rows||'<tr><td colspan="7" class="muted">No range runs yet.</td></tr>'; }
function scnName(id){ return (typeof SCN!=='undefined'&&SCN[id])?SCN[id].name:(id||'—'); }
function renderFlashHist(){ const el=$('#fhist'); if(!el)return; const ms=v=>Number.isFinite(v)?Math.round(v)+' ms':'—', pct=v=>Number.isFinite(v)?Math.round(v)+'%':'—';
  const rows=(store.flashHistory||[]).map(h=>{
    const kills=h.dots!=null?`${h.botKills||0}/${h.dots}`:(h.kills||0);
    const acc=h.dotShots?pct(100*(h.dotHits||0)/h.dotShots):(h.acc!=null?pct(h.acc*100):'—');
    return `<tr><td>${new Date(h.at).toLocaleString()}</td><td>${esc(scnName(h.scn))}</td><td>${h.preset==='cs2'?'CS2-style':'Valorant-style'}</td><td><b>${Math.round(h.score)}</b></td><td>${h.dodged}</td><td>${h.partial}</td><td>${h.full}</td><td>${h.covered||0}</td><td>${Math.round(h.dodgePct)}%</td><td>${kills}</td><td>${ms(h.firstHit)}</td><td>${acc}</td><td>${pct(h.hsPct)}</td><td>${Number.isFinite(h.stk)?(+h.stk).toFixed(1):'—'}</td><td>${ms(h.ttk)}</td><td>${ms(h.react)}</td><td>${fmt(h.cm,1)}</td></tr>`;
  }).join(''); el.innerHTML=rows||'<tr><td colspan="17" class="muted">No flash rounds yet.</td></tr>'; }
function bestFlash(key, kind){ // kind: 'preset' | 'scn'
  return (store.flashHistory||[]).filter(h=>kind==='scn'?h.scn===key:h.preset===key).reduce((m,h)=>Math.max(m,+h.score||0),0); }
function renderFlashBests(){ $$('#flashPresets .best').forEach(el=>{ const b=bestFlash(el.dataset.fbest,'preset'); el.textContent=b?('Best '+Math.round(b)):''; }); $$('#flashScn .best').forEach(el=>{ const b=bestFlash(el.dataset.sbest,'scn'); el.textContent=b?('Best '+Math.round(b)):''; }); }
function renderHist(){ renderRangeHist(); renderDrillBests(); renderFlashHist(); renderFlashBests(); const pb=$('#pbests'); if(pb){ const tile=(k,v)=>`<div class="card stat"><div class="k">${k}</div><div class="v">${v||'—'}</div></div>`;
    pb.innerHTML=tile('Flick best',bestOf('flick')||'')+tile('Tracking best',bestOf('track')||'')+tile('Micro best',bestOf('micro')||'')+tile('Range best',bestPts()||'')+tile('Flash (Val) best',bestFlash('val','preset')||'')+tile('Flash (CS2) best',bestFlash('cs2','preset')||''); }
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
  if(m!=='flash'){ if(typeof unloadScn==='function') unloadScn(); camEye.set(0,0,0); }
  if(m==='range'){ setRangeFov(); rangeOverlay(); }
  else if(m==='flash'){ clearHud(); $('#ov').classList.remove('begin'); if(typeof previewScn==='function') previewScn(); if(!FL||FL.phase==='done') flashIdleOv(); }
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
const rangeWalls=[];
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
  rangeWalls.length=0;
  const addRS=(x,y,z,sx,sy,sz,role)=>{ rangeWalls.push({min:new THREE.Vector3(x-sx/2,y-sy/2,z-sz/2),max:new THREE.Vector3(x+sx/2,y+sy/2,z+sz/2),role:role||'wall'}); };
  [-1,1].forEach(s=>addRS(s*(W/2+0.2),2.1,-L/2+3,0.4,4.2,L+6));
  addRS(0,3,-L+0.2,W+0.8,6,0.4); addRS(0,2.1,3.2,W+0.8,4.2,0.4);
  addRS(0,-0.06,-L/2+3,W,0.12,L+6,'floor');
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
function clearTargets(){ rTargets.splice(0).forEach(t=>{ if(t.bot) disposeBot(t.bot); else if(t.mesh) rscene.remove(t.mesh); }); }
function rTgtHead(t){ if(t.bot){ const v=new THREE.Vector3(); t.bot.head.getWorldPosition(v); return v; } return t.mesh.position; }
function placeRT(t){ const r=S.range.size; let tries=0,x,y;
  do{ x=rnd(-RB.x+r,RB.x-r); y=rnd(RB.yMin+r,RB.yMax-r); tries++; } while(tries<40&&rTargets.some(o=>o!==t&&Math.hypot((o.x??rTgtHead(o).x)-x,(o.y0??rTgtHead(o).y)-y)<r*3.5));
  t.x=x; t.y0=y; t.vx=(Math.random()<0.5?-1:1)*S.range.speed; t.ph=rnd(0,6.28); t.born=performance.now(); t.fired=0;
  if(t.bot){ scaleBot(t.bot,Math.max(0.15,r/BOT_HEAD_R));
    if(!t.bot.stanceKind){
      const others=rTargets.filter(o=>o!==t&&o.bot&&!o.bot.dead).map(o=>o.bot.stanceKind).filter(Boolean);
      let kind=pickStanceKind();
      if(botStanceMode()==='mix'&&others.length){
        const hasStand=others.some(k=>k==='stand'), hasLow=others.some(k=>k==='crouch'||k==='switch');
        if(!hasStand) kind='stand'; else if(!hasLow) kind=(Math.random()<0.5)?'switch':'crouch';
      }
      applyBotStance(t.bot, planStanceToggles(kind, performance.now(), 0, 12000, null, {auto:true,max:16}), performance.now());
    }
    placeBotHead(t.bot,x,y,RB.z+r); t.footY=t.bot.group.position.y; armBot(t.bot); paintBot(t.bot,0); t.mesh=t.bot.group; }
  else { t.mesh.scale.setScalar(r); t.mesh.position.set(x,y,RB.z+r); }
}
function layoutTargets(){ clearTargets(); for(let i=0;i<S.range.count;i++){ let t; if(useBots()){ const bot=makeBot(rscene); t={bot,mesh:bot.group,isBot:true}; } else { t={mesh:new THREE.Mesh(rTgtGeo,rTgtMat())}; rscene.add(t.mesh); } rTargets.push(t); }
  const bots=rTargets.filter(t=>t.bot); const kinds=assignGroupStances(bots.length);
  bots.forEach((t,i)=>applyBotStance(t.bot, planStanceToggles(kinds[i], performance.now(), 0, 12000, null, {auto:true,max:16}), performance.now()));
  rTargets.forEach(placeRT); }
function rangeOverlay(){ const o=$('#ov'); o.classList.add('begin');
  if(RG&&RG.phase==='pause') showOv(`<div class="big">PAUSED</div><div>Click to continue · ${fmtT(RG.remaining)} left</div>`);
  else if(RG&&RG.last&&RG.result){ const r=RG.result; showOv(`<div class="big">CLICK TO BEGIN</div><div style="font-size:20px;font-weight:800">Last run: ${r.points} points · ${r.shots?Math.round(100*r.hits/r.shots):0}% accuracy</div><div class="small">${r.best?'New best! 🎯':'Best: '+bestPts()+' points'}</div>`); }
  else showOv(`<div class="big">CLICK TO BEGIN</div><div class="small">${fmtT(S.range.dur*1000)} timed run · Esc to pause</div>`); }
const fmtT=ms=>{ const s=Math.max(0,Math.ceil(ms/1000)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
const bestPts=()=>store.rangeHistory.reduce((m,h)=>Math.max(m,h.points),0);
function rangeBeginOrResume(){ if(RG&&RG.phase==='pause'){ RG.phase='run'; RG.last=performance.now(); hideOv(); return; }
  RG={phase:'run',remaining:S.range.dur*1000,last:performance.now(),points:0,hits:0,shots:0,tth:[],cm:currentCm(),result:null,hs:0,stk:[],kills:0};
  rview.yaw=0; rview.pitch=2; layoutTargets(); hideOv(); rhud(); beep(880,0.08); }
function rangeShoot(){ if(!RG||RG.phase!=='run')return; RG.shots++; vmKick=1;
  if(useBots()){
    const pick=pickBots(rTargets.map(t=>t.bot),rangeCam);
    if(!pick){ showDmg(null); hitFx('miss'); beep(170,0.05,'square',0.025); rhud(); return; }
    const t=rTargets.find(x=>x.bot===pick.bot);
    const res=M.applyHit(currentDmg(),pick.bot.state,pick.zone); showDmg(res);
    if(res.miss){ hitFx('miss'); beep(170,0.05,'square',0.025); rhud(); return; }
    t.fired=(t.fired||0)+1; RG.hits++; if(pick.zone==='head') RG.hs++;
    if(res.killed){ const tth=performance.now()-t.born; RG.tth.push(tth); RG.stk.push(t.fired); RG.kills++; RG.points+=100+Math.max(0,Math.round((1000-tth)/20)); beep(1250,0.05,'triangle'); hitFx('hit'); if(t.bot) t.bot.stanceKind=null; placeRT(t); }
    else { hitFx('hit'); beep(880,0.04,'triangle',0.04); }
    rhud(); return;
  }
  const o=new THREE.Vector3(); rangeCam.getWorldPosition(o); const d=new THREE.Vector3(); rangeCam.getWorldDirection(d);
  let best=null,bd=Infinity; for(const t of rTargets){ const c=t.mesh.position, r=S.range.size; const oc=c.clone().sub(o); const tc=oc.dot(d); if(tc<0)continue; const d2=oc.lengthSq()-tc*tc; if(d2<=r*r&&tc<bd){bd=tc;best=t;} }
  if(best){ const tth=performance.now()-best.born; RG.tth.push(tth); RG.hits++; RG.points+=100+Math.max(0,Math.round((1000-tth)/20)); beep(1250,0.05,'triangle');
    best.mesh.material.emissive.setHex(0xffffff); const m=best.mesh.material; setTimeout(()=>m.emissive.setHex(0),50); hitFx('hit'); placeRT(best); }
  else { hitFx('miss'); beep(170,0.05,'square',0.025); }
  rhud(); }
function rangeStep(now){ const dt=Math.min(0.05,(now-RG.last)/1000); RG.last=now; RG.remaining-=dt*1000;
  for(const t of rTargets){ if(t.bot&&!t.bot.dead){ stepBotStance(t.bot,now); stepCrouch(t.bot,dt); } }
  if(S.range.moving) for(const t of rTargets){ const r=S.range.size; t.x=(t.x??rTgtHead(t).x)+t.vx*dt; if(t.x>RB.x-r){t.x=RB.x-r;t.vx=-Math.abs(t.vx);} if(t.x<-RB.x+r){t.x=-RB.x+r;t.vx=Math.abs(t.vx);} t.ph+=dt*1.3; const y=Math.max(RB.yMin+r,Math.min(RB.yMax-r,t.y0+Math.sin(t.ph)*0.35*S.range.speed)); if(t.bot){ const foot=(t.footY!=null?t.footY:(y-(botCrouchHeadY(t.bot))*t.bot.scale))+(y-(t.y0||y)); placeBotFeet(t.bot,t.x,foot,RB.z+r); } else t.mesh.position.set(t.x,y,RB.z+r); }
  if(RG.remaining<=0) return rangeEnd(); if((RG.fr=(RG.fr||0)+1)%4===0) rhud(); }
function rhud(){ $('#rPts').textContent=RG?RG.points:0; $('#rTime').textContent=fmtT(RG?RG.remaining:S.range.dur*1000); $('#rAcc').textContent=RG&&RG.shots?Math.round(100*RG.hits/RG.shots)+'%':'—'; }
function rangeEnd(){ RG.remaining=0; RG.phase='ready'; rhud(); beep(520,0.2); const prevBest=bestPts();
  const stk=RG.stk&&RG.stk.length?RG.stk.reduce((a,b)=>a+b,0)/RG.stk.length:NaN, hsPct=RG.hits?100*(RG.hs||0)/RG.hits:NaN;
  const h={at:Date.now(),points:RG.points,hits:RG.hits,shots:RG.shots,tth:RG.tth.length?RG.tth.reduce((a,b)=>a+b,0)/RG.tth.length:0,cm:RG.cm,hsPct,stk,kills:RG.kills||0,
    setup:`${S.range.dur}s · size ${S.range.size} · ${S.range.count} tgt${S.range.moving?' · moving '+S.range.speed:''}${useBots()?' · bots · '+(currentDmg().name||S.bot.dmg):''}`};
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
  <div data-botopts="range" class="opts botopts" style="margin-top:8px;padding:0">
    <div><label>Target type</label><select data-bot="shape"><option value="dot" ${S.bot.shape!=='bot'?'selected':''}>Dot (sphere)</option><option value="bot" ${S.bot.shape==='bot'?'selected':''}>Bot (body + head)</option></select></div>
    <div><label>Damage model</label><select data-bot="dmg"><option value="hs">Headshots only</option><option value="val">Valorant, no armor (Vandal)</option><option value="valarm">Valorant, armor (Vandal, heavy shields)</option><option value="cs2">CS2, no armor (AK-47)</option><option value="cs2arm">CS2, armor (AK-47, kevlar + helmet)</option></select></div>
    <div><label>Bot stance</label><select data-bot="stance"><option value="mix"${S.bot.stance==='mix'||!S.bot.stance?' selected':''}>Mix (default)</option><option value="stand"${S.bot.stance==='stand'?' selected':''}>Standing only</option><option value="crouch"${S.bot.stance==='crouch'?' selected':''}>Crouch only</option><option value="switch"${S.bot.stance==='switch'?' selected':''}>Switching only</option></select></div>
    <div><label>Bot body</label><input type="color" data-bot="body" value="${esc(S.bot.body||'#f4f6f8')}"></div>
    <div><label>Bot head</label><input type="color" data-bot="head" value="${esc(S.bot.head||'#00e8ff')}"></div>
  </div>
  <div class="xhedit" data-xhedit></div>
  <label>Best runs</label><table>${top.map(h=>`<tr><td><b>${h.points}</b></td><td>${h.shots?Math.round(100*h.hits/h.shots):0}%</td><td class="muted">${new Date(h.at).toLocaleDateString()}</td></tr>`).join('')||'<tr><td class="muted">No runs yet</td></tr>'}</table>
  <label>Recent</label><table>${rec.map(h=>`<tr><td>${h.points}</td><td>${h.shots?Math.round(100*h.hits/h.shots):0}%</td><td class="muted small">${esc(h.setup)}</td></tr>`).join('')||'<tr><td class="muted">—</td></tr>'}</table>`;
  fillXHEditors(); syncBotUI(); }
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
  camera.position.copy(camEye); camera.rotation.set(view.pitch*D2R,view.yaw*D2R,0); camera.updateMatrixWorld();
  rangeCam.rotation.set(rview.pitch*D2R,rview.yaw*D2R,0); rangeCam.updateMatrixWorld();
}
function sampleHints(){
  applyCams();
  const out=[];
  if(MODE==='range'){
    if(RG&&RG.phase==='run') for(const t of rTargets){ const vis=t.bot?(t.bot.group.visible&&!t.bot.dead):(t.mesh&&t.mesh.visible); if(vis) out.push(Object.assign(worldToHint(rTgtHead(t),rangeCam),{r:S.range.size})); }
  } else if(R&&R.phase==='run'&&(tgt.visible||(useBots()&&trainBot&&trainBot.group.visible))){
    const pos=(useBots()&&trainBot)?trainBot.head.getWorldPosition(new THREE.Vector3()):tgt.position; out.push(Object.assign(worldToHint(pos,camera),{r:tgt.scale.x}));
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
const FDIFF={
  easy:{val:0.55,cs2:2.0,spread:80,gap:[0.45,1.40],valRange:[0.45,0.60],cs2Range:[1.60,2.00]},
  normal:{val:0.42,cs2:1.5,spread:120,gap:[0.28,1.05],valRange:[0.32,0.50],cs2Range:[1.35,1.80]},
  hard:{val:0.30,cs2:1.1,spread:160,gap:[0.16,0.70],valRange:[0.25,0.38],cs2Range:[1.20,1.50]}
};
function useFlashRand(){ return !FL||FL.rand==null ? S.flash.rand!==false : !!FL.rand; }
function makeRng(seed){ let a=((+seed||1)>>>0)||1; return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function flashSeed(seed){ const s=(seed==null?((Math.random()*0xffffffff)|0):(+seed>>>0))||1; if(FL){ FL.seed=s; FL.rng=makeRng(s); } return s; }
function frand(){ if(FL&&!FL.rng) flashSeed(FL.seed); return (FL&&FL.rng)?FL.rng():Math.random(); }
function frange(a,b){ return a+(b-a)*frand(); }
function fint(a,b){ return a+Math.floor(frand()*(b-a+1)); }
function fshuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(frand()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function fuseMinMs(diff,preset){ const d=FDIFF[diff]||FDIFF.normal; return ((preset==='cs2'?d.cs2Range:d.valRange)[0])*1000; }

const SCN_IDS=['hall','hold','anchor','entry','retake','overwall','mid','ramp'];
const SCN={
  hall:{id:'hall',name:'Long-doors-style hallway',auto:true,pathDur:2.8},
  hold:{id:'hold',name:'Choke hold',auto:false},
  anchor:{id:'anchor',name:'Site anchor',auto:false},
  entry:{id:'entry',name:'Site entry choke',auto:true,pathDur:2.4},
  retake:{id:'retake',name:'Off-angle retake',auto:false},
  overwall:{id:'overwall',name:'Over-wall pop',auto:false},
  mid:{id:'mid',name:'Mid-window cross',auto:false},
  ramp:{id:'ramp',name:'Ramp walk',auto:true,pathDur:2.6},
  mix:{id:'mix',name:'Random mix'}
};
const FY=()=>FLOOR_Y+0.05;
let scnGroup=null, scnWalls=[], scnMeta=null, scnId=null, keysHeld={};

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
function flashAngle(pos){ const dir=dirFrom(view.yaw,view.pitch); const to=pos.clone().sub(camEye); if(to.lengthSq()<1e-8)return 180; to.normalize(); return Math.acos(Math.min(1,Math.max(-1,dir.dot(to))))/D2R; }
function flashFactor(ang){ const safe=+S.flash.safe||90; if(ang>=safe)return 0; if(ang<=20)return 1; const t=(ang-20)/(safe-20); return Math.max(0,1-t*t); }
function flashIdleOv(){
  const sc=SCN[S.flash.scn]||SCN.hall;
  showOv(`<div class="big">Flash dodge</div><div class="muted">${esc(sc.name)} · ${S.flash.preset==='cs2'?'CS2-style':'Valorant-style'} timing</div><div class="small muted">Press Start, then click the arena to lock and begin. Turn away past 90° before the pop, then shoot the bots as they push out.</div>`);
}
function syncFlashUI(){
  const f=S.flash;
  $$('#flashPresets button').forEach(b=>b.classList.toggle('on',b.dataset.fp===f.preset));
  $$('#flashScn button').forEach(b=>b.classList.toggle('on',b.dataset.scn===f.scn));
  const d=$('#flashDiff'); if(d)d.value=f.diff;
  const c=$('#flashCount'); if(c)c.value=String(f.count);
  const a=$('#flashAudio'); if(a)a.checked=!!f.audio;
  const r=$('#flashReduced'); if(r)r.checked=!!f.reduced;
  const v=$('#flashTvol'); if(v)v.value=f.tVol;
  const lab=$('#flashTvolLab'); if(lab)lab.textContent=Math.round(f.tVol*100)+'%';
  const w=$('#flashWasd'); if(w)w.checked=!!f.wasd;
  const rnd=$('#flashRand'); if(rnd)rnd.checked=f.rand!==false;
  renderFlashBests();
}
function persistFlash(){ save(); syncFlashUI(); }
$('#flashPresets').addEventListener('click',e=>{ const b=e.target.closest('button[data-fp]'); if(!b)return; S.flash.preset=b.dataset.fp; persistFlash(); });
$('#flashScn').addEventListener('click',e=>{
  const b=e.target.closest('button[data-scn]'); if(!b)return;
  S.flash.scn=b.dataset.scn; persistFlash();
  if(MODE==='flash'&&(!FL||FL.phase==='done'||FL.phase==='ready'||!FL)) previewScn();
});
$('#flashDiff').onchange=()=>{S.flash.diff=$('#flashDiff').value;persistFlash();};
$('#flashCount').onchange=()=>{S.flash.count=Math.max(1,Math.min(15,+$('#flashCount').value||8));persistFlash();};
$('#flashAudio').onchange=()=>{S.flash.audio=$('#flashAudio').checked;persistFlash();};
$('#flashReduced').onchange=()=>{S.flash.reduced=$('#flashReduced').checked;persistFlash();};
$('#flashWasd').onchange=()=>{S.flash.wasd=$('#flashWasd').checked;persistFlash();};
const _fr=$('#flashRand'); if(_fr)_fr.onchange=()=>{S.flash.rand=_fr.checked;persistFlash();};
$('#flashTvol').oninput=()=>{S.flash.tVol=Math.max(0,Math.min(1,+$('#flashTvol').value||0)); const lab=$('#flashTvolLab'); if(lab)lab.textContent=Math.round(S.flash.tVol*100)+'%'; save();};

function flashCue(kind,factor,pos){
  if(!S.flash.audio)return;
  let freq=700,dur=0.06,typ='square',vol=0.04;
  if(kind==='pop'){ freq=700; dur=0.06; typ='square'; vol=0.04; }
  else if(kind==='throw'){ freq=220; dur=0.08; typ='sawtooth'; vol=0.03; }
  else if(kind==='bang'){ freq=140; dur=0.1; typ='square'; vol=0.05*(factor||1); }
  else return;
  try{
    actx=actx||new AudioContext();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type=typ; o.frequency.value=freq;
    g.gain.setValueAtTime(vol,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
    o.connect(g);
    if(pos){
      const pan=actx.createStereoPanner();
      const to=(pos.clone?pos.clone():new THREE.Vector3(pos.x,pos.y,pos.z)).sub(camEye);
      const f=dirFrom(view.yaw,0), rx=-f.z, rz=f.x, tlen=Math.hypot(to.x,to.z)||1;
      pan.pan.value=Math.max(-1,Math.min(1,(to.x*rx+to.z*rz)/tlen));
      g.connect(pan).connect(actx.destination);
    }else g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime+dur);
  }catch(e){}
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
  const modal=$('#flashWarnModal');
  if(!modal){ S.flash.warned=true; go(); return; }
  modal.classList.remove('hide');
  const bind=(id,reduced)=>{ const b=$(id); if(!b)return; b.onclick=ev=>{ ev.stopPropagation(); S.flash.warned=true; S.flash.reduced=reduced; persistFlash(); modal.classList.add('hide'); go(); }; };
  bind('#flashWarnReduced',true); bind('#flashWarnFull',false);
}

function scnCols(){
  const e=S.env;
  if(e==='day') return {wall:0x6a7684,wall2:0x5a6570,wall3:0x748090,floor:0x4a5360,crate:0x6a5a48,crate2:0x5a4a3a,trim:0x3a424c,ceil:0x7a8690,beam:0x4a5460,barrel:0x3e4a56,light:0xf2e6c0,line:0x3a424c,plate:0xc9c4b0,accent:0x4a6a5a};
  if(e==='sunrise') return {wall:0x5a4840,wall2:0x4a3a32,wall3:0x6a5048,floor:0x3a2e28,crate:0x5a4030,crate2:0x4a3024,trim:0x2a221c,ceil:0x6a5048,beam:0x3a2a22,barrel:0x4a3830,light:0xffd9a0,line:0x2a2018,plate:0xc4b49a,accent:0x6a4a38};
  return {wall:0x2a3340,wall2:0x1e2732,wall3:0x323c48,floor:0x161c24,crate:0x3a322c,crate2:0x2e2622,trim:0x12181f,ceil:0x1a222c,beam:0x151c24,barrel:0x2a323c,light:0xe8dcb0,line:0x0e141c,plate:0x8a8470,accent:0x2a3a38};
}
function setArenaDecor(on){
  pillars.forEach(p=>{ p.mesh.visible=!!on; });
  if(grid) grid.visible=!!on;
  floor.visible=!!on;
}
const _geoCache=new Map(), _matCache=new Map();
function boxGeo(sx,sy,sz){ const k='b'+sx.toFixed(3)+','+sy.toFixed(3)+','+sz.toFixed(3); if(!_geoCache.has(k)) _geoCache.set(k,new THREE.BoxGeometry(sx,sy,sz)); return _geoCache.get(k); }
function cylGeo(rt,rb,h,seg){ const k='c'+rt.toFixed(3)+','+rb.toFixed(3)+','+h.toFixed(3)+','+(seg||10); if(!_geoCache.has(k)) _geoCache.set(k,new THREE.CylinderGeometry(rt,rb,h,seg||10)); return _geoCache.get(k); }
function matOf(hex,opts){
  const o=opts||{}, em=o.em||0, rough=o.rough!=null?o.rough:(o.role==='floor'?1:0.85), metal=o.metal||0;
  const k=hex+','+em+','+rough+','+metal;
  if(!_matCache.has(k)){ const m=new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal}); if(em){ m.emissive.setHex(hex); m.emissiveIntensity=em; } _matCache.set(k,m); }
  return _matCache.get(k);
}
function pushWall(x,y,z,sx,sy,sz,role){ scnWalls.push({min:new THREE.Vector3(x-sx/2,y-sy/2,z-sz/2),max:new THREE.Vector3(x+sx/2,y+sy/2,z+sz/2),role:role||'wall'}); }
function addBox(x,y,z,sx,sy,sz,hex,role,opts){
  const o=opts||{};
  const m=new THREE.Mesh(boxGeo(sx,sy,sz), matOf(hex,{rough:o.rough,em:o.em,metal:o.metal,role:role}));
  m.position.set(x,y,z); if(o.rotY) m.rotation.y=o.rotY; m.userData.shared=true; scnGroup.add(m);
  if(role!=='decal') pushWall(x,y,z,sx,sy,sz,role||'wall');
  return m;
}
function addFloor(x,z,sx,sz,hex){ const fy=FY(); return addBox(x,fy-0.06,z,sx,0.12,sz,hex,'floor'); }
function addBaseboard(x,z,sx,sz,C){ const fy=FY(); return addBox(x,fy+0.07,z,sx,0.14,sz,C.trim,'trim'); }
function addDoorFrame(x,z,w,h,depth,C,axis){
  const fy=FY(), jamb=0.14, lint=0.18;
  if(axis==='x'){
    addBox(x,fy+h/2,z-w/2-jamb/2,depth,h,jamb,C.trim,'wall');
    addBox(x,fy+h/2,z+w/2+jamb/2,depth,h,jamb,C.trim,'wall');
    addBox(x,fy+h+lint/2,z,depth,lint,w+jamb*2,C.trim,'wall');
  }else{
    addBox(x-w/2-jamb/2,fy+h/2,z,jamb,h,depth,C.trim,'wall');
    addBox(x+w/2+jamb/2,fy+h/2,z,jamb,h,depth,C.trim,'wall');
    addBox(x,fy+h+lint/2,z,w+jamb*2,lint,depth,C.trim,'wall');
  }
}
function addWindowFrame(x,y,z,w,h,depth,C,axis){
  const t=0.1;
  if(axis==='x'){
    addBox(x,y,z-w/2-t/2,depth,h+t*2,t,C.trim,'wall');
    addBox(x,y,z+w/2+t/2,depth,h+t*2,t,C.trim,'wall');
    addBox(x,y+h/2+t/2,z,depth,t,w,C.trim,'wall');
    addBox(x,y-h/2-t/2,z,depth,t,w,C.trim,'wall');
  }else{
    addBox(x-w/2-t/2,y,z,t,h+t*2,depth,C.trim,'wall');
    addBox(x+w/2+t/2,y,z,t,h+t*2,depth,C.trim,'wall');
    addBox(x,y+h/2+t/2,z,w,t,depth,C.trim,'wall');
    addBox(x,y-h/2-t/2,z,w,t,depth,C.trim,'wall');
  }
}
function addCrate(x,fyOff,z,s,C,hex){ const fy=FY(); return addBox(x,fy+fyOff+s/2,z,s,s,s,hex||C.crate,'crate'); }
function addCrateStack(x,z,C){ addCrate(x,0,z,0.8,C); addCrate(x+0.12,0.8,z+0.05,0.62,C,C.crate2); }
function addBarrel(x,z,C){
  const fy=FY(), r=0.26, h=0.74, y=fy+h/2;
  const m=new THREE.Mesh(cylGeo(r,r*0.96,h,12), matOf(C.barrel,{rough:0.45,metal:0.25}));
  m.position.set(x,y,z); m.userData.shared=true; scnGroup.add(m);
  const hoop=new THREE.Mesh(cylGeo(r+0.01,r+0.01,0.05,12), matOf(C.trim,{rough:0.4,metal:0.35}));
  hoop.position.set(x,y+h*0.28,z); hoop.userData.shared=true; scnGroup.add(hoop);
  pushWall(x,y,z,r*2,h,r*2,'crate');
  return m;
}
function addBeam(x,y,z,sx,sz,C){ return addBox(x,y,z,sx,0.14,sz,C.beam,'wall'); }
function addLightFix(x,y,z,sx,sz,C){ return addBox(x,y,z,sx,0.07,sz,C.light,'wall',{em:1.15,rough:0.35}); }
function addRail(x,y,z,len,axis,C){
  const post=0.07, h=0.55, n=Math.max(2,Math.round(len/1.1));
  if(axis==='x'){
    addBox(x,y+h,z,len,0.05,0.05,C.trim,'wall');
    for(let i=0;i<n;i++){ const px=x-len/2+(i+0.5)*(len/n); addBox(px,y+h/2,z,post,h,post,C.trim,'wall'); }
  }else{
    addBox(x,y+h,z,0.05,0.05,len,C.trim,'wall');
    for(let i=0;i<n;i++){ const pz=z-len/2+(i+0.5)*(len/n); addBox(x,y+h/2,pz,post,h,post,C.trim,'wall'); }
  }
}
function addFloorLines(cx,cz,sx,sz,step,C){
  const fy=FY()+0.008;
  for(let x=cx-sx/2+step;x<cx+sx/2;x+=step) addBox(x,fy,cz,0.025,0.006,sz,C.line,'decal');
  for(let z=cz-sz/2+step;z<cz+sz/2;z+=step) addBox(cx,fy,z,sx,0.006,0.025,C.line,'decal');
}
function addSitePlate(x,z,letter,C){
  const fy=FY()+0.02;
  addBox(x,fy,z,1.3,0.03,1.3,C.plate,'decal');
  const hex=C.trim, y=fy+0.03;
  if(letter==='B'){
    addBox(x-0.22,y,z,0.14,0.04,0.7,hex,'decal');
    addBox(x+0.05,y,z+0.28,0.4,0.04,0.14,hex,'decal');
    addBox(x+0.05,y,z,0.32,0.04,0.12,hex,'decal');
    addBox(x+0.05,y,z-0.28,0.4,0.04,0.14,hex,'decal');
    addBox(x+0.22,y,z+0.14,0.14,0.04,0.28,hex,'decal');
    addBox(x+0.22,y,z-0.14,0.14,0.04,0.28,hex,'decal');
  }else{
    addBox(x,y,z+0.05,0.16,0.04,0.7,hex,'decal');
    addBox(x-0.22,y,z-0.12,0.14,0.04,0.46,hex,'decal');
    addBox(x+0.22,y,z-0.12,0.14,0.04,0.46,hex,'decal');
    addBox(x,y,z-0.18,0.5,0.04,0.12,hex,'decal');
  }
}

function unloadScn(){
  clearPeekBots(); hideGrenade();
  if(scnGroup){
    scnGroup.traverse(o=>{
      if(o.userData&&o.userData.shared) return;
      if(o.geometry&&o.geometry!==botBodyGeo&&o.geometry!==botHeadGeo) o.geometry.dispose();
      if(o.material){ const mats=Array.isArray(o.material)?o.material:[o.material]; mats.forEach(m=>{ if(m&&m.dispose)m.dispose(); }); }
    });
    scene.remove(scnGroup);
  }
  scnGroup=null; scnWalls=[]; scnMeta=null; scnId=null;
  setArenaDecor(true);
}
function tintScn(){ if(!scnId)return; const eye=camEye.clone(), yaw=view.yaw, pitch=view.pitch; loadScn(scnId); camEye.copy(eye); view.yaw=yaw; view.pitch=pitch; }
function placeStart(meta){
  const s=(meta||scnMeta||{}).start||{x:0,y:0,z:0,yaw:0,pitch:2};
  camEye.set(s.x,s.y,s.z); view.yaw=s.yaw; view.pitch=s.pitch;
}
function previewScn(){
  const id=S.flash.scn==='mix'?'hall':(SCN[S.flash.scn]?S.flash.scn:'hall');
  loadScn(id); placeStart(); clearFlashToast(); flashIdleOv();
}
function loadScn(id){
  if(!SCN[id]||id==='mix') id='hall';
  const keep=scnId===id&&scnGroup;
  if(scnGroup){ const eye=camEye.clone(); unloadScn(); /* unload clears id */ camEye.copy(eye); }
  scnGroup=new THREE.Group(); scene.add(scnGroup); scnWalls=[]; scnId=id; setArenaDecor(false);
  const builders={hall:buildHall,hold:buildHold,anchor:buildAnchor,entry:buildEntry,retake:buildRetake,overwall:buildOverwall,mid:buildMid,ramp:buildRamp};
  scnMeta=(builders[id]||buildHall)();
  scnMeta.id=id; scnMeta.name=(SCN[id]||{}).name||id; scnMeta.auto=!!(SCN[id]&&SCN[id].auto);
  if(scnMeta.pathDur==null) scnMeta.pathDur=(SCN[id]&&SCN[id].pathDur)||2.4;
  fixPeekVisibility(scnMeta);
  placeStart(scnMeta);
  return scnMeta;
}


function dressHall(C,fy){
  addBaseboard(-1.72,-6,0.08,24,C); addBaseboard(1.72,-5,0.08,16,C);
  addDoorFrame(0,-6,3.0,2.55-fy,0.28,C,'z');
  for(let z=4;z>=-16;z-=4){ addBeam(0,3.05,z,4.4,0.22,C); if(z>-14) addLightFix(0,3.12,z-1.2,0.9,0.28,C); }
  addFloorLines(0,-6,3.2,20,2.0,C);
  addBarrel(-1.35,0.4,C); addCrateStack(1.25,3.0,C);
  addCrate(8.6,0,-18.9,0.85,C); addBarrel(5.6,-19.6,C);
  addBox(6,1.2,-18.3,0.08,5.2,4.6,C.wall3,'decal');
  addSitePlate(0,3.6,'A',C);
}
function dressHold(C,fy){
  addBaseboard(-4.0,-7,0.1,9,C); addBaseboard(4.0,-7,0.1,9,C);
  for(let z=2;z>=-10;z-=4) addLightFix(0,3.08,z,1.0,0.28,C);
  addBeam(0,3.05,-2,8,0.2,C); addBeam(0,3.05,-8,8,0.2,C);
  addFloorLines(0,-3,8,12,2.2,C);
  addCrateStack(-3.3,-8.6,C); addBarrel(3.4,-10.4,C);
  addSitePlate(0,-9.4,'B',C);
}
function dressAnchor(C,fy){
  addWindowFrame(0,1.4,-8.4,3.8,2.4,0.2,C,'z');
  addWindowFrame(-7.4,1.4,-0.2,2.2,2.4,0.2,C,'x');
  addWindowFrame(7.4,1.4,-0.2,2.2,2.4,0.2,C,'x');
  addBaseboard(0,6.0,14,0.1,C);
  for(const z of [-4,0,4]) addLightFix(0,3.12,z,1.1,0.3,C);
  addBeam(0,3.1,0,12,0.2,C); addBeam(-4,3.1,-1,0.2,10,C); addBeam(4,3.1,-1,0.2,10,C);
  addFloorLines(0,-1,10,10,2.4,C);
  addBarrel(5.6,2.2,C); addCrate(-5.6,0,2.4,0.9,C,C.crate2);
  addSitePlate(0,-3.2,'A',C);
}
function dressEntry(C,fy){
  addDoorFrame(0,-4.1,2.0,2.9-fy,0.28,C,'z');
  addBaseboard(-1.42,3,0.08,9,C); addBaseboard(1.42,3,0.08,9,C);
  for(let z=6;z>=-10;z-=4) addLightFix(0,3.1,z,0.9,0.26,C);
  addBeam(0,3.05,-4.1,10,0.2,C); addBeam(0,3.05,2,3.2,0.2,C);
  addFloorLines(0,3,3.0,8,2.0,C); addFloorLines(0,-7,10,10,2.4,C);
  addBarrel(-4.4,-11.5,C); addCrate(4.4,0,-11.6,0.9,C);
  addSitePlate(0,-11.2,'B',C);
}
function dressRetake(C,fy){
  addDoorFrame(0,-9.2,3.2,2.9-fy,0.28,C,'z');
  addDoorFrame(0,5.6,3.2,2.9-fy,0.28,C,'z');
  addLightFix(0,3.08,-3,1.0,0.28,C); addLightFix(0,3.08,2,1.0,0.28,C);
  addBeam(0,3.05,-3,10,0.2,C);
  addFloorLines(0,0,10,12,2.4,C);
  addCrateStack(-3.4,-2.6,C); addBarrel(2.6,2.4,C);
  addSitePlate(-1.6,2.2,'A',C);
}
function dressOverwall(C,fy){
  addWindowFrame(0,fy+1.5,-5,1.7,1.0,0.18,C,'z');
  addBaseboard(0,6.0,10,0.1,C);
  addLightFix(0,3.1,1.2,1.1,0.3,C); addLightFix(0,3.1,-7.2,1.1,0.3,C);
  addBeam(0,3.05,-5,10,0.2,C);
  addFloorLines(0,-1,8,12,2.2,C);
  addCrateStack(-4.4,2.4,C); addBarrel(4.4,2.6,C); addBarrel(-4.6,-8.2,C);
  addSitePlate(0,4.4,'A',C);
}
function dressMid(C,fy){
  addWindowFrame(0,1.4,3.55,1.7,1.5,0.18,C,'z');
  addWindowFrame(0,1.3,-12.2,1.6,1.4,0.18,C,'z');
  addLightFix(0,3.2,5.0,0.8,0.24,C); addLightFix(0,3.18,-4,1.2,0.3,C);
  addBeam(0,3.18,3.55,12,0.2,C); addBeam(0,3.18,-6,12,0.2,C);
  addFloorLines(0,-2,10,14,2.4,C);
  addBarrel(4.6,-6.2,C); addCrate(4.8,0,-3.4,0.85,C);
  addRail(-2.4,fy+1.1,5.2,3.0,'z',C); addRail(2.4,fy+1.1,5.2,3.0,'z',C);
  addSitePlate(0,-6.8,'B',C);
}
function dressRamp(C,fy){
  addRail(-1.58,fy+0.2,0.2,10.5,'z',C); addRail(1.58,fy+0.2,0.2,10.5,'z',C);
  addDoorFrame(0,-7.7,1.4,2.6-fy,0.24,C,'z');
  addLightFix(0,3.25,2,0.8,0.24,C); addLightFix(0,3.25,-4,0.8,0.24,C);
  addBeam(0,3.25,-2,4,0.2,C);
  addFloorLines(0,5.2,3.2,4,1.6,C);
  addBarrel(1.15,4.6,C);
  addSitePlate(0,-10.4,'A',C);
}

function buildHall(){
  const C=scnCols(), fy=FY();
  addFloor(0,-6,10,28,C.floor); addFloor(6,-18.3,10,6,C.floor);
  addBox(-2.05,1.2,-6,0.7,5.7,26,C.wall,'wall');
  addBox(2.05,1.2,-5,0.7,5.7,18,C.wall,'wall');
  addBox(-0.5,1.2,-18.45,3.6,5.7,0.7,C.wall,'wall');
  addBox(6,1.2,-16.15,8,5.7,0.7,C.wall,'wall');
  addBox(6,1.2,-20.45,9,5.7,0.7,C.wall,'wall');
  addBox(10.3,1.2,-18.3,0.7,5.7,4.8,C.wall,'wall');
  addBox(-1.35,1.2,-6,0.5,5.7,0.4,C.trim,'wall'); addBox(1.35,1.2,-6,0.5,5.7,0.4,C.trim,'wall');
  addBox(0,2.55,-6,3.4,0.5,0.4,C.trim,'wall');
  addBox(0,3.2,-6,5.2,0.3,26,C.ceil,'wall'); addBox(6,3.2,-18.3,9,0.3,5.2,C.ceil,'wall');
  addBox(-1.1,fy+0.45,2.2,0.9,0.9,1.1,C.crate,'crate');
  addBox(4.5,fy+0.45,-19.2,1.0,0.9,1.0,C.crate,'crate');
  dressHall(C,fy);
  return {start:{x:0,y:0,z:4.5,yaw:0,pitch:2},path:[{x:0,y:0,z:4.5},{x:0,y:0,z:-8}],pathDur:2.8,variants:[
    {id:'corner-bounce',throw:{pos:[5.5,1.4,-18.5],vel:[-6.5,4.5,5.5]},pop:{pos:[0.4,1.6,-14]},peeks:[[1.48,fy,-14.2],[1.55,fy,-16.5],[-1.48,fy,-15.2]]},
    {id:'ceiling-pop',throw:{pos:[0.8,1.6,-11],vel:[-0.4,5.5,3.2]},pop:{pos:[0.2,2.4,-8.2]},peeks:[[0,fy,-11.6],[1.48,fy,-6.25],[-1.48,fy,-6.25]]},
    {id:'close-pop',throw:{pos:[2.2,1.2,-10.5],vel:[-4,3.5,2]},pop:{pos:[0.3,1.1,-10.2]},peeks:[[1.48,fy,-12.2],[-1.48,fy,-9.6],[0,fy,-15.8]]}
  ]};
}
function buildHold(){
  const C=scnCols(), fy=FY();
  addFloor(0,-3,14,18,C.floor);
  addBox(-3.1,FY()+1.4,-2,4.6,2.8,0.55,C.wall,'wall'); addBox(3.1,FY()+1.4,-2,4.6,2.8,0.55,C.wall,'wall');
  addBox(0,0.975,-2,1.8,0.35,0.55,C.trim,'wall'); // door opening up to y=0.8
  addBox(-4.2,1.2,-7,0.55,5.5,10.2,C.wall,'wall'); addBox(4.2,1.2,-7,0.55,5.5,10.2,C.wall,'wall');
  addBox(0,1.2,-12.1,8.5,5.5,0.55,C.wall,'wall');
  addBox(0,3.2,-6,9,0.3,14,C.ceil,'wall');
  addBox(-1.15,fy+0.4,2.6,1.1,0.8,0.9,C.crate,'crate');
  addBox(3.3,1.2,-6.8,2.2,5.5,2.2,C.wall2,'wall');
  dressHold(C,fy);
  return {start:{x:0,y:0,z:3.2,yaw:0,pitch:2},variants:[
    {id:'over-wall',throw:{pos:[0,1.4,-8],vel:[0,8.2,6.2]},pop:{pos:[0,1.4,-1.7]},peeks:[[0,fy,-2.62],[1.05,fy,-2.62],[-1.05,fy,-2.62],[0,fy,-7.5]]},
    {id:'through-door',throw:{pos:[0,1.15,-10],vel:[0,3.2,8]},pop:{pos:[0,0.6,-3.2]},peeks:[[0,fy,-2.62],[0.95,fy,-4.5],[-0.95,fy,-4.5]]},
    {id:'side-cubby',throw:{pos:[3.2,1.2,-6.2],vel:[-5,3.4,3]},pop:{pos:[0.3,0.7,-3.0]},peeks:[[2.15,fy,-4.6],[0,fy,-2.62],[-1.05,fy,-2.62]]}
  ]};
}
function buildAnchor(){
  const C=scnCols(), fy=FY();
  addFloor(0,-1,18,16,C.floor);
  addBox(0,1.3,6.2,15,5.6,0.6,C.wall,'wall');
  addBox(-4.7,1.3,-8.4,5.4,5.6,0.6,C.wall,'wall'); addBox(4.7,1.3,-8.4,5.4,5.6,0.6,C.wall,'wall'); addBox(0,3.15,-8.4,4.2,1.3,0.6,C.trim,'wall');
  addBox(-7.4,1.3,-5.3,0.6,5.6,6.4,C.wall,'wall'); addBox(-7.4,1.3,3.2,0.6,5.6,6.2,C.wall,'wall'); addBox(-7.4,3.15,-0.2,0.6,1.3,2.4,C.trim,'wall');
  addBox(7.4,1.3,-5.3,0.6,5.6,6.4,C.wall,'wall'); addBox(7.4,1.3,3.2,0.6,5.6,6.2,C.wall,'wall'); addBox(7.4,3.15,-0.2,0.6,1.3,2.4,C.trim,'wall');
  addBox(0,3.25,-1,16,0.3,16,C.ceil,'wall');
  addBox(-1.4,fy+0.5,-1.6,1.4,1.0,1.4,C.crate,'crate'); addBox(1.6,fy+0.45,1.2,1.2,0.9,1.2,C.crate,'crate');
  dressAnchor(C,fy);
  return {start:{x:0,y:0,z:0.4,yaw:0,pitch:2},variants:[
    {id:'mid-entry',throw:{pos:[0,1.3,-11],vel:[0,4,7]},pop:{pos:[0,1.5,-7.2]},peeks:[[0,fy,-8.85],[-1.35,fy,-8.85],[1.35,fy,-8.85]]},
    {id:'left-entry',throw:{pos:[-11,1.3,-0.2],vel:[7,4,0.4]},pop:{pos:[-6.6,1.4,-0.2]},peeks:[[-7.85,fy,-0.2],[-7.85,fy,1.0],[-7.85,fy,-1.15]]},
    {id:'right-entry',throw:{pos:[11,1.3,-0.2],vel:[-7,4,0.4]},pop:{pos:[6.6,1.4,-0.2]},peeks:[[7.85,fy,-0.2],[7.85,fy,1.0],[7.85,fy,-1.15]]}
  ]};
}
function buildEntry(){
  const C=scnCols(), fy=FY();
  addFloor(0,3,6,10,C.floor); addFloor(0,-7,16,12,C.floor);
  addBox(-1.7,1.2,3,0.55,5.5,10,C.wall,'wall'); addBox(1.7,1.2,3,0.55,5.5,10,C.wall,'wall');
  addBox(-5.6,1.2,-8,0.55,5.5,12,C.wall,'wall'); addBox(5.6,1.2,-8,0.55,5.5,12,C.wall,'wall');
  addBox(0,1.2,-13.8,11.5,5.5,0.55,C.wall,'wall');
  addBox(-3.2,1.55,-4.1,4.2,3.2,0.55,C.wall,'wall'); addBox(3.2,1.55,-4.1,4.2,3.2,0.55,C.wall,'wall');
  addBox(0,3.15,-4.1,2.2,0.5,0.55,C.trim,'wall');
  addBox(3.6,fy+1.35,-8.4,2.2,0.25,2.4,C.trim,'floor'); addBox(3.6,fy+0.7,-8.4,2.0,1.4,2.2,C.crate,'crate');
  addBox(-1.6,fy+0.45,-9.2,1.3,0.9,1.3,C.crate,'crate');
  addBox(0,3.2,-3,16,0.3,20,C.ceil,'wall');
  dressEntry(C,fy);
  return {start:{x:0,y:0,z:5.2,yaw:0,pitch:2},path:[{x:0,y:0,z:5.2},{x:0,y:0,z:-1.2}],pathDur:2.4,variants:[
    {id:'over-front',throw:{pos:[0,1.6,-8],vel:[0,6.5,5]},pop:{pos:[0,2.7,-3.6]},peeks:[[0,fy,-9.0],[-1.2,fy,-4.55],[1.2,fy,-4.55],[-1.5,fy,-9.0]]},
    {id:'rafter',throw:{pos:[3.6,2.6,-8.2],vel:[-3,2,4]},pop:{pos:[1.2,2.4,-5]},peeks:[[1.2,fy,-4.55],[-1.2,fy,-4.55],[0,fy,-11]]},
    {id:'site-box',throw:{pos:[-2,1.4,-11],vel:[2,5,4]},pop:{pos:[-0.4,2.1,-6.4]},peeks:[[-1.2,fy,-4.55],[1.2,fy,-4.55],[0,fy,-11.5]]}
  ]};
}
function buildRetake(){
  const C=scnCols(), fy=FY();
  addFloor(0,0,16,16,C.floor);
  addBox(-5.4,1.25,-2,0.55,5.5,12,C.wall,'wall'); addBox(3.4,1.25,-6.2,0.55,5.5,6.2,C.wall,'wall');
  addBox(-4.2,1.25,-9.2,4.8,5.5,0.55,C.wall,'wall'); addBox(4.2,1.25,-9.2,4.8,5.5,0.55,C.wall,'wall'); addBox(0,3.1,-9.2,3.6,1.2,0.55,C.trim,'wall');
  addBox(-4.2,1.25,5.6,4.8,5.5,0.55,C.wall,'wall'); addBox(4.2,1.25,5.6,4.8,5.5,0.55,C.wall,'wall'); addBox(0,3.1,5.6,3.6,1.2,0.55,C.trim,'wall');
  addBox(6.6,1.25,-1,6,5.5,0.55,C.wall,'wall'); addBox(9.4,1.25,-3,0.55,5.5,5,C.wall,'wall');
  addBox(0,3.2,-1,16,0.3,16,C.ceil,'wall');
  addBox(1.3,fy+0.4,-2.2,1.0,0.8,1.0,C.crate,'crate');
  dressRetake(C,fy);
  return {start:{x:0,y:0,z:0,yaw:0,pitch:2},variants:[
    {id:'side-alley',throw:{pos:[6.2,1.3,-2.4],vel:[-5.5,3.2,1.5]},pop:{pos:[3.2,1.4,-1.6]},peeks:[[3.85,fy,-2.0],[5.5,fy,-2.6],[3.85,fy,0.35]]},
    {id:'rear-hall',throw:{pos:[0,1.3,8],vel:[0,3.5,-6]},pop:{pos:[0.3,1.4,4.6]},peeks:[[0,fy,6.0],[1.15,fy,6.0],[-1.15,fy,6.0]]},
    {id:'front-swing',throw:{pos:[0,1.3,-12],vel:[0,4,6]},pop:{pos:[0,1.5,-7.6]},peeks:[[0,fy,-9.55],[-1.2,fy,-9.55],[1.2,fy,-9.55]]}
  ]};
}
function buildOverwall(){
  const C=scnCols(), fy=FY();
  addFloor(0,-1,12,16,C.floor);
  addBox(-3.5,fy+1.7,-5,3.6,3.4,0.5,C.wall,'wall'); addBox(3.5,fy+1.7,-5,3.6,3.4,0.5,C.wall,'wall');
  addBox(0,fy+0.5,-5,1.8,1.0,0.5,C.wall,'wall'); addBox(0,fy+2.7,-5,1.8,1.4,0.5,C.wall,'wall');
  addBox(-6.2,1.3,-1,0.55,5.5,14,C.wall,'wall'); addBox(6.2,1.3,-1,0.55,5.5,14,C.wall,'wall');
  addBox(0,1.3,6.2,13,5.5,0.55,C.wall,'wall'); addBox(0,1.3,-10.6,13,5.5,0.55,C.wall,'wall');
  addBox(0,3.2,-1,13,0.3,16,C.ceil,'wall');
  dressOverwall(C,fy);
  return {start:{x:0,y:0,z:2.2,yaw:0,pitch:4},variants:[
    {id:'over-top',throw:{pos:[0,1.6,-8],vel:[0,8,5]},pop:{pos:[0,3.35,-4.9]},peeks:[[0,fy,-5.6],[1.25,fy,-5.6],[-1.25,fy,-5.6]]},
    {id:'through-window',throw:{pos:[0,1.5,-8],vel:[0,2.2,6]},pop:{pos:[0,fy+1.45,-5]},peeks:[[0,fy,-5.6],[1.25,fy,-5.6],[-1.25,fy,-5.6]]},
    {id:'drop-over',throw:{pos:[0.8,2.4,-6.2],vel:[-0.6,3,4]},pop:{pos:[0.2,2.5,-4.6]},peeks:[[1.25,fy,-5.6],[-1.25,fy,-5.6],[0,fy,-5.6]]}
  ]};
}
function buildMid(){
  const C=scnCols(), fy=FY();
  addFloor(0,-2,16,20,C.floor);
  addBox(0,fy+1.0,5.2,5.2,0.2,3.2,C.trim,'floor'); // nest deck, top fy+1.1, eye 1.1
  addBox(-3.6,1.6,4.0,0.5,4.2,4.2,C.wall,'wall'); addBox(3.6,1.6,4.0,0.5,4.2,4.2,C.wall,'wall');
  addBox(-2.2,2.55,3.55,2.6,2.2,0.5,C.wall,'wall'); addBox(2.2,2.55,3.55,2.6,2.2,0.5,C.wall,'wall');
  addBox(0,3.15,3.55,1.8,1.0,0.5,C.trim,'wall'); addBox(0,fy+0.45,3.55,1.8,0.9,0.5,C.trim,'wall');
  addBox(-7.4,1.3,-2,0.55,5.5,16,C.wall,'wall'); addBox(7.4,1.3,-2,0.55,5.5,16,C.wall,'wall');
  addBox(-2.4,1.6,-12.2,4.4,4.2,0.55,C.wall,'wall'); addBox(2.4,1.6,-12.2,4.4,4.2,0.55,C.wall,'wall');
  addBox(0,2.7,-12.2,1.8,2.0,0.55,C.trim,'wall'); addBox(0,fy+0.4,-12.2,1.8,0.8,0.55,C.trim,'wall');
  addBox(-3.2,fy+0.35,-4.2,1.8,0.7,1.6,C.crate,'crate');
  addBox(0,3.3,-2,16,0.3,20,C.ceil,'wall');
  dressMid(C,fy);
  const eye=1.1;
  return {start:{x:0,y:eye,z:5.4,yaw:0,pitch:-4},variants:[
    {id:'mid-air',throw:{pos:[0,1.6,-11],vel:[0,6,6]},pop:{pos:[0,2.2,-3]},peeks:[[0,fy,-12.7],[-4.15,fy,-5.2],[3.0,fy,-8.4]]},
    {id:'far-window',throw:{pos:[0,1.8,-13.5],vel:[0,4,7]},pop:{pos:[0,1.8,-7]},peeks:[[0,fy,-12.7],[1.15,fy,-12.7],[-1.15,fy,-12.7]]},
    {id:'side-connector',throw:{pos:[6,1.4,-2],vel:[-7,4,0.5]},pop:{pos:[2.4,1.8,-1.5]},peeks:[[5.5,fy,-2.2],[-4.15,fy,-5.2],[0,fy,-12.7]]}
  ]};
}
function buildRamp(){
  const C=scnCols(), fy=FY();
  addFloor(0,5.2,6,6,C.floor);
  addBox(0,fy+0.2,2.2,3.2,0.4,2.2,C.trim,'floor');
  addBox(0,fy+0.4,0.2,3.2,0.4,2.2,C.trim,'floor');
  addBox(0,fy+0.6,-1.8,3.2,0.4,2.2,C.trim,'floor');
  addBox(0,fy+0.8,-3.8,3.2,0.4,2.2,C.trim,'floor');
  addBox(0,fy+1.0,-6.2,5.2,0.25,3.2,C.trim,'floor');
  addFloor(0,-10,8,6,C.floor);
  addBox(-1.85,1.6,0,0.5,5.5,14,C.wall,'wall'); addBox(1.85,1.6,0,0.5,5.5,14,C.wall,'wall');
  addBox(-1.2,2.3,-7.7,1.4,4,0.5,C.wall,'wall'); addBox(1.2,2.3,-7.7,1.4,4,0.5,C.wall,'wall');
  addBox(0,3.2,-7.7,1.6,1.2,0.5,C.trim,'wall');
  addBox(0,1.4,-13.2,5,5.2,0.5,C.wall,'wall');
  addBox(-1.0,fy+1.45,-6.0,0.9,0.9,1.1,C.crate,'crate');
  addBox(0,3.4,-2,6,0.3,18,C.ceil,'wall');
  dressRamp(C,fy);
  const y1=0.4,y2=0.6,y3=0.8,y4=1.0,y5=1.2;
  // step tops: fy+0.4, +0.6, +0.8, +1.0, landing fy+1.125 → eyes 0.4,0.6,0.8,1.0,1.125
  return {start:{x:0,y:0,z:5.4,yaw:0,pitch:6},path:[{x:0,y:0,z:5.4},{x:0,y:0.4,z:2.2},{x:0,y:0.6,z:0.2},{x:0,y:0.8,z:-1.8},{x:0,y:1.0,z:-3.8},{x:0,y:1.125,z:-5.6}],pathDur:2.6,variants:[
    {id:'bounce-down',throw:{pos:[0,2.4,-10.5],vel:[0,2,7]},pop:{pos:[0,1.8,-5.2]},peeks:[[0,fy+1.125,-8.05],[-1.05,fy+1.125,-6.2],[1.05,fy+1.125,-6.2]]},
    {id:'lip-pop',throw:{pos:[0,2.2,-9.5],vel:[0,3,5]},pop:{pos:[0,2.3,-6.6]},peeks:[[0,fy+1.125,-8.05],[1.05,fy+1.125,-6.2],[-1.05,fy+1.125,-6.2]]},
    {id:'frame-bounce',throw:{pos:[1.1,2.3,-9],vel:[-2.2,3.5,4]},pop:{pos:[0.2,2.1,-7.2]},peeks:[[0,fy+1.125,-8.05],[-1.05,fy+1.125,-6.2],[0,fy+1.125,-8.9]]}
  ]};
}

function rayAABBt(orig,dir,box,maxT){
  let tmin=0,tmax=maxT;
  for(const axis of ['x','y','z']){
    const o=orig[axis], d=dir[axis], mn=box.min[axis], mx=box.max[axis];
    if(Math.abs(d)<1e-8){ if(o<mn||o>mx) return null; }
    else { let t1=(mn-o)/d, t2=(mx-o)/d; if(t1>t2){ const k=t1; t1=t2; t2=k; } tmin=Math.max(tmin,t1); tmax=Math.min(tmax,t2); if(tmin>tmax) return null; }
  }
  return (tmax>=tmin && tmin<=maxT) ? tmin : null;
}
function rayAABB(orig,dir,box,maxT){ return rayAABBt(orig,dir,box,maxT)!=null; }
function worldSolids(cam){
  if(cam&&cam===rangeCam) return rangeWalls;
  if(MODE==='range') return rangeWalls;
  if(MODE==='flash') return scnWalls;
  return arenaWalls;
}
function firstSolidHit(orig,dir,maxT,cam,skip){
  let best=maxT, hit=null;
  const walls=cam?worldSolids(cam):(MODE==='flash'?scnWalls:worldSolids());
  for(const w of walls){
    if(w.role==='decal') continue;
    if(skip&&skip.has(w.role)) continue;
    const t=rayAABBt(orig,dir,w,best);
    if(t!=null && t>=0 && t<best){ best=t; hit=w; }
  }
  return hit?{t:best,wall:hit}:null;
}
function losOpen(a,b,slack){
  const dir=b.clone?b.clone().sub(a):new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);
  const dist=dir.length();
  if(dist<(slack||0.08)) return true;
  dir.multiplyScalar(1/dist);
  const hit=firstSolidHit(a,dir,dist-(slack||0.04),null,new Set(['decal','floor']));
  return !hit;
}
function flashVisible(pos){
  const orig=camEye.clone(), tgt=pos.clone?pos.clone():new THREE.Vector3(pos.x,pos.y,pos.z);
  return losOpen(orig,tgt,0.12);
}
function pointInSolid(x,y,z,r){
  for(const w of scnWalls){
    if(w.role==='decal'||w.role==='floor') continue;
    const cx=Math.max(w.min.x,Math.min(x,w.max.x)), cy=Math.max(w.min.y,Math.min(y,w.max.y)), cz=Math.max(w.min.z,Math.min(z,w.max.z));
    const dx=x-cx, dy=y-cy, dz=z-cz;
    if(dx*dx+dy*dy+dz*dz<(r*r)) return w;
  }
  return null;
}
function nudgeOutOfSolid(pos,r){
  r=r||0.2;
  for(let i=0;i<8;i++){
    let moved=false;
    for(const w of scnWalls){
      if(w.role==='decal') continue;
      const cx=Math.max(w.min.x,Math.min(pos.x,w.max.x)), cy=Math.max(w.min.y,Math.min(pos.y,w.max.y)), cz=Math.max(w.min.z,Math.min(pos.z,w.max.z));
      const dx=pos.x-cx, dy=pos.y-cy, dz=pos.z-cz, d2=dx*dx+dy*dy+dz*dz;
      if(d2>=r*r) continue;
      let nx,ny,nz;
      if(d2<1e-10){
        const penX=Math.min(pos.x-w.min.x,w.max.x-pos.x), penY=Math.min(pos.y-w.min.y,w.max.y-pos.y), penZ=Math.min(pos.z-w.min.z,w.max.z-pos.z);
        if(penX<=penY&&penX<=penZ){ nx=pos.x<(w.min.x+w.max.x)/2?-1:1; ny=0; nz=0; pos.x+=nx*(penX+r); }
        else if(penY<=penZ){ ny=pos.y<(w.min.y+w.max.y)/2?-1:1; nx=0; nz=0; pos.y+=ny*(penY+r); }
        else { nz=pos.z<(w.min.z+w.max.z)/2?-1:1; nx=0; ny=0; pos.z+=nz*(penZ+r); }
      }else{
        const d=Math.sqrt(d2); nx=dx/d; ny=dy/d; nz=dz/d; const pen=r-d; pos.x+=nx*pen; pos.y+=ny*pen; pos.z+=nz*pen;
      }
      moved=true;
    }
    if(!moved) break;
  }
  if(pos.y<FLOOR_Y+r) pos.y=FLOOR_Y+r;
  return pos;
}
const HEAD_SAMPLES=[[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[0.7,0.7,0],[-0.7,0.7,0],[0.7,0,0.7],[-0.7,0,0.7]];
function headVisibleFrom(eye,head,rad){
  const V=eye.constructor||THREE.Vector3;
  let ok=0, center=false;
  const n=HEAD_SAMPLES.length;
  for(let i=0;i<n;i++){
    const s=HEAD_SAMPLES[i];
    const p=new V(head.x+s[0]*rad, head.y+s[1]*rad, head.z+s[2]*rad);
    const vis=losOpen(eye,p,0.03);
    if(vis) ok++;
    if(i===0) center=vis;
  }
  return {center, ok, n, frac:ok/n, visible:!!(center && ok>=Math.ceil(n*0.6))};
}
function peekEyes(meta){
  const V=THREE.Vector3, list=[];
  const s=(meta&&meta.start)||{x:0,y:0,z:0};
  list.push(new V(s.x,s.y,s.z));
  if(meta&&meta.path&&meta.path.length){
    for(let u=0;u<=1.001;u+=0.12){ const p=pathAt(meta.path,Math.min(1,u)); list.push(new V(p.x,p.y,p.z)); }
  }
  return list;
}
function bodyStuck(x,y,z){
  return !!(pointInSolid(x,y+0.55,z,BOT_BODY_R+0.03) || pointInSolid(x,y+BOT_HEAD_Y,z,BOT_HEAD_R+0.02));
}
function peekScore(p,eyes){
  if(bodyStuck(p[0],p[1],p[2])) return {visible:false,frac:0,center:false,eye:null};
  const head=new THREE.Vector3(p[0],p[1]+BOT_HEAD_Y,p[2]);
  let best={visible:false,frac:0,center:false,eye:null};
  for(const e of eyes){
    const r=headVisibleFrom(e,head,BOT_HEAD_R);
    if(r.frac>(best.frac||0) || (r.visible&&!best.visible)) best={...r,eye:e};
    if(r.visible) return {...r,eye:e};
  }
  return best;
}
function adjustPeek(p,eyes){
  const base=peekScore(p,eyes);
  if(base.visible) return {pos:p.slice(), moved:0, ...base};
  const dirs=[];
  for(const e of eyes){ const dx=e.x-p[0], dz=e.z-p[2], len=Math.hypot(dx,dz)||1; dirs.push([dx/len,dz/len]); }
  for(const a of [0,45,90,135,180,225,270,315]){ const r=a*Math.PI/180; dirs.push([Math.cos(r),Math.sin(r)]); }
  let best={pos:p.slice(), moved:0, ...base};
  for(const st of [0.15,0.3,0.45,0.6,0.8,1.0,1.25,1.5]){
    for(const d of dirs){
      const q=[p[0]+d[0]*st, p[1], p[2]+d[1]*st];
      const sc=peekScore(q,eyes);
      if(sc.frac>best.frac || (sc.visible&&!best.visible)) best={pos:q, moved:st, ...sc};
      if(sc.visible) return {pos:q, moved:st, ...sc};
    }
  }
  return best;
}
function fixPeekVisibility(meta){
  if(!meta||!meta.variants) return meta;
  const eyes=peekEyes(meta);
  meta.peekFix=[];
  for(const v of meta.variants){
    if(!v.peeks) continue;
    const next=[];
    for(const p of v.peeks){
      const r=adjustPeek(p,eyes);
      next.push(r.pos);
      meta.peekFix.push({variant:v.id, from:p, to:r.pos, moved:r.moved, visible:!!r.visible, frac:r.frac, center:!!r.center});
    }
    v.peeks=next;
  }
  return meta;
}
function peekVisibilityReport(meta){
  meta=meta||scnMeta;
  if(!meta) return [];
  const eyes=peekEyes(meta);
  const out=[];
  for(const v of meta.variants||[]){
    for(const p of v.peeks||[]){
      const sc=peekScore(p,eyes);
      out.push({scn:meta.id,variant:v.id,peek:p,visible:!!sc.visible,frac:sc.frac,center:!!sc.center,stuck:bodyStuck(p[0],p[1],p[2])});
    }
  }
  return out;
}

function bodyClearFeet(x,y,z){
  const r=BOT_BODY_R+0.02;
  if(pointInSolid(x,y+0.22,z,r)) return false;
  if(pointInSolid(x,y+0.70,z,r)) return false;
  if(pointInSolid(x,y+BOT_HEAD_Y,z,BOT_HEAD_R+0.015)) return false;
  return true;
}
function pathClear(ax,ay,az,bx,by,bz,steps){
  steps=steps||8;
  if(Math.hypot(bx-ax,by-ay,bz-az)<1e-5) return true;
  for(let i=1;i<=steps;i++){
    const t=i/steps;
    if(!bodyClearFeet(ax+(bx-ax)*t, ay+(by-ay)*t, az+(bz-az)*t)) return false;
  }
  return true;
}
function headVisibleAt(x,y,z,eyes,crouch){
  const hy=y+(crouch?CROUCH_HEAD_Y:BOT_HEAD_Y);
  const head=new THREE.Vector3(x,hy,z);
  let best={visible:false,frac:0,center:false,eye:null};
  for(const e of eyes||[]){
    const r=headVisibleFrom(e,head,BOT_HEAD_R);
    if(r.frac>(best.frac||0) || (r.visible&&!best.visible)) best={...r,eye:e};
    if(r.visible) return {...r,eye:e};
  }
  return best;
}
function findOpenPoint(from,eyes){
  const fx=+from[0], fy=+from[1], fz=+from[2];
  const eye=(eyes&&eyes[0])||{x:0,y:0,z:0};
  let tdx=eye.x-fx, tdz=eye.z-fz; const L=Math.hypot(tdx,tdz)||1; tdx/=L; tdz/=L;
  let ox=fx, oz=fz;
  if(!bodyClearFeet(ox,fy,oz)){
    for(const d of [0.08,0.16,0.24,0.36,0.5]){
      let done=false;
      for(const [dx,dz] of [[tdx,tdz],[1,0],[-1,0],[0,1],[0,-1]]){
        const x=fx+dx*d, z=fz+dz*d;
        if(bodyClearFeet(x,fy,z)){ ox=x; oz=z; done=true; break; }
      }
      if(done) break;
    }
  }
  const angs=[0,22,-22,45,-45,70,-70,90,-90,120,-120,150,-150,180];
  let best=null, bestScore=-1;
  for(const a of angs){
    const rad=Math.atan2(tdz,tdx)+a*Math.PI/180;
    const dx=Math.cos(rad), dz=Math.sin(rad);
    let lx=ox, lz=oz;
    for(let s=1;s<=16;s++){
      const x=ox+dx*s*0.13, z=oz+dz*s*0.13;
      if(!bodyClearFeet(x,fy,z) || !pathClear(lx,fy,lz,x,fy,z,3)) break;
      lx=x; lz=z;
      const dist=Math.hypot(x-fx,z-fz);
      if(dist<0.32) continue;
      const vis=headVisibleAt(x,fy,z,eyes,false);
      const score=dist*(vis.visible?2.2:0.35)+vis.frac+(Math.abs(a)<40?0.15:0);
      if(score>bestScore){ bestScore=score; best={pos:[x,fy,z],visible:!!vis.visible,frac:vis.frac,dist}; }
    }
  }
  if(best && best.dist>=0.32) return best;
  if(Math.hypot(ox-fx,oz-fz)>=0.24 && bodyClearFeet(ox,fy,oz)){
    const vis=headVisibleAt(ox,fy,oz,eyes,false);
    return {pos:[ox,fy,oz],visible:!!vis.visible,frac:vis.frac,dist:Math.hypot(ox-fx,oz-fz)};
  }
  return {pos:[fx,fy,fz],visible:!!headVisibleAt(fx,fy,fz,eyes,false).visible,frac:0,dist:0};
}
function pushPathReport(meta){
  meta=meta||scnMeta;
  if(!meta) return [];
  const eyes=peekEyes(meta);
  const out=[];
  for(const v of meta.variants||[]){
    for(const p of v.peeks||[]){
      const open=findOpenPoint(p,eyes);
      const to=open.pos;
      const clear=pathClear(p[0],p[1],p[2],to[0],to[1],to[2],10);
      const fromVis=headVisibleAt(p[0],p[1],p[2],eyes,false);
      const toVis=headVisibleAt(to[0],to[1],to[2],eyes,false);
      const mid=[(p[0]+to[0])/2,p[1],(p[2]+to[2])/2];
      const midVis=headVisibleAt(mid[0],mid[1],mid[2],eyes,false);
      const some=!!(fromVis.visible||toVis.visible||midVis.visible);
      const stuck=bodyStuck(to[0],to[1],to[2])||bodyStuck(p[0],p[1],p[2]);
      out.push({scn:meta.id,variant:v.id,from:p,to,dist:open.dist,clear,stuck,fromVis:!!fromVis.visible,toVis:!!toVis.visible,midVis:!!midVis.visible,visible:some,frac:Math.max(fromVis.frac||0,toVis.frac||0,midVis.frac||0)});
    }
  }
  return out;
}
function stepPeekBots(dt,now){
  if(!peekBots.length) return;
  const remain=FL&&FL.peekUntil?FL.peekUntil-now:0;
  for(const bot of peekBots){
    if(!bot||bot.dead||!bot.group.visible) continue;
    const mv=bot.move;
    stepBotStance(bot,now);
    stepCrouch(bot,dt);
    if(!mv) continue;
    if(remain<240 && mv.phase!=='retreat' && mv.phase!=='gone'){ mv.phase='retreat'; }
    if(now<mv.goAt && mv.phase==='wait') continue;
    if(mv.phase==='wait') mv.phase='go';
    if(mv.phase==='gone') continue;
    const from=mv.from, to=mv.to;
    const dist=Math.hypot(to.x-from.x,to.z-from.z)||0.001;
    let targetU=mv.u||0;
    if(mv.phase==='retreat'){
      targetU=Math.max(0,(mv.u||0)-(mv.speed*dt)/dist);
      if(targetU<=0.02){ mv.u=0; placeBotFeet(bot,from.x,from.y,from.z); bot.moving=false; continue; }
    }else if(mv.style==='shoulder'){
      const cycle=mv.cyc=(mv.cyc||0)+dt;
      const per=mv.period||0.85;
      const t=(cycle%per)/per;
      targetU=(t<0.5?t*2:(1-t)*2)* (mv.ampU||0.55);
    }else if(mv.style==='stop' && (mv.u||0)>=(mv.stopAt||0.62)){
      mv.u=mv.stopAt||0.62; bot.moving=false;
      targetU=mv.u;
    }else{
      targetU=(mv.u||0)+(mv.speed*dt)/dist;
      if(targetU>1) targetU=1;
    }
    let u=targetU;
    const x=from.x+(to.x-from.x)*u, z=from.z+(to.z-from.z)*u, y=from.y+(to.y-from.y)*u;
    let px=x, pz=z;
    if(mv.style==='strafe' || mv.strafe){
      const sx=-(to.z-from.z)/dist, sz=(to.x-from.x)/dist;
      const amp=(mv.amp||0.35)*Math.sin(u*Math.PI*(mv.sway||1.4));
      px=x+sx*amp; pz=z+sz*amp;
    }
    if(!bodyClearFeet(px,y,pz)){
      if(bodyClearFeet(x,y,z)){ px=x; pz=z; }
      else { bot.moving=false; continue; }
    }
    placeBotFeet(bot,px,y,pz);
    bot.group.updateMatrixWorld(true);
    mv.u=u;
    bot.moving=mv.phase!=='stop' && Math.abs((targetU)-(mv._lu||0))>0.0005;
    mv._lu=targetU;
    if(mv.phase==='go' && mv.style!=='shoulder' && u>=1){ mv.phase='hold'; bot.moving=false; }
  }
}

function clearFlashToast(){ const el=$('#flashToast'); if(el){ el.className=''; el.textContent=''; } clearTimeout(flashToast._t); }
function flashToast(kind){
  const el=$('#flashToast'); if(!el) return;
  const labels={dodged:'Dodged',partial:'Partial',full:'Flashed',covered:'Covered'};
  el.textContent=labels[kind]||kind;
  el.className='show '+(kind||'');
  clearTimeout(flashToast._t);
  flashToast._t=setTimeout(()=>{ el.classList.remove('show'); }, 1100);
}
function flashRunTitle(res,fl){
  const f=fl||FL, pre=(f&&f.preset)==='cs2'?'CS2-style':'Valorant-style';
  const by=f&&f.st&&f.st.by?Object.keys(f.st.by):[];
  if((f&&f.mix) || (res&&res.scn==='mix')) return pre+' · Mix';
  if(by.length>1) return pre+' · '+by.map(id=>(SCN[id]||{}).name||id).join(' · ');
  const id=(res&&res.scn)||(f&&f.scn);
  return pre+' · '+((SCN[id]||{}).name||id||'Flash');
}

function bounceBomb(pos,vel,r,dt){
  let bounced=false;
  vel.y-=18*dt; pos.addScaledVector(vel,dt);
  if(pos.y<FLOOR_Y+r){ pos.y=FLOOR_Y+r; if(vel.y<0){ vel.y*=-0.38; bounced=true; } vel.x*=0.72; vel.z*=0.72; if(Math.abs(vel.y)<0.9) vel.y=0; }
  for(const w of scnWalls){
    const cx=Math.max(w.min.x,Math.min(pos.x,w.max.x)), cy=Math.max(w.min.y,Math.min(pos.y,w.max.y)), cz=Math.max(w.min.z,Math.min(pos.z,w.max.z));
    const dx=pos.x-cx, dy=pos.y-cy, dz=pos.z-cz, d2=dx*dx+dy*dy+dz*dz;
    if(d2>=r*r) continue;
    let nx,ny,nz;
    if(d2<1e-10){
      const penX=Math.min(pos.x-w.min.x,w.max.x-pos.x), penY=Math.min(pos.y-w.min.y,w.max.y-pos.y), penZ=Math.min(pos.z-w.min.z,w.max.z-pos.z);
      if(penX<=penY&&penX<=penZ){ nx=pos.x<(w.min.x+w.max.x)/2?-1:1; ny=0; nz=0; pos.x+=nx*(penX+r); }
      else if(penY<=penZ){ ny=pos.y<(w.min.y+w.max.y)/2?-1:1; nx=0; nz=0; pos.y+=ny*(penY+r); }
      else { nz=pos.z<(w.min.z+w.max.z)/2?-1:1; nx=0; ny=0; pos.z+=nz*(penZ+r); }
    }else{
      const d=Math.sqrt(d2); nx=dx/d; ny=dy/d; nz=dz/d; const pen=r-d; pos.x+=nx*pen; pos.y+=ny*pen; pos.z+=nz*pen;
    }
    const vn=vel.x*nx+vel.y*ny+vel.z*nz;
    if(vn<0){ vel.x-=1.38*vn*nx; vel.y-=1.38*vn*ny; vel.z-=1.38*vn*nz; vel.x*=0.78; vel.y*=0.85; vel.z*=0.78; bounced=true; }
  }
  if(pos.y<FLOOR_Y-2) pos.y=FLOOR_Y+r;
  return bounced;
}
function blockedAt(x,y,z,rad){
  for(const py of [y,y-0.7]){
    for(const w of scnWalls){
      if(w.role==='floor') continue;
      if(w.max.y<y-1.55||w.min.y>y+0.3) continue;
      const cx=Math.max(w.min.x,Math.min(x,w.max.x)), cy=Math.max(w.min.y,Math.min(py,w.max.y)), cz=Math.max(w.min.z,Math.min(z,w.max.z));
      const dx=x-cx, dy=py-cy, dz=z-cz; if(dx*dx+dy*dy+dz*dz<rad*rad) return true;
    }
  }
  return false;
}
function standY(x,z){
  let top=FLOOR_Y; const r=0.25, feet=(camEye.y||0)-1.65;
  for(const w of scnWalls){
    if(x<w.min.x-r||x>w.max.x+r||z<w.min.z-r||z>w.max.z+r) continue;
    if(w.max.y>top && w.max.y<=feet+0.9 && w.max.y>FLOOR_Y-0.05) top=Math.max(top,w.max.y);
  }
  return top+1.65;
}
function pathAt(path,u){
  if(!path||!path.length) return {x:camEye.x,y:camEye.y,z:camEye.z};
  if(u<=0) return path[0]; if(u>=1) return path[path.length-1];
  const n=path.length-1, f=u*n, i=Math.min(n-1,Math.floor(f)), t=f-i, a=path[i], b=path[i+1];
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
}
function stepMove(dt){
  if(!FL||FL.phase!=='run') return;
  if(FL.path&&FL.pathT!=null&&!S.flash.wasd){
    FL.pathT+=dt; const p=pathAt(FL.path,Math.min(1,FL.pathT/Math.max(0.1,FL.pathDur||2.4)));
    camEye.set(p.x,p.y,p.z); return;
  }
  if(!S.flash.wasd) return;
  let fwd=0,str=0;
  if(keysHeld.KeyW) fwd+=1; if(keysHeld.KeyS) fwd-=1; if(keysHeld.KeyD) str+=1; if(keysHeld.KeyA) str-=1;
  if(!fwd&&!str){ camEye.y=standY(camEye.x,camEye.z); return; }
  const n=Math.hypot(fwd,str)||1; fwd/=n; str/=n;
  const f=dirFrom(view.yaw,0), rx=-f.z, rz=f.x, spd=4.6*dt;
  const dx=(f.x*fwd+rx*str)*spd, dz=(f.z*fwd+rz*str)*spd;
  const rad=0.38; let x=camEye.x, z=camEye.z, y=camEye.y;
  if(!blockedAt(x+dx,y,z,rad)) x+=dx; if(!blockedAt(x,y,z+dz,rad)) z+=dz;
  camEye.set(x,standY(x,z),z);
}
document.addEventListener('keydown',e=>{
  const k=e.code; if(k!=='KeyW'&&k!=='KeyA'&&k!=='KeyS'&&k!=='KeyD') return;
  if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  keysHeld[k]=true;
  if(MODE==='flash'&&S.flash.wasd&&FL&&FL.phase==='run') e.preventDefault();
});
document.addEventListener('keyup',e=>{ keysHeld[e.code]=false; });

function peekWindowMs(){ const d=FL&&FL.diff||S.flash.diff; return d==='hard'?850:d==='easy'?1400:1100; }
function spawnPeekBots(factor,peeks,now){
  clearPeekBots();
  const list=peeks&&peeks.length?peeks.slice():[[0,FY(),-6]];
  const eyes=peekEyes(scnMeta);
  const rand=useFlashRand();
  const n=rand?fint(1,Math.min(3,list.length)):list.length;
  const picks=rand?fshuffle(list).slice(0,n):list;
  const styles=rand?null:['run','strafe','stop'];
  const staged=[];
  for(let i=0;i<picks.length;i++){
    const p=picks[i];
    const bot=makeBot(scene); scaleBot(bot,1); placeBotFeet(bot,p[0],p[1],p[2]); bot.dim=factor; armBot(bot,now); paintBot(bot,factor);
    const open=findOpenPoint(p,eyes);
    const to=open.pos;
    const style=rand?(frand()<0.28?'shoulder':frand()<0.34?'stop':frand()<0.5?'strafe':'run'):(styles[i%styles.length]);
    const delay=rand?frange(0,400):80;
    const speed=rand?frange(2.5,5.1):3.4;
    bot.move={from:{x:p[0],y:p[1],z:p[2]},to:{x:to[0],y:to[1],z:to[2]},u:0,speed,style,goAt:now+delay,phase:'wait',amp:rand?frange(0.22,0.48):0.32,ampU:rand?frange(0.4,0.7):0.55,period:rand?frange(0.7,1.05):0.85,stopAt:rand?frange(0.52,0.78):0.65,strafe:style==='strafe'};
    bot.moving=false;
    peekBots.push(bot);
    staged.push({bot,delay});
  }
  const kinds=assignGroupStances(peekBots.length);
  const win=peekWindowMs();
  staged.forEach((row,i)=>{
    const plan=planStanceToggles(kinds[i], now, row.delay, win, null, {max:4,auto:false});
    applyBotStance(row.bot, plan, now);
    if(row.bot.move) row.bot.move.stanceKind=plan.kind;
  });
  if(FL){ FL.peekUntil=now+peekWindowMs(); FL.peekT0=now; FL.st.dots=(FL.st.dots||0)+peekBots.length; }
}
function flashShoot(){
  if(!FL||FL.phase!=='run') return;
  if(!FL.peekUntil||performance.now()>FL.peekUntil) return;
  FL.st.dotShots=(FL.st.dotShots||0)+1;
  const pick=pickBots(peekBots,camera);
  if(!pick){ showDmg(null); hitFx('miss'); beep(180,0.05,'square',0.03); return; }
  pick.bot.shots++;
  const res=M.applyHit(currentDmg(),pick.bot.state,pick.zone);
  showDmg(res);
  if(res.miss){ hitFx('miss'); beep(180,0.05,'square',0.03); return; }
  const now=performance.now();
  if(pick.bot.firstHit==null){ pick.bot.firstHit=now; if(FL.peekT0!=null) FL.st.dotFirst.push(now-FL.peekT0); }
  FL.st.dotHits=(FL.st.dotHits||0)+1;
  if(pick.zone==='head') FL.st.hs=(FL.st.hs||0)+1;
  if(res.killed){
    FL.st.botKills=(FL.st.botKills||0)+1;
    FL.st.stk.push(pick.bot.shots);
    const ttk=FL.peekT0!=null?now-FL.peekT0:NaN;
    if(Number.isFinite(ttk)) FL.st.ttkArr.push(ttk);
    if((pick.bot.crouch||0)>0.45) FL.st.crouchKills=(FL.st.crouchKills||0)+1; else FL.st.standKills=(FL.st.standKills||0)+1;
    const moving=!!(pick.bot.moving || (pick.bot.move && pick.bot.move.phase==='go' && (pick.bot.move.u||0)>0.04 && pick.bot.move.style!=='stop'));
    if(moving) FL.st.moveKills=(FL.st.moveKills||0)+1;
    if(Number.isFinite(ttk)) FL.st.pushTtk.push(ttk);
    hideBot(pick.bot); hitFx('hit'); beep(1320,0.05,'triangle');
  }else{ hitFx('hit'); beep(880,0.04,'triangle',0.04); }
}

function newFlashRound(){
  if(!ok())return alert('Fill in the converter first.');
  mountStage('#stageHost3'); setMode('flash','flash'); setFov();
  degPerCount=M.degPerCountFromCm(currentCm(),S.dpi);
  hideGrenade(); clearWhiteOut(); clearPeekBots();
  const n=S.flash.count, scn0=S.flash.scn||'hall';
  const id=scn0==='mix'?'hall':scn0;
  loadScn(id); placeStart();
  FL={phase:'ready',preset:S.flash.preset,diff:S.flash.diff,n,i:0,bomb:null,busyUntil:0,cm:currentCm(),last:0,scn:scn0,mix:scn0==='mix',rand:S.flash.rand!==false,
    st:{dodged:0,partial:0,full:0,covered:0,react:[],dots:0,dotHits:0,dotShots:0,dotFirst:[],botKills:0,hs:0,stk:[],ttkArr:[],moveKills:0,standKills:0,crouchKills:0,pushTtk:[],by:{}}};
  flashSeed();
  flashHud();
  const scn=SCN[scn0]||SCN.hall;
  showOv(`<div class="big">${S.flash.preset==='cs2'?'CS2-style':'Valorant-style'}</div><div class="muted">${esc(scn.name)} · click here to lock your mouse and start</div><div class="small muted">${n} flashes · ${S.flash.diff}${(S.flash.rand!==false)?' · random':''} · Esc to pause</div>`);
}
$('#flashBtn').onclick=()=>flashWarnThen(newFlashRound);

function flashCountdown(){ FL.phase='count'; let n=3; const tick=()=>{ if(!FL||FL.phase!=='count')return; if(n===0){hideOv();FL.phase='run';FL.last=performance.now();FL.busyUntil=FL.last+200;beep(880,0.08);return;} showOv(`<div class="big">${n}</div>`); beep(440,0.06); n--; setTimeout(tick,450);}; tick(); }

function pickVariant(){
  const meta=scnMeta; if(!meta||!meta.variants||!meta.variants.length) return {id:'basic',pop:{pos:[0,1.4,-8]},throw:{pos:[0,1.2,-10],vel:[0,4,6]},peeks:[[0,FY(),-8]]};
  return meta.variants[Math.floor(frand()*meta.variants.length)];
}
function rotateYaw(vx,vy,vz,deg){ const r=deg*Math.PI/180, c=Math.cos(r), s=Math.sin(r); return [vx*c-vz*s, vy, vx*s+vz*c]; }
function pickValPop(v){
  const base=((v.pop||v.throw||{}).pos)||[0,1.4,-8];
  const eye=camEye;
  const tries=[];
  for(let i=0;i<10;i++){
    const over=frand()<0.45;
    const p=new THREE.Vector3(
      base[0]+frange(-1.8,1.8),
      Math.max(FLOOR_Y+0.28, (over?Math.max(base[1],1.1)+frange(0.2,1.5):base[1]+frange(-0.25,0.9))),
      base[2]+frange(-1.8,1.8)
    );
    nudgeOutOfSolid(p,0.22);
    const dist=Math.hypot(p.x-eye.x,p.y-eye.y,p.z-eye.z);
    if(dist<1.6) continue;
    tries.push(p);
  }
  return tries.length?tries[Math.floor(frand()*tries.length)]:null;
}
function spawnFlash(now){
  const d=FDIFF[FL.diff]||FDIFF.normal, g=ensureGrenade();
  const rand=useFlashRand();
  if(!FL.rng) flashSeed(FL.seed);
  if(FL.mix){ const id=SCN_IDS[Math.floor(frand()*SCN_IDS.length)]; loadScn(id); }
  else if(!scnMeta) loadScn(FL.scn==='mix'?'hall':(FL.scn||'hall'));
  const v=pickVariant(); FL.variant=v; FL.scnNow=scnId;
  const auto=!!(scnMeta&&scnMeta.path&&scnMeta.auto)&&!S.flash.wasd;
  if(auto){ FL.path=scnMeta.path; FL.pathDur=scnMeta.pathDur||2.4; FL.pathT=0; placeStart(scnMeta); }
  else { FL.path=null; FL.pathT=null; if(!S.flash.wasd) placeStart(scnMeta); }
  const bomb={kind:FL.preset,t0:now,appeared:now,safeAt:null,firstSafe:null,detonated:false,factor:null,fuse:0,pos:new THREE.Vector3(),vel:new THREE.Vector3(),peeks:v.peeks||[],variant:v.id,bounces:0,early:false,minFuse:0};
  const jitter=(a,w)=>a+(rand?frange(-w,w):(frand()-0.5)*0.2);
  if(FL.preset==='cs2'){
    const th=v.throw||{pos:(v.pop||{}).pos||[0,1.2,-10],vel:[0,5,4]};
    const range=d.cs2Range;
    bomb.minFuse=range[0]*1000;
    bomb.fuse=rand?frange(range[0],range[1])*1000:d.cs2*1000;
    bomb.early=rand&&frand()<0.3;
    bomb.pos.set(jitter(th.pos[0],rand?0.45:0.1), th.pos[1], jitter(th.pos[2],rand?0.45:0.1));
    nudgeOutOfSolid(bomb.pos,0.2);
    let vel=th.vel.slice();
    if(rand){
      const sc=frange(0.82,1.22);
      vel=rotateYaw(vel[0]*sc, vel[1]*sc+frange(-0.7,1.3), vel[2]*sc, frange(-14,14));
    }else{
      vel=[vel[0]*(0.94+frand()*0.12),vel[1]*(0.94+frand()*0.12),vel[2]*(0.94+frand()*0.12)];
    }
    bomb.vel.set(vel[0],vel[1],vel[2]);
    flashCue('throw',1,bomb.pos);
  }else{
    const range=d.valRange;
    bomb.minFuse=range[0]*1000;
    bomb.fuse=rand?frange(range[0],range[1])*1000:d.val*1000;
    const p=(v.pop||v.throw).pos;
    if(rand){
      const rp=pickValPop(v);
      if(rp) bomb.pos.copy(rp);
      else { bomb.pos.set(jitter(p[0],0.35), Math.max(FLOOR_Y+0.28,p[1]+frange(-0.2,0.9)), jitter(p[2],0.35)); nudgeOutOfSolid(bomb.pos,0.22); }
    }else{
      bomb.pos.set(jitter(p[0],0.1),p[1],jitter(p[2],0.1));
      if(bomb.pos.y<FLOOR_Y+0.2) bomb.pos.y=FLOOR_Y+0.2;
      nudgeOutOfSolid(bomb.pos,0.22);
    }
    if(bomb.pos.y<FLOOR_Y+0.25) bomb.pos.y=FLOOR_Y+0.25;
    flashCue('pop',1,bomb.pos);
  }
  g.position.copy(bomb.pos); g.visible=true; g.scale.setScalar(FL.preset==='val'?0.3:1);
  FL.bomb=bomb;
}
function flashStep(now){
  if(!FL||FL.phase!=='run')return;
  const dt=Math.min(0.05,(now-(FL.last||now))/1000); FL.last=now;
  stepMove(dt);
  stepPeekBots(dt,now);
  if(FL.peekUntil&&now>FL.peekUntil) clearPeekBots();
  const bomb=FL.bomb;
  if(!bomb){
    if(FL.i>=FL.n){ if(now>=FL.busyUntil&&!(FL.peekUntil&&now<FL.peekUntil)) flashFinish(); flashHud(); return; }
    if(now>=FL.busyUntil&&!(FL.peekUntil&&now<FL.peekUntil)) spawnFlash(now);
    flashHud(); return;
  }
  if(FL.preset==='cs2'){
    if(bounceBomb(bomb.pos,bomb.vel,0.18,dt)) bomb.bounces=(bomb.bounces||0)+1;
    if(bomb.early && bomb.bounces>0 && (now-bomb.t0)>=(bomb.minFuse||bomb.fuse)) { detonateFlash(now); flashHud(); return; }
  }else if(grenade&&grenade.scale.x<1){ const s=Math.min(1,grenade.scale.x+dt*6); grenade.scale.setScalar(s); }
  if(grenade){ grenade.position.copy(bomb.pos); grenade.rotation.y+=dt*2.2; grenade.rotation.z+=dt*0.7;
    const fu=grenade.userData.fuse; if(fu){ const blink=0.5+0.5*Math.sin(now*0.03+(1-Math.max(0,(bomb.fuse-(now-bomb.t0))/bomb.fuse))*20); fu.material.emissiveIntensity=0.6+1.6*blink; } }
  const ang=flashAngle(bomb.pos);
  if(ang>=(S.flash.safe||90)&&bomb.safeAt==null) bomb.safeAt=now;
  if(ang<(S.flash.safe||90)) bomb.safeAt=null;
  if(bomb.firstSafe==null && ang>=(S.flash.safe||90)) bomb.firstSafe=now;
  if(now-bomb.t0>=bomb.fuse) detonateFlash(now);
  flashHud();
}
function noteScn(kind){
  const id=FL.scnNow||scnId||'hall'; const b=FL.st.by[id]||(FL.st.by[id]={n:0,dodged:0,covered:0,dotHits:0,dots:0});
  b.n++; if(kind==='dodged') b.dodged++; if(kind==='covered') b.covered++;
}
function detonateFlash(now){
  const bomb=FL.bomb; if(!bomb||bomb.detonated)return;
  bomb.detonated=true;
  const ang=flashAngle(bomb.pos);
  let factor=flashFactor(ang), covered=!flashVisible(bomb.pos);
  if(covered) factor=0;
  bomb.factor=factor; bomb.ang=ang; bomb.covered=covered;
  hideGrenade();
  const dur=whiteOut(factor);
  flashCue('bang',factor,bomb.pos);
  let kind='full'; if(covered) kind='covered'; else if(factor<=0.02) kind='dodged'; else if(factor<0.7) kind='partial';
  flashToast(kind);
  FL.st[kind]++;
  if(kind==='dodged') FL.st.react.push((bomb.firstSafe!=null?bomb.firstSafe:now)-bomb.appeared);
  noteScn(kind);
  spawnPeekBots(factor,bomb.peeks,now);
  FL.i++; FL.bomb=null;
  const dd=FDIFF[FL.diff]||FDIFF.normal;
  const gap=useFlashRand()?frange(dd.gap[0],dd.gap[1])*1000:150;
  FL.busyUntil=Math.max(now+dur+200, (FL.peekUntil||now)+gap);
}
function avg(arr){ return arr&&arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:NaN; }
function flashScore(st,n){
  const dodgePct=n?100*st.dodged/n:0;
  const react=avg(st.react);
  let score=(st.dodged||0)*100+(st.partial||0)*40+(st.covered||0)*100;
  if(st.react.length){ const a=avg(st.react); score+=Math.max(0,20*(1-a/1200))*st.dodged; }
  const spawned=st.dots||0, kills=st.botKills||0;
  score+=55*(kills/Math.max(1,spawned))*n;
  score=n?score/n:0;
  const hsPct=st.dotHits?100*st.hs/st.dotHits:NaN;
  const stk=avg(st.stk), ttk=avg(st.ttkArr), firstHit=avg(st.dotFirst);
  const acc=st.dotShots?st.dotHits/st.dotShots:NaN;
  const moveKills=st.moveKills||0, standKills=st.standKills||0, crouchKills=st.crouchKills||0, pushTtk=avg(st.pushTtk);
  return {score,dodgePct,react,dodged:st.dodged,partial:st.partial,full:st.full,covered:st.covered||0,n,dots:spawned,dotHits:st.dotHits||0,dotShots:st.dotShots||0,botKills:kills,hsPct,stk,ttk,firstHit,acc,moveKills,standKills,crouchKills,pushTtk};
}
function flashHud(){
  if(!FL)return;
  const bar=$('#ahud'); if(bar)bar.classList.add('show');
  $('#hudK1').textContent='FLASH'; $('#hudV1').textContent=FL.i+'/'+FL.n;
  $('#hudK2').textContent='DODGED'; $('#hudV2').textContent=FL.i?Math.round(100*FL.st.dodged/FL.i)+'%':'—';
  const best=bestFlash(FL.mix?'mix':(FL.scn||S.flash.scn),'scn')||bestFlash(FL.preset,'preset');
  $('#hudK3').textContent='BEST'; $('#hudV3').textContent=best?Math.round(best):'—';
  const cm=$('#hudCm'); if(cm) cm.textContent=`${FL.preset==='cs2'?'CS2-style':'Valorant-style'} · ${(SCN[FL.scn]||{}).name||FL.scn} · ${FL.diff}`;
}
function flashFinish(){
  const res=flashScore(FL.st,FL.n); res.cm=FL.cm; res.preset=FL.preset; res.diff=FL.diff; res.scn=FL.mix?'mix':(FL.scn||S.flash.scn);
  const prev=bestFlash(res.scn,'scn'); res.isBest=res.score>prev&&res.score>0;
  store.flashHistory.unshift({at:Date.now(),preset:FL.preset,diff:FL.diff,cm:FL.cm,scn:res.scn,score:res.score,dodged:res.dodged,partial:res.partial,full:res.full,covered:res.covered,dodgePct:res.dodgePct,react:res.react,dots:res.dots,dotHits:res.dotHits,dotShots:res.dotShots,botKills:res.botKills,hsPct:res.hsPct,stk:res.stk,ttk:res.ttk,firstHit:res.firstHit,acc:res.acc,moveKills:res.moveKills,standKills:res.standKills,crouchKills:res.crouchKills,pushTtk:res.pushTtk,dmg:S.bot.dmg,rand:!!FL.rand});
  store.flashHistory=store.flashHistory.slice(0,200); save();
  FL.phase='done'; hideGrenade(); clearPeekBots(); clearHud();
  if(document.pointerLockElement===stage)document.exitPointerLock();
  const pct=v=>Number.isFinite(v)?Math.round(v)+'%':'—';
  const ms=v=>Number.isFinite(v)?Math.round(v)+' ms':'—';
  const cells=[cell('Dodged',res.dodged+' / '+res.n),cell('Partial',String(res.partial)),cell('Full flash',String(res.full)),cell('Covered',String(res.covered)),cell('Dodge %',Math.round(res.dodgePct)+'%'),cell('Bots killed',res.botKills+' / '+res.dots),cell('Moving kills',String(res.moveKills||0)),cell('Standing kills',String(res.standKills||0)),cell('Crouch kills',String(res.crouchKills||0)),cell('First hit',ms(res.firstHit)),cell('Accuracy',pct(res.acc*100)),cell('Headshot %',pct(res.hsPct)),cell('Avg STK',Number.isFinite(res.stk)?res.stk.toFixed(1):'—'),cell('Avg TTK',ms(res.ttk)),cell('Avg push TTK',ms(res.pushTtk)),cell('Avg dodge reaction',ms(res.react))];
  let mixLine='';
  if(FL.mix&&FL.st.by){ const parts=Object.keys(FL.st.by).map(id=>{ const b=FL.st.by[id]; return `${(SCN[id]||{}).name||id}: ${b.dodged+b.covered}/${b.n} safe`; }); if(parts.length) mixLine=`<div class="small muted" style="margin-top:8px">${parts.join(' · ')}</div>`; }
  const badge=res.isBest?'<div class="badge">NEW BEST</div>':(prev?`<div class="subscore">Best ${Math.round(prev)}</div>`:'');
  const title=flashRunTitle(res,FL);
  showOv(`<div class="subscore">${esc(title)}</div><div class="big">${Math.round(res.score)}</div>${badge}<div class="resgrid">${cells.join('')}</div>${mixLine}<div class="small muted">Click Start to go again</div>`);
  const last=$('#lastFlash');
  if(last) last.innerHTML=[['Score',Math.round(res.score)],['Dodged',res.dodged+' / '+res.n],['Partial / full / covered',res.partial+' / '+res.full+' / '+res.covered],['Dodge %',Math.round(res.dodgePct)+'%'],['Bots killed',res.botKills+' / '+res.dots],['First hit',ms(res.firstHit)],['Accuracy',pct(res.acc*100)],['Headshot %',pct(res.hsPct)],['Avg STK',Number.isFinite(res.stk)?res.stk.toFixed(1):'—'],['Avg TTK',ms(res.ttk)],['Moving kills',res.moveKills||0],['Standing kills',res.standKills||0],['Crouch kills',res.crouchKills||0],['Avg push TTK',ms(res.pushTtk)],['Best',Math.round(Math.max(prev,res.score))||'—']]
    .map(([k,v])=>`<div class="card stat"><div class="k">${k}</div><div class="v" style="font-size:22px">${v}</div></div>`).join('');
  renderFlashBests(); renderFlashHist();
  FL=null;
}
function abandonFlash(){
  if(FL){ FL=null; hideGrenade(); }
  clearPeekBots(); clearWhiteOut(); clearFlashToast(); clearHud();
  if(MODE==='flash'&&document.pointerLockElement===stage) document.exitPointerLock();
}


/* test hooks for headless checks */
window.EZ={range:()=>RG,rview,rangeTargets:()=>rTargets.map(t=>t.mesh.position.clone()),rangeCamPos:()=>{const v=new THREE.Vector3();rangeCam.getWorldPosition(v);return v;},rangeBegin:()=>rangeBeginOrResume(),rangeShoot:()=>rangeShoot(),setMode:(m,tab)=>setMode(m,tab),mode:()=>MODE,simMove:(dx,dy)=>look(dx,dy),simShoot:()=>shoot(),forceRun:()=>{if(R){R.phase='run';R.last=performance.now();hideOv();startSeg();}},tick:(ms)=>{if(!R)return; if(R.phase!=='run'){R.phase='run';hideOv();} step((R.last||performance.now())+ms);},state:()=>R,view,frame:F,capFps,rawEvt:RAW_EVT,setGame,applyShare,enc,dec,S,
  FLOOR_Y,CEIL_Y,DIST,targetPos:()=>tgt.position.clone(),targetRad:()=>tgt.scale.x,targetVisible:()=>tgt.visible,hintSample:()=>sampleHints(),paintHint,bestOf,clearHud,placeTarget,
  currentXH,saveXH,loadGameXH,xhCode:()=>M.xhCode(currentXH()),importXH:s=>importXH(s),
  setEnv,env:()=>S.env,envInfo:()=>({mode:S.env,fog:fog.color.getHex(),fogNear:fog.near,fogFar:fog.far,hemi:hemi.intensity,hemiSky:hemi.color.getHex(),sunI:sun.intensity,sunCol:sun.color.getHex(),sunPos:sun.position.toArray(),sunDisc:sunDisc.visible,sunScale:sunDisc.scale.x,floor:floor.material.color.getHex(),tgt:tgtMat.color.getHex(),tgtEm:tgtMat.emissive.getHex(),bg:scene.background&&scene.background.getHex(),sky:!!skyMesh.parent,hint:hintPal}),
  setTheme,theme:()=>S.theme,applyTheme,
  flash:()=>FL,startFlash:()=>{S.flash.warned=true;newFlashRound();},flashCountdown,spawnFlash,detonateFlash,flashFinish,abandonFlash,flashStep,flashFactor,flashAngle,flashScore,whiteOut,clearWhiteOut,
  flashPeak:()=>_flashPeak,flashUntil:()=>_flashUntil,grenade:()=>grenade,forceFlashRun:()=>{if(FL){FL.phase='run';FL.last=performance.now();hideOv();}},
  lookAway:()=>{view.yaw+=180;},lookAtBomb:()=>{if(!FL||!FL.bomb)return; const p=FL.bomb.pos.clone().sub(camEye); const len=p.length(); const yaw=Math.atan2(-p.x,-p.z)/D2R, pitch=Math.asin(Math.max(-1,Math.min(1,p.y/Math.max(1e-6,len))))/D2R; view.yaw=yaw; view.pitch=pitch;},
  loadScn,unloadScn,previewScn,setArenaDecor,tintScn,flashVisible,flashShoot,applyCams,camEye,peekBots:()=>peekBots,scnId:()=>scnId,scnWalls:()=>scnWalls,scnMeta:()=>scnMeta,setScn:(id)=>{S.flash.scn=id; persistFlash(); previewScn();},SCN,SCN_IDS,firstSolidHit,worldSolids,losOpen,nudgeOutOfSolid,headVisibleFrom,peekVisibilityReport,fixPeekVisibility,flashToast,flashRunTitle,pickBots,BOT_HEAD_R,BOT_BODY_R,FDIFF,useFlashRand,flashSeed,frand,frange,fuseMinMs,findOpenPoint,pathClear,bodyClearFeet,pushPathReport,applyCrouch,stepPeekBots,spawnPeekBots,CROUCH_HEAD_Y,BOT_HEAD_Y,makeRng,STANCE_IDS,botStanceMode,pickStanceKind,assignGroupStances,planStanceToggles,applyBotStance,stepBotStance,stepCrouch,
  makeBot,paintBot,armBot,pickBots,useBots,currentDmg,trainBot:()=>trainBot,syncTrainBot,BOT_HEAD_Y,BOT_HEAD_R,showDmg,applyHit:(...a)=>M.applyHit(...a),dmgModel:(id)=>M.dmgModel(id)};
RANGE_INIT(); makeRenderer(); applyEnv(S.env); syncEnvUI(); applyTheme(S.theme); syncThemeUI(); syncFlashUI(); syncBotUI(); fillXHEditors(); bindXHEditors(); syncInputs(); syncPerf(); renderHist(); renderFinder(); renderDrillBests(); renderFlashBests(); requestAnimationFrame(loop);
document.documentElement.dataset.ready='1';
