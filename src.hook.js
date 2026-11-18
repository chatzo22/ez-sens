/* ---------- Hook Practice (LoL support skillshots) ---------- */
const HOOK_DEF={champ:'Blitzcrank',mode:'free',diff:'medium',quick:false,pair:'random',keys:{hook:'KeyQ',flash:'KeyD'}};
S.hook=Object.assign({},HOOK_DEF,S.hook||{});
S.hook.keys=Object.assign({},HOOK_DEF.keys,S.hook.keys||{});
if(!M.hookChamp(S.hook.champ)) S.hook.champ='Blitzcrank';
store.hookHistory=store.hookHistory||[];

const HK_IMG_W=922, HK_IMG_H=721, HK_W=4000, HK_H=3128;
const HK_PR=55, HK_CR=55, HK_MR=34, HK_PSPD=335, HK_MSPD=325, HK_FLASH=400, HK_FCD=20;
const hx=nx=>nx*HK_W, hy=ny=>(1-ny)*HK_H;
const hpts=list=>list.map(p=>[hx(p[0]),hy(p[1])]);

const DD_API='https://ddragon.leagueoflegends.com';
const RIOT_DISC="EZ Sens isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";
let HK=null, hookRaf=0, hookLast=0, hookCursor={x:hx(0.45),y:hy(0.70)}, hookBind=null, ddVer=null, ddImgs={}, hookReady=false, hookToasts=[];

function hookMap(){
  const walls=[
    {id:'pit',pts:hpts([[0.2516,0.3051],[0.2245,0.3287],[0.1941,0.344],[0.1605,0.3481],[0.128,0.344],[0.0976,0.3301],[0.0694,0.3065],[0.0477,0.276],[0.0315,0.2386],[0.0228,0.1983],[0.0217,0.1553],[0.0282,0.1151],[0.0423,0.0763],[0.0629,0.0444],[0.09,0.018],[0.1193,0.0014],[0.1518,-0.0042],[0.1855,-0.0014],[0.2169,0.0097],[0.2451,0.0305],[0.2679,0.0596],[0.2852,0.0957],[0.2961,0.1359],[0.2668,0.1442],[0.2581,0.1123],[0.2451,0.0846],[0.2267,0.061],[0.2039,0.0444],[0.18,0.0347],[0.154,0.0333],[0.128,0.0388],[0.1052,0.0513],[0.0846,0.0721],[0.0683,0.0971],[0.0575,0.1276],[0.0521,0.1595],[0.0531,0.1928],[0.0597,0.2233],[0.0716,0.2524],[0.09,0.2774],[0.1106,0.2954],[0.1356,0.3065],[0.1605,0.3093],[0.1866,0.3065],[0.2104,0.294],[0.231,0.276]])},
    {id:'top',pts:hpts([[0.4794,0.0],[0.692,0.0],[0.705,0.0527],[0.6963,0.1359],[0.6638,0.2191],[0.6182,0.2413],[0.5662,0.2219],[0.5271,0.1914],[0.4859,0.1553],[0.4772,0.0763]])},
    {id:'torch',pts:hpts([[0.6746,0.1137],[0.7354,0.1026],[0.7679,0.1415],[0.7636,0.2053],[0.7289,0.2386],[0.692,0.2302],[0.6681,0.1692]])},
    {id:'rightCliff',pts:hpts([[0.8568,0.0],[1.0,0.0],[1.0,0.3467],[0.9816,0.3578],[0.9523,0.3162],[0.9414,0.2427],[0.9458,0.1734],[0.9219,0.1179],[0.8948,0.0666],[0.8677,0.0139]])},
    {id:'rightMid',pts:hpts([[0.9599,0.3814],[1.0,0.3717],[1.0,0.7143],[0.974,0.7462],[0.9436,0.6865],[0.9414,0.5825],[0.9566,0.4854],[0.961,0.423]])},
    {id:'br',pts:hpts([[0.949,0.742],[1.0,0.7282],[1.0,1.0],[0.8351,1.0],[0.8113,0.9639],[0.8514,0.9085],[0.9002,0.8669],[0.9458,0.8183],[0.9675,0.7698]])},
    {id:'island',pts:hpts([[0.2256,0.3773],[0.2842,0.344],[0.3525,0.3412],[0.41,0.3717],[0.4534,0.4189],[0.4881,0.4743],[0.4946,0.5215],[0.4685,0.5659],[0.4317,0.5992],[0.4143,0.6408],[0.3774,0.6879],[0.3384,0.6852],[0.2983,0.6269],[0.2516,0.5659],[0.2256,0.4827],[0.2169,0.4272]])},
    {id:'leftMid',pts:hpts([[0.0,0.3953],[0.0759,0.3773],[0.1388,0.405],[0.1605,0.4577],[0.1388,0.5104],[0.0759,0.534],[0.0,0.5201]])},
    {id:'camp',pts:hpts([[0.0,0.6768],[0.0542,0.6602],[0.141,0.6519],[0.2332,0.6685],[0.2408,0.7184],[0.2148,0.7462],[0.0434,0.7517],[0.0,0.7379]])},
    {id:'ruin',pts:hpts([[0.7972,0.7282],[0.859,0.7143],[0.8915,0.7559],[0.8764,0.8072],[0.8221,0.8183],[0.7896,0.7739]])},
  ];
  const brush=[
    {id:'river',pts:hpts([[0.3991,0.2386],[0.461,0.2247],[0.4859,0.2746],[0.4685,0.3218],[0.4143,0.3273],[0.3883,0.2829]])},
    {id:'top',pts:hpts([[0.4859,0.0166],[0.6095,0.0111],[0.6269,0.1179],[0.6052,0.1692],[0.5293,0.1748],[0.4794,0.1082]])},
    {id:'tri',pts:hpts([[0.2581,0.3773],[0.3818,0.3551],[0.4599,0.4161],[0.4816,0.5021],[0.4534,0.5992],[0.3991,0.6602],[0.3232,0.6214],[0.269,0.5381],[0.2473,0.4549]])},
    {id:'left',pts:hpts([[0.0,0.423],[0.0954,0.4133],[0.1388,0.4605],[0.1171,0.5104],[0.0195,0.5215],[0.0,0.4827]])},
    {id:'laneRM',pts:hpts([[0.7646,0.5895],[0.8948,0.5659],[0.9273,0.7004],[0.898,0.7739],[0.8048,0.7878],[0.7505,0.7046]])},
    {id:'laneBM',pts:hpts([[0.5423,0.7559],[0.7104,0.7323],[0.7646,0.8114],[0.7484,0.8946],[0.5748,0.9126],[0.5315,0.8322]])},
    {id:'laneBR',pts:hpts([[0.8113,0.7878],[0.9599,0.7601],[0.9892,0.871],[0.949,0.9501],[0.8406,0.9362],[0.7972,0.8669]])},
    {id:'redTower',pts:hpts([[0.9241,0.1082],[1.0,0.0943],[1.0,0.2843],[0.9631,0.3051],[0.9197,0.2427],[0.9089,0.1637]])},
  ];
  const river={pts:hpts([[0.269,0.1359],[0.295,0.0666],[0.3449,0.0139],[0.4176,0.0028],[0.4881,0.0166],[0.5336,0.0666],[0.551,0.1276],[0.5423,0.1969],[0.5184,0.2607],[0.4859,0.3218],[0.4751,0.3773],[0.5076,0.4327],[0.551,0.4688],[0.5445,0.5104],[0.5011,0.5243],[0.4469,0.4882],[0.3883,0.4327],[0.3232,0.3967],[0.269,0.3523],[0.2408,0.2885],[0.2364,0.215],[0.2516,0.1637]])};
  const pitWater={pts:hpts([[0.2646,0.172],[0.2625,0.1969],[0.256,0.2219],[0.2462,0.2455],[0.2332,0.2649],[0.218,0.2816],[0.1996,0.294],[0.18,0.3024],[0.1605,0.3051],[0.1399,0.3024],[0.1204,0.294],[0.102,0.2816],[0.0868,0.2649],[0.0738,0.2455],[0.064,0.2219],[0.0575,0.1969],[0.0564,0.172],[0.0575,0.1456],[0.064,0.1207],[0.0738,0.0971],[0.0868,0.0777],[0.102,0.061],[0.1204,0.0485],[0.1399,0.0402],[0.1594,0.0388],[0.18,0.0402],[0.1996,0.0485],[0.218,0.061],[0.2332,0.0777],[0.2462,0.0971],[0.256,0.1207],[0.2625,0.1456]])};
  const dirt={pts:hpts([[0.4664,0.4161],[0.564,0.4022],[0.6508,0.4577],[0.6941,0.5548],[0.6725,0.6519],[0.5857,0.6935],[0.5098,0.638],[0.4664,0.5409]])};
  const lanePath=hpts([[0.2169,0.9501],[0.3254,0.9182],[0.4338,0.9015],[0.5423,0.8807],[0.6291,0.8322],[0.6941,0.7559],[0.7213,0.6657],[0.705,0.5687],[0.6833,0.4993],[0.7375,0.4092],[0.8026,0.3121],[0.8265,0.215],[0.8243,0.1456]]);
  const riverPath=hpts([[0.1605,0.172],[0.2495,0.1942],[0.3471,0.2774],[0.4338,0.3606],[0.5098,0.4438],[0.5748,0.4993]]);
  const towers=[{x:hx(0.8243),y:hy(0.1387),r:173,team:'enemy'}, {x:hx(0.2115),y:hy(0.9598),r:173,team:'ally'}];
  const torches=[[hx(0.6529),hy(0.1387)],[hx(0.0521),hy(0.7184)],[hx(0.1909),hy(0.7184)],[hx(0.9675),hy(0.7323)],[hx(0.7831),hy(0.9709)]];
  const spawn={
    player:{x:hx(0.32),y:hy(0.88)},
    adc:{x:hx(0.68),y:hy(0.48)},
    support:{x:hx(0.62),y:hy(0.55)},
    sightA:{x:hx(0.70),y:hy(0.58)},
    sightB:{x:hx(0.78),y:hy(0.28)}
  };
  const labels=[['DRAGON',hx(0.16),hy(0.17)],['RIVER',hx(0.40),hy(0.28)],['TRI',hx(0.34),hy(0.50)],['BOT LANE',hx(0.62),hy(0.70)]];
  return {walls,brush,river,pitWater,dirt,lanePath,riverPath,towers,torches,spawn,labels};
}


function hookInRegion(x,y,shape){
  if(!shape) return false;
  if(shape.pts) return M.pointInPoly(x,y,shape.pts);
  return M.pointInRect(x,y,shape);
}
function hookBBox(pts){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const p of pts){ if(p[0]<x0)x0=p[0]; if(p[1]<y0)y0=p[1]; if(p[0]>x1)x1=p[0]; if(p[1]>y1)y1=p[1]; }
  return {x:x0,y:y0,w:x1-x0,h:y1-y0};
}
function hookPointInShape(shape){
  if(shape.pts){
    const b=hookBBox(shape.pts);
    for(let i=0;i<24;i++){
      const x=b.x+Math.random()*b.w, y=b.y+Math.random()*b.h;
      if(M.pointInPoly(x,y,shape.pts)) return {x,y};
    }
    return {x:b.x+b.w/2, y:b.y+b.h/2};
  }
  return {x:shape.x+(shape.w||0)/2, y:shape.y+(shape.h||0)/2};
}
function hookNearestPathI(path,x,y){
  let best=0, bd=1e9;
  for(let i=0;i<path.length;i++){
    const d=Math.hypot(path[i][0]-x, path[i][1]-y);
    if(d<bd){ bd=d; best=i; }
  }
  return best;
}
function hookWanderTarget(W){
  const map=W.map, roll=Math.random();
  if(roll<0.5 && map.lanePath){
    const p=map.lanePath[Math.floor(Math.random()*map.lanePath.length)];
    return {x:p[0]+(Math.random()*90-45), y:p[1]+(Math.random()*90-45)};
  }
  if(roll<0.75 && map.riverPath){
    const p=map.riverPath[Math.floor(Math.random()*map.riverPath.length)];
    return {x:p[0]+(Math.random()*70-35), y:p[1]+(Math.random()*70-35)};
  }
  const b=map.brush[Math.floor(Math.random()*map.brush.length)];
  return hookPointInShape(b);
}
function hookSightline(){
  const s=(HK&&HK.map||hookMap()).spawn;
  return {player:{x:s.sightA.x,y:s.sightA.y}, target:{x:s.sightB.x,y:s.sightB.y},
    mid:{x:(s.sightA.x+s.sightB.x)/2,y:(s.sightA.y+s.sightB.y)/2}};
}

function persistHook(){ save(); }
function hookChampNow(){ return M.hookChamp(S.hook.champ); }
function hookFlashCd(){ return S.hook.mode==='flashhook'?12:HK_FCD; }

function hookInBrush(x,y,map){
  if(!map) return null;
  for(const b of map.brush) if(hookInRegion(x,y,b)) return b.id;
  return null;
}
function hookSolidCircles(map){
  return (map.towers||[]).map(t=>({x:t.x,y:t.y,r:t.r,kind:'wall',dead:false}));
}
function hookMoveTo(x,y,r,map,tx,ty,dt,spd){
  const dx=tx-x, dy=ty-y, d=Math.hypot(dx,dy);
  let nx=x, ny=y, arrived=d<4;
  if(!arrived){
    const step=Math.min(d, spd*dt);
    nx=x+dx/d*step; ny=y+dy/d*step;
  }
  const hit=M.resolveCircleWalls(nx,ny,r,map.walls);
  nx=hit.x; ny=hit.y;
  for(const t of map.towers||[]){
    const vx=nx-t.x, vy=ny-t.y, dist=Math.hypot(vx,vy), need=r+t.r;
    if(dist<need){
      const p=need-(dist||1);
      nx+=(vx||1)/(dist||1)*p; ny+=(vy||0)/(dist||1)*p;
    }
  }
  nx=Math.max(r+8, Math.min(HK_W-r-8, nx));
  ny=Math.max(r+8, Math.min(HK_H-r-8, ny));
  return {x:nx,y:ny,arrived};
}

function hookWorld(){
  const map=hookMap();
  return {
    map, phase:'idle', mode:S.hook.mode, diff:S.hook.diff, champ:S.hook.champ,
    t:0, left:S.hook.mode==='timed'||S.hook.mode==='flashhook'?60:0,
    player:{x:map.spawn.player.x,y:map.spawn.player.y,r:HK_PR,tx:map.spawn.player.x,ty:map.spawn.player.y,flashCd:0,flashing:0},
    hook:null, charge:null,
    units:[], minions:[], fx:[],
    casts:0, hits:0, misses:0, blocked:0, streak:0, bestStreak:0, score:0, combos:0,
    reacts:[], tths:[],
    waveAt:1.4, reactLeft:0, reactN:0, reactMax:10, appearAt:0,
    frozen:false, lastFlash: -99
  };
}

function hookPickPair(){
  if(S.hook.pair && S.hook.pair!=='random' && S.hook.pair.includes('+')){
    const [a,s]=S.hook.pair.split('+');
    if(M.HOOK_ENEMIES[a]&&M.HOOK_ENEMIES[s]) return [a,s];
  }
  const adc=M.HOOK_ADC[Math.floor(Math.random()*M.HOOK_ADC.length)];
  const sup=M.HOOK_SUP[Math.floor(Math.random()*M.HOOK_SUP.length)];
  return [adc,sup];
}
function hookMakeChamp(id,x,y,role){
  const e=M.hookEnemy(id);
  return {id:id+'-'+Math.random().toString(36).slice(2,6), champ:e.id, name:e.name, role:role||e.role, kind:'champ',
    x,y,r:HK_CR, tx:x, ty:y, spd:role==='adc'?330:335, color:e.color,
    state:'walk', stun:0, flashCd:8+Math.random()*10, reactIn:-1, jukeUntil:0, jx:0, jy:0,
    hidden:false, dead:false, appear:0};
}
function hookSpawnLanePair(W){
  const [adc,sup]=hookPickPair();
  const s=W.map.spawn;
  W.units=W.units.filter(u=>u.kind!=='champ');
  W.units.push(hookMakeChamp(adc, s.adc.x+(Math.random()*40-20), s.adc.y+(Math.random()*40-20), 'adc'));
  W.units.push(hookMakeChamp(sup, s.support.x+(Math.random()*40-20), s.support.y+(Math.random()*40-20), 'support'));
}
function hookSpawnReact(W){
  W.units=W.units.filter(u=>u.kind!=='champ');
  const b=W.map.brush[Math.floor(Math.random()*W.map.brush.length)];
  const id=Math.random()<0.55?M.HOOK_ADC[Math.floor(Math.random()*M.HOOK_ADC.length)]:M.HOOK_SUP[Math.floor(Math.random()*M.HOOK_SUP.length)];
  const p=hookPointInShape(b);
  const u=hookMakeChamp(id,p.x,p.y,M.hookEnemy(id).role);
  const goal=W.map.riverPath[W.map.riverPath.length-1]||W.map.lanePath[Math.floor(W.map.lanePath.length/2)];
  u.tx=goal[0]+(Math.random()*80-40); u.ty=goal[1]+(Math.random()*80-40);
  u.appear=W.t;
  W.units.push(u);
  W.appearAt=W.t;
}
function hookSpawnWave(W, side){
  const fromEnemy=side!=='ally';
  const path=W.map.lanePath;
  if(!path||path.length<2) return;
  const startI=fromEnemy?path.length-1:0;
  const dir=fromEnemy?-1:1;
  const a=path[startI], b=path[startI+dir]||a;
  const tx=b[0]-a[0], ty=b[1]-a[1], len=Math.hypot(tx,ty)||1;
  const px=-ty/len, py=tx/len;
  const kinds=[['melee',-55],['melee',0],['melee',55],['caster',-40],['caster',40],['caster',0]];
  if(Math.random()<0.35) kinds.push(['cannon',0]);
  for(const [k,off] of kinds){
    const r=k==='cannon'?42:k==='melee'?36:30;
    W.minions.push({id:'m'+Math.random().toString(36).slice(2,7), kind:'minion', typ:k, team:fromEnemy?'enemy':'ally',
      x:a[0]+px*off+(Math.random()*16-8), y:a[1]+py*off+(Math.random()*16-8), r,
      tx:a[0], ty:a[1], spd:k==='cannon'?300:HK_MSPD, dead:false, hp:1,
      path, pi:startI, pdir:dir});
  }
}

function hookCanSee(W,u){
  const pb=hookInBrush(W.player.x,W.player.y,W.map);
  const ub=hookInBrush(u.x,u.y,W.map);
  if(ub && ub!==pb) return false;
  return true;
}

function hookThreatens(W,u){
  if(!W.hook && !W.charge) return false;
  const c=hookChampNow();
  let ox=W.player.x, oy=W.player.y, dx,dy,range;
  if(W.hook){ dx=W.hook.dx; dy=W.hook.dy; range=W.hook.range; ox=W.hook.ox; oy=W.hook.oy; }
  else {
    const aim=M.hookDir(ox,oy,hookCursor.x,hookCursor.y);
    dx=aim.x; dy=aim.y; range=W.charge?W.charge.range:c.range;
  }
  const t=M.rayCircleFirst(ox,oy,dx,dy,range,u.x,u.y,u.r+(c.width/2)+30);
  return t!=null;
}

function hookAiDecide(W,u,dt){
  const d=M.hookDiff(W.diff);
  if(u.reactIn<0 && (W.charge|| (W.hook&&W.hook.alive)) && hookThreatens(W,u)){
    u.reactIn=d.react*(0.75+Math.random()*0.5);
  }
  if(u.reactIn>=0){
    u.reactIn-=dt;
    if(u.reactIn<=0 && u.state!=='flash'){
      u.reactIn=-1;
      const willFlash=(S.hook.mode==='flashhook'?Math.min(0.85,d.flash+0.25):d.flash)>Math.random() && u.flashCd<=0;
      const hx=W.hook?W.hook.dx:M.hookDir(W.player.x,W.player.y,hookCursor.x,hookCursor.y).x;
      const hy=W.hook?W.hook.dy:M.hookDir(W.player.x,W.player.y,hookCursor.x,hookCursor.y).y;
      const s=Math.random()<0.5?1:-1;
      const jx=-hy*s, jy=hx*s;
      if(willFlash){
        const fx=u.x+jx*HK_FLASH, fy=u.y+jy*HK_FLASH;
        const dest=hookMoveTo(u.x,u.y,u.r,W.map,fx,fy,10,HK_FLASH); // snap-ish
        // actual flash is instantaneous 400 units
        let nx=u.x+jx*HK_FLASH, ny=u.y+jy*HK_FLASH;
        const cl=hookMoveTo(u.x,u.y,u.r,W.map,nx,ny,2,HK_FLASH);
        u.x=cl.x; u.y=cl.y; u.tx=cl.x; u.ty=cl.y;
        u.flashCd=30; u.state='walk';
        hookAddFx(W,'flash',u.x,u.y,'#cfe8ff',0.35);
      } else {
        // maybe hide behind a minion
        const cover=W.minions.filter(m=>m.team==='enemy'&&!m.dead).map(m=>{
          const away=M.hookDir(W.player.x,W.player.y,m.x,m.y);
          return {m, x:m.x+away.x*(m.r+u.r+8), y:m.y+away.y*(m.r+u.r+8), d:Math.hypot(m.x-u.x,m.y-u.y)};
        }).filter(c=>c.d<420).sort((a,b)=>a.d-b.d)[0];
        if(cover && Math.random()<0.45){
          u.tx=cover.x; u.ty=cover.y; u.state='hide'; u.jukeUntil=W.t+0.7;
        } else {
          u.jx=jx; u.jy=jy; u.state='juke'; u.jukeUntil=W.t+0.35+Math.random()*0.25;
        }
      }
    }
  }
}

function hookStepUnits(W,dt){
  for(const u of W.units){
    if(u.dead) continue;
    u.flashCd=Math.max(0,u.flashCd-dt);
    if(u.stun>0){ u.stun-=dt; continue; }
    if(!W.frozen) hookAiDecide(W,u,dt);
    if(W.frozen) continue;
    if(u.state==='juke' && W.t<u.jukeUntil){
      const dest=hookMoveTo(u.x,u.y,u.r,W.map, u.x+u.jx*200, u.y+u.jy*200, dt, u.spd*M.hookDiff(W.diff).juke*1.6);
      u.x=dest.x; u.y=dest.y;
    } else {
      if(u.state==='juke' || (u.state==='hide'&&W.t>=u.jukeUntil)) u.state='walk';
      if(u.state==='walk' && (u.arrived || Math.hypot(u.tx-u.x,u.ty-u.y)<12 || Math.random()<dt*0.35)){
        // wander the upper / mid lane
        if(W.mode==='reaction'){ /* keep scripted target */ }
        else {
          const g=hookWanderTarget(W);
          u.tx=g.x; u.ty=g.y;
        }
      }
      const d=hookMoveTo(u.x,u.y,u.r,W.map,u.tx,u.ty,dt,u.spd);
      u.x=d.x; u.y=d.y; u.arrived=d.arrived;
    }
    u.hidden=!hookCanSee(W,u);
  }
}

function hookStepMinions(W,dt){
  for(const m of W.minions){
    if(m.dead) continue;
    const path=m.path||W.map.lanePath;
    if(path&&path.length){
      if(m.pi==null) m.pi=hookNearestPathI(path,m.x,m.y);
      const tgt=path[m.pi];
      if(!tgt){ m.dead=true; continue; }
      const d=hookMoveTo(m.x,m.y,m.r,W.map,tgt[0],tgt[1],dt,m.spd);
      m.x=d.x; m.y=d.y;
      if(d.arrived || Math.hypot(m.x-tgt[0],m.y-tgt[1])<28){
        m.pi+=(m.pdir||1);
        if(m.pi<0 || m.pi>=path.length) m.dead=true;
      }
    }else{
      const d=hookMoveTo(m.x,m.y,m.r,W.map,m.tx,m.ty,dt,m.spd);
      m.x=d.x; m.y=d.y;
      if(d.arrived) m.dead=true;
    }
  }
  W.minions=W.minions.filter(m=>!m.dead);
}

function hookAddFx(W,kind,x,y,color,life,text){
  W.fx.push({kind,x,y,color,life,max:life,text});
}
function hookToast(text, cls){
  hookToasts.push({text,cls:cls||'',t:performance.now(),life:800});
  const el=$('#hookToast'); if(!el)return;
  el.textContent=text; el.className=(cls||'')+' show';
  clearTimeout(hookToast._tm);
  hookToast._tm=setTimeout(()=>el.classList.remove('show'),700);
}

function hookFire(W, wx, wy, rangeOverride, skipCast){
  if(!W || W.phase!=='run') return false;
  if(W.hook && W.hook.alive) return false;
  const c=hookChampNow();
  const aim=M.hookDir(W.player.x,W.player.y,wx,wy);
  const range=rangeOverride!=null?rangeOverride:c.range;
  const wind=skipCast?0:c.cast;
  W.charge=null;
  if(wind>0){
    W.charge={wind,t:0,range,wx,wy,dx:aim.x,dy:aim.y, started:W.t};
    return true;
  }
  return hookRelease(W, range, aim.x, aim.y);
}
function hookRelease(W, range, dx, dy){
  const c=hookChampNow();
  W.charge=null;
  W.hook={ox:W.player.x, oy:W.player.y, dx, dy, speed:c.speed, range, width:c.width,
    t:0, alive:true, result:null, firedAt:W.t, color:c.color};
  W.casts++;
  // arm AI that hasn't reacted yet
  for(const u of W.units){ if(u.reactIn<0 && hookThreatens(W,u)) u.reactIn=M.hookDiff(W.diff).react*(0.5+Math.random()*0.4); }
  if(S.sound) beep(520,0.05,'triangle',0.04);
  return true;
}

function hookUnitsForRay(W){
  const list=[];
  for(const u of W.units) if(!u.dead) list.push(u);
  for(const m of W.minions) if(!m.dead && m.team==='enemy') list.push(m);
  return list;
}

function hookFinish(W, result, at){
  W.hook.alive=false; W.hook.result=result; W.hook.hitAt=at; W.hook.fade=0.35;
  const kind=result&&result.kind, u=result&&result.unit;
  if(kind==='champ'){
    W.hits++; W.streak++; W.bestStreak=Math.max(W.bestStreak,W.streak);
    const tth=(W.t-W.hook.firedAt);
    W.tths.push(tth);
    if(W.mode==='reaction' && W.appearAt) W.reacts.push(Math.max(0, W.hook.firedAt-W.appearAt));
    let pts=100+10*W.streak;
    const combo=W.t-W.lastFlash<1.6;
    if(combo){ pts+=50; W.combos++; hookToast('FLASH-HOOK','hit'); }
    else hookToast('HIT','hit');
    W.score+=pts;
    u.stun=1.15; u.state='stunned';
    hookAddFx(W,'hit',at.x,at.y,hookChampNow().color,0.55,'HIT');
    if(S.sound) beep(880,0.1,'square',0.05);
    if(W.mode==='reaction'){ W.reactLeft=1.1; }
    else setTimeout(()=>{ if(!HK||u.dead)return; u.stun=0; u.state='walk'; const g=hookWanderTarget(HK); u.tx=g.x; u.ty=g.y; }, 900);
  } else if(kind==='minion'){
    W.blocked++; W.streak=0; W.misses++;
    hookToast('BLOCKED','block');
    hookAddFx(W,'block',at.x,at.y,'#ffb36a',0.45,'BLOCKED');
    if(S.sound) beep(220,0.08,'sine',0.04);
    if(W.mode==='reaction') W.reactLeft=0.9;
  } else {
    W.misses++; W.streak=0;
    hookToast('MISS','miss');
    hookAddFx(W,'miss',at.x,at.y,'#ff6b6b',0.4,'MISS');
    if(S.sound) beep(180,0.08,'sine',0.04);
    if(W.mode==='reaction') W.reactLeft=0.9;
  }
  syncHookStats();
}

function hookStepHook(W,dt){
  if(W.charge){
    W.charge.t+=dt;
    const c=hookChampNow();
    if(c.chargeUp && W.charge.charging){
      W.charge.range=M.hookChargeRange(c, W.charge.t);
    }
    // aim follows cursor during wind-up (not during Pyke charge hold after max — still follow)
    const aim=M.hookDir(W.player.x,W.player.y,hookCursor.x,hookCursor.y);
    W.charge.dx=aim.x; W.charge.dy=aim.y;
    if(!W.charge.charging && W.charge.t>=W.charge.wind){
      hookRelease(W, W.charge.range, W.charge.dx, W.charge.dy);
    }
  }
  const h=W.hook;
  if(!h) return;
  if(!h.alive){
    h.fade=(h.fade||0)-dt;
    if(h.fade<=0) W.hook=null;
    return;
  }
  h.t+=dt;
  const tip=M.hookTip(h.ox,h.oy,h.dx,h.dy,h.speed,h.t,h.range);
  const hit=M.firstHookHit(h.ox,h.oy,h.dx,h.dy,tip.dist,h.range,h.width/2,hookUnitsForRay(W),W.map.walls);
  if(hit){
    const at={x:h.ox+h.dx*hit.t, y:h.oy+h.dy*hit.t};
    hookFinish(W, hit, at);
    return;
  }
  if(tip.dist>=h.range-0.01){
    hookFinish(W, {kind:'miss'}, tip);
  }
}

function hookStepPlayer(W,dt){
  const p=W.player;
  p.flashCd=Math.max(0,p.flashCd-dt);
  if(p.flashing>0) p.flashing-=dt;
  const d=hookMoveTo(p.x,p.y,p.r,W.map,p.tx,p.ty,dt,HK_PSPD);
  p.x=d.x; p.y=d.y;
}

function hookDoFlash(W, wx, wy){
  if(!W||W.phase!=='run') return false;
  const p=W.player;
  if(p.flashCd>0) return false;
  const aim=M.hookDir(p.x,p.y,wx,wy);
  const dest=hookMoveTo(p.x,p.y,p.r,W.map, p.x+aim.x*HK_FLASH, p.y+aim.y*HK_FLASH, 2, HK_FLASH);
  p.x=dest.x; p.y=dest.y; p.tx=dest.x; p.ty=dest.y;
  p.flashCd=hookFlashCd(); p.flashing=0.2;
  W.lastFlash=W.t;
  hookAddFx(W,'flash',p.x,p.y,'#cfe8ff',0.35);
  if(S.sound) beep(640,0.08,'triangle',0.05);
  return true;
}

function hookStep(W,dt){
  if(!W||W.phase!=='run') return;
  if(!W.frozen) W.t+=dt;
  if((W.mode==='timed'||W.mode==='flashhook') && !W.frozen){
    W.left=Math.max(0,W.left-dt);
    if(W.left<=0){ hookEndRun(true); return; }
  }
  if(!W.frozen){
    hookStepPlayer(W,dt);
    hookStepUnits(W,dt);
    hookStepMinions(W,dt);
    if(W.mode!=='reaction' && W.t>=W.waveAt){
      hookSpawnWave(W,'enemy');
      hookSpawnWave(W,'ally');
      W.waveAt=W.t+25;
    }
    if(W.mode==='reaction'){
      if(!W.units.some(u=>u.kind==='champ'&&!u.dead) && W.reactLeft<=0){
        if(W.reactN>=W.reactMax){ hookEndRun(true); return; }
        W.reactLeft=0.8+Math.random()*1.7;
      }
      if(W.reactLeft>0){
        W.reactLeft-=dt;
        if(W.reactLeft<=0 && W.reactN<W.reactMax && !W.units.some(u=>u.kind==='champ'&&!u.dead)){
          hookSpawnReact(W); W.reactN++;
        }
      }
    }
  }
  hookStepHook(W,dt);
  W.fx=W.fx.filter(f=>((f.life-=dt)>0));
}

function hookAvg(arr){ if(!arr||!arr.length) return null; return arr.reduce((a,b)=>a+b,0)/arr.length; }

function hookEndRun(saveIt){
  if(!HK||HK.phase!=='run') return;
  HK.phase='done';
  const res={
    at:Date.now(), mode:HK.mode, champ:HK.champ, ability:hookChampNow().ability, diff:HK.diff,
    cm: currentCm(), casts:HK.casts, hits:HK.hits, misses:HK.misses, blocked:HK.blocked,
    hitPct: HK.casts?100*HK.hits/HK.casts:0, streak:HK.bestStreak, score:HK.score, combos:HK.combos,
    tth:hookAvg(HK.tths), react:hookAvg(HK.reacts)
  };
  if(saveIt && HK.casts>0){
    store.hookHistory.unshift(res);
    store.hookHistory=store.hookHistory.slice(0,200);
    persistHook();
    if(typeof renderHist==='function') renderHist();
  }
  const pct=res.casts?Math.round(res.hitPct)+'%':'—';
  const tth=Number.isFinite(res.tth)?Math.round(res.tth*1000)+' ms':'—';
  const react=Number.isFinite(res.react)?Math.round(res.react*1000)+' ms':'—';
  hookToast(saveIt?'SAVED':'ENDED','');
  const rec=$('#hookRecap'); if(rec){
    rec.innerHTML=`<div class="card"><b>Run over</b> — ${esc(hookChampNow().name)} ${esc(hookChampNow().ability)} · ${esc(HK.mode)} · ${esc(HK.diff)}<div class="resgrid" style="margin-top:8px">
      <div class="stat"><div class="k">Score</div><div class="v">${Math.round(res.score)}</div></div>
      <div class="stat"><div class="k">Hit %</div><div class="v">${pct}</div></div>
      <div class="stat"><div class="k">Hits / casts</div><div class="v">${res.hits} / ${res.casts}</div></div>
      <div class="stat"><div class="k">Best streak</div><div class="v">${res.streak}</div></div>
      <div class="stat"><div class="k">Avg time-to-hit</div><div class="v">${tth}</div></div>
      <div class="stat"><div class="k">Avg react</div><div class="v">${react}</div></div>
    </div></div>`;
  }
  const btn=$('#hookBtn'); if(btn) btn.textContent='Start practice';
  syncHookStats();
}

function startHook(mode){
  if(mode) S.hook.mode=mode;
  HK=hookWorld();
  HK.phase='run';
  if(HK.mode==='reaction'){ HK.reactLeft=1.0; HK.reactN=0; }
  else hookSpawnLanePair(HK);
  hookLast=performance.now();
  const rec=$('#hookRecap'); if(rec) rec.innerHTML='';
  const btn=$('#hookBtn'); if(btn) btn.textContent='End run';
  hookToast((hookChampNow().ability||'HOOK').toUpperCase(),'');
  startHookLoop();
  syncHookStats();
  return HK;
}
function pauseHook(){ if(hookRaf){ cancelAnimationFrame(hookRaf); hookRaf=0; } }
function resumeHook(){ hookEnsure(); startHookLoop(); paintChampPicker(); loadPortraits(); }
function abandonHook(){ pauseHook(); if(HK) HK.phase='idle'; }

function startHookLoop(){
  if(hookRaf) return;
  hookLast=performance.now();
  const tick=(now)=>{
    hookRaf=requestAnimationFrame(tick);
    const cap=typeof capFps==='function'?capFps():0;
    const min=cap?1000/cap:0;
    if(min && now-hookLast<min-0.5){ hookDraw(); return; }
    const dt=Math.min(0.05, Math.max(0, (now-hookLast)/1000));
    hookLast=now;
    if(HK && HK.phase==='run') hookStep(HK,dt);
    hookDraw();
  };
  hookRaf=requestAnimationFrame(tick);
}

/* ---------- Data Dragon portraits ---------- */
function loadPortraits(){
  if(loadPortraits._ing) return loadPortraits._ing;
  loadPortraits._ing=(async()=>{
    const ids=['Blitzcrank','Thresh','Nautilus','Pyke','Jinx','Ezreal','Caitlyn','Lux','Leona'];
    const fallback='16.23.1';
    try{
      const vers=await fetch(DD_API+'/api/versions.json').then(r=>{ if(!r.ok) throw new Error('ver'); return r.json(); });
      if(Array.isArray(vers)&&vers[0]) ddVer=String(vers[0]);
    }catch(e){ ddVer=ddVer||fallback; }
    if(!ddVer) ddVer=fallback;
    await Promise.all(ids.map(id=>new Promise(res=>{
      if(ddImgs[id]&&ddImgs[id].complete&&ddImgs[id].naturalWidth) return res();
      const im=new Image();
      im.decoding='async';
      im.onload=()=>{ ddImgs[id]=im; paintChampPicker(); res(); };
      im.onerror=()=>res();
      im.src=`${DD_API}/cdn/${ddVer}/img/champion/${id}.png`;
    })));
    paintChampPicker();
  })();
  return loadPortraits._ing;
}

/* ---------- Canvas view ---------- */
function hookView(cv){
  const dpr=Math.min(2, window.devicePixelRatio||1);
  const w=cv.clientWidth||cv.width, h=cv.clientHeight||cv.height;
  if(cv.width!==Math.max(1,Math.round(w*dpr)) || cv.height!==Math.max(1,Math.round(h*dpr))){
    cv.width=Math.max(1,Math.round(w*dpr)); cv.height=Math.max(1,Math.round(h*dpr));
  }
  const sc=Math.min(cv.width/HK_W, cv.height/HK_H)*0.98;
  const ox=(cv.width-HK_W*sc)/2, oy=(cv.height-HK_H*sc)/2;
  return {sc,ox,oy,dpr};
}
function toScreen(v,x,y){ return {x:v.ox+x*v.sc, y:v.oy+(HK_H-y)*v.sc}; }
function toWorld(v,sx,sy){ return {x:(sx-v.ox)/v.sc, y:HK_H-(sy-v.oy)/v.sc}; }
function hookEventWorld(ev,cv){
  const r=cv.getBoundingClientRect();
  const v=hookView(cv);
  const sx=(ev.clientX-r.left)*(cv.width/Math.max(1,r.width));
  const sy=(ev.clientY-r.top)*(cv.height/Math.max(1,r.height));
  return toWorld(v,sx,sy);
}

function drawToken(ctx,v,x,y,r,img,ring,name,hidden){
  const p=toScreen(v,x,y), rad=r*v.sc;
  ctx.save();
  ctx.beginPath(); ctx.arc(p.x,p.y,rad,0,Math.PI*2); ctx.closePath();
  if(hidden){
    ctx.fillStyle='#0b1512'; ctx.fill();
    ctx.strokeStyle='#1c2e28'; ctx.lineWidth=Math.max(2,rad*0.08); ctx.stroke();
    ctx.fillStyle='#3a5248';
    ctx.font=`${Math.floor(rad*0.55)}px system-ui,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('?',p.x,p.y+1);
  }else if(img && img.complete && img.naturalWidth){
    ctx.save(); ctx.clip();
    ctx.drawImage(img, p.x-rad, p.y-rad, rad*2, rad*2);
    ctx.restore();
    ctx.strokeStyle=ring; ctx.lineWidth=Math.max(2,rad*0.12); ctx.stroke();
  }else{
    ctx.fillStyle=ring||'#4a6'; ctx.fill();
    ctx.strokeStyle='#fff8'; ctx.lineWidth=Math.max(2,rad*0.08); ctx.stroke();
    ctx.fillStyle='#0a0d12';
    ctx.font=`700 ${Math.floor(rad*0.7)}px system-ui,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText((name||'?')[0],p.x,p.y+1);
  }
  ctx.restore();
}


function hookPath(ctx,v,pts,close){
  if(!pts||!pts.length) return;
  const a=toScreen(v,pts[0][0],pts[0][1]);
  ctx.beginPath(); ctx.moveTo(a.x,a.y);
  for(let i=1;i<pts.length;i++){ const q=toScreen(v,pts[i][0],pts[i][1]); ctx.lineTo(q.x,q.y); }
  if(close!==false) ctx.closePath();
}
function hookFill(ctx,v,pts,fill,stroke,lw){
  hookPath(ctx,v,pts);
  if(fill){ ctx.fillStyle=fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=lw||2; ctx.stroke(); }
}

function hookDraw(){
  const cv=$('#hookCv'); if(!cv) return;
  const ctx=cv.getContext('2d');
  const v=hookView(cv);
  const W=HK||hookWorld();
  const map=W.map;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle='#0a1210'; ctx.fillRect(0,0,cv.width,cv.height);

  // grass
  const origin=toScreen(v,0,HK_H), ext=toScreen(v,HK_W,0);
  ctx.fillStyle='#2a5a32';
  ctx.fillRect(origin.x,origin.y,ext.x-origin.x,ext.y-origin.y);
  ctx.globalAlpha=0.18;
  for(let i=0;i<90;i++){
    const gx=(i*167)%HK_W, gy=(i*97+40)%HK_H, p=toScreen(v,gx,gy);
    ctx.fillStyle=i%2?'#3d7040':'#1e3f24';
    ctx.beginPath(); ctx.ellipse(p.x,p.y, 18*v.sc, 11*v.sc, 0,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
  // dirt at the river-lane junction + paved lane ribbon
  if(map.dirt&&map.dirt.pts) hookFill(ctx,v,map.dirt.pts,'#6e5a3a','#5a492e',1);
  if(map.lanePath&&map.lanePath.length){
    const a=toScreen(v,map.lanePath[0][0],map.lanePath[0][1]);
    ctx.beginPath(); ctx.moveTo(a.x,a.y);
    for(let i=1;i<map.lanePath.length;i++){ const q=toScreen(v,map.lanePath[i][0],map.lanePath[i][1]); ctx.lineTo(q.x,q.y); }
    ctx.strokeStyle='#8a7348'; ctx.lineWidth=Math.max(10, 86*v.sc); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke();
    ctx.strokeStyle='#c4b089'; ctx.lineWidth=Math.max(4, 52*v.sc); ctx.globalAlpha=0.55; ctx.stroke(); ctx.globalAlpha=1;
  }
  // river + dragon pit water
  if(map.river&&map.river.pts) hookFill(ctx,v,map.river.pts,'#1a4c5e','#163e4c',2);
  if(map.pitWater&&map.pitWater.pts) hookFill(ctx,v,map.pitWater.pts,'#1c5668','#1a4c5e',1);
  // faint river shimmer
  if(map.river&&map.river.pts){
    ctx.save(); hookPath(ctx,v,map.river.pts); ctx.clip();
    ctx.globalAlpha=0.22; ctx.fillStyle='#2e7a8c';
    const bb=hookBBox(map.river.pts);
    for(let i=0;i<8;i++){
      const yy=bb.y+((i*55+(W.t||0)*22)%(bb.h+40));
      const p=toScreen(v,bb.x,yy), p2=toScreen(v,bb.x+bb.w,yy);
      ctx.fillRect(p.x,p.y,p2.x-p.x, Math.max(2,5*v.sc));
    }
    ctx.restore(); ctx.globalAlpha=1;
  }
  // brush (walkable tall grass)
  for(const b of map.brush){
    if(!b.pts) continue;
    hookFill(ctx,v,b.pts,'#16351c','#1c4a24',1.5);
    const bb=hookBBox(b.pts);
    ctx.save(); hookPath(ctx,v,b.pts); ctx.clip();
    ctx.fillStyle='#0f2a16';
    for(let i=0;i<14;i++){
      const px=bb.x+((i*47)%bb.w), py=bb.y+((i*31)%bb.h), q=toScreen(v,px,py);
      ctx.beginPath(); ctx.ellipse(q.x,q.y, 7*v.sc, 13*v.sc, 0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  // stone / jungle walls (collision matches these shapes)
  for(const w of map.walls){
    if(!w.pts) continue;
    hookFill(ctx,v,w.pts,'#3a3a38','#2a2a28',2);
    ctx.save(); hookPath(ctx,v,w.pts); ctx.clip();
    ctx.strokeStyle='#5a5750'; ctx.lineWidth=Math.max(2,3*v.sc);
    hookPath(ctx,v,w.pts); ctx.stroke();
    ctx.restore();
  }
  // torches
  for(const tr of map.torches||[]){
    const p=toScreen(v,tr[0],tr[1]);
    ctx.beginPath(); ctx.arc(p.x,p.y, Math.max(3,5*v.sc),0,Math.PI*2);
    ctx.fillStyle='#ff9a32'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x,p.y, Math.max(5,9*v.sc),0,Math.PI*2);
    ctx.strokeStyle='#ffc87866'; ctx.lineWidth=2; ctx.stroke();
  }
  // towers (simple original markers)
  for(const tw of map.towers){
    const p=toScreen(v,tw.x,tw.y);
    ctx.beginPath(); ctx.arc(p.x,p.y,tw.r*v.sc,0,Math.PI*2);
    ctx.fillStyle=tw.team==='ally'?'#2a5a4a':'#5a2a32'; ctx.fill();
    ctx.strokeStyle=tw.team==='ally'?'#36f1a6':'#f16a6a'; ctx.lineWidth=3; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x,p.y,tw.r*v.sc*0.4,0,Math.PI*2);
    ctx.fillStyle='#cfc8a4'; ctx.fill();
  }
  // callouts
  ctx.font=`600 ${Math.max(11,12*v.sc)}px system-ui,sans-serif`;
  ctx.fillStyle='#ffffff55'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const [lb,x,y] of (map.labels||[])){ const p=toScreen(v,x,y); ctx.fillText(lb,p.x,p.y); }

  // minions
  for(const m of W.minions||[]){
    if(m.dead) continue;
    const p=toScreen(v,m.x,m.y);
    ctx.beginPath(); ctx.arc(p.x,p.y,m.r*v.sc,0,Math.PI*2);
    ctx.fillStyle=m.team==='enemy'?(m.typ==='cannon'?'#8a3a3a':'#6a3030'):(m.typ==='cannon'?'#2e6a5a':'#2a5548');
    ctx.fill(); ctx.strokeStyle='#0008'; ctx.lineWidth=1; ctx.stroke();
  }

  // range indicator
  const c=hookChampNow();
  const showRange=W.charge || (HK&&HK.phase==='run');
  if(showRange){
    const p=toScreen(v,W.player.x,W.player.y);
    const range=W.charge?W.charge.range:c.range;
    ctx.beginPath(); ctx.arc(p.x,p.y,range*v.sc,0,Math.PI*2);
    ctx.strokeStyle=c.color+'99'; ctx.lineWidth=1.5; ctx.setLineDash([6,6]); ctx.stroke(); ctx.setLineDash([]);
    if(W.charge){
      const tip=toScreen(v, W.player.x+W.charge.dx*range, W.player.y+W.charge.dy*range);
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tip.x,tip.y);
      ctx.strokeStyle=c.color; ctx.lineWidth=2; ctx.stroke();
    }
  }

  // hook projectile
  if(W.hook){
    const h=W.hook;
    const traveled=h.alive?Math.min(h.speed*h.t,h.range):(h.hitAt?Math.hypot(h.hitAt.x-h.ox,h.hitAt.y-h.oy):h.range);
    const a=toScreen(v,h.ox,h.oy);
    const b=toScreen(v,h.ox+h.dx*traveled,h.oy+h.dy*traveled);
    ctx.save();
    ctx.globalAlpha=h.alive?1:Math.max(0,h.fade||0)/0.35;
    ctx.strokeStyle=h.color||c.color; ctx.lineWidth=Math.max(3,(h.width*v.sc)*0.35); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.fillStyle=h.color||c.color;
    ctx.beginPath(); ctx.arc(b.x,b.y, Math.max(4,8*v.sc),0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // enemies
  for(const u of W.units||[]){
    drawToken(ctx,v,u.x,u.y,u.r, ddImgs[u.champ], u.color, u.name, !!u.hidden);
    if(!u.hidden){
      const p=toScreen(v,u.x,u.y);
      ctx.fillStyle='#f2f6ff'; ctx.font=`600 ${Math.max(10,11*v.sc)}px system-ui,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(u.name, p.x, p.y-u.r*v.sc-4);
    }
  }
  // player
  const P=W.player;
  drawToken(ctx,v,P.x,P.y,P.r, ddImgs[S.hook.champ], c.color, hookChampNow().name, false);
  {
    const p=toScreen(v,P.x,P.y);
    ctx.fillStyle='#f2f6ff'; ctx.font=`700 ${Math.max(10,11*v.sc)}px system-ui,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(hookChampNow().name, p.x, p.y-P.r*v.sc-4);
    if(P.flashing>0){
      ctx.beginPath(); ctx.arc(p.x,p.y,(P.r+20)*v.sc,0,Math.PI*2);
      ctx.strokeStyle='#cfe8ff'; ctx.lineWidth=3; ctx.stroke();
    }
  }
  // fx
  for(const f of W.fx||[]){
    const p=toScreen(v,f.x,f.y);
    ctx.globalAlpha=Math.max(0,f.life/f.max);
    if(f.text){
      ctx.fillStyle=f.color; ctx.font=`800 ${Math.max(14,18*v.sc)}px system-ui,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(f.text,p.x,p.y-24*v.sc);
    } else {
      ctx.beginPath(); ctx.arc(p.x,p.y,18*v.sc*(1.4-f.life/f.max),0,Math.PI*2);
      ctx.strokeStyle=f.color; ctx.lineWidth=3; ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  // on-canvas hud
  const hud=$('#hookHud');
  if(hud && HK && HK.phase==='run'){
    const pct=HK.casts?Math.round(100*HK.hits/HK.casts)+'%':'—';
    const left=(HK.mode==='timed'||HK.mode==='flashhook')?`  ·  ${HK.left.toFixed(1)}s`:'';
    const fcd=HK.player.flashCd>0?`  ·  Flash ${HK.player.flashCd.toFixed(1)}s`:'  ·  Flash ready';
    hud.textContent=`${hookChampNow().ability}  ·  ${HK.hits}/${HK.casts} (${pct})  ·  Streak ${HK.streak}${left}${fcd}`;
  } else if(hud){ hud.textContent=HK&&HK.phase==='done'?'Run over — press Start for another.':'Right-click to move. Q hooks toward the cursor.'; }
}

function syncHookStats(){
  const el=$('#hookLive'); if(!el) return;
  if(!HK){ el.innerHTML=''; return; }
  const pct=HK.casts?Math.round(100*HK.hits/HK.casts)+'%':'—';
  const tth=hookAvg(HK.tths), react=hookAvg(HK.reacts);
  el.innerHTML=`<div class="grid g4">
    <div class="card stat"><div class="k">Hit %</div><div class="v">${pct}</div></div>
    <div class="card stat"><div class="k">Hits / casts</div><div class="v">${HK.hits} / ${HK.casts}</div></div>
    <div class="card stat"><div class="k">Best streak</div><div class="v">${HK.bestStreak}</div></div>
    <div class="card stat"><div class="k">Score</div><div class="v">${Math.round(HK.score)}</div></div>
    <div class="card stat"><div class="k">Avg time-to-hit</div><div class="v">${tth!=null?Math.round(tth*1000)+' ms':'—'}</div></div>
    <div class="card stat"><div class="k">Avg react</div><div class="v">${react!=null?Math.round(react*1000)+' ms':'—'}</div></div>
  </div>`;
}

function renderHookHist(){
  const el=$('#hhist'); if(!el) return;
  const ms=v=>Number.isFinite(v)?Math.round(v*1000)+' ms':'—';
  const rows=(store.hookHistory||[]).map(h=>`<tr><td>${new Date(h.at).toLocaleString()}</td><td>${esc(h.champ||'')} · ${esc(h.ability||'')}</td><td>${esc(h.mode||'')}</td><td>${esc(h.diff||'')}</td><td><b>${Math.round(h.score||0)}</b></td><td>${h.casts?Math.round(h.hitPct)+'%':'—'}</td><td>${h.hits||0} / ${h.casts||0}</td><td>${h.streak||0}</td><td>${ms(h.tth)}</td><td>${ms(h.react)}</td><td>${fmt(h.cm,1)}</td></tr>`).join('');
  el.innerHTML=rows||'<tr><td colspan="11" class="muted">No hook practice runs yet.</td></tr>';
}
const _renderHist=renderHist;
renderHist=function(){ _renderHist(); renderHookHist(); const pb=$('#pbests'); if(pb&&store.hookHistory&&store.hookHistory.length){ const best=store.hookHistory.reduce((m,h)=>Math.max(m,+h.score||0),0); pb.insertAdjacentHTML('beforeend', `<div class="card stat"><div class="k">Hook best</div><div class="v">${best||'—'}</div></div>`); } };
const _clear= $('#clearBtn').onclick;
$('#clearBtn').onclick=()=>{ if(confirm('Clear all saved results?')){store.history=[];store.finder=null;store.flashHistory=[];store.hookHistory=[];save();renderHist();renderFinder();renderFlashBests();} };

function paintChampPicker(){
  const box=$('#hookChamps'); if(!box) return;
  box.innerHTML='';
  for(const id of Object.keys(M.HOOK_CHAMPS)){
    const c=M.HOOK_CHAMPS[id];
    const b=document.createElement('button');
    b.type='button'; b.dataset.champ=id; b.className=id===S.hook.champ?'on':'';
    const img=ddImgs[id];
    b.innerHTML=`<span class="hk-ico" style="background:${c.color}"></span><span><b>${esc(c.name)}</b><span>${esc(c.ability)}</span></span>`;
    const ico=b.querySelector('.hk-ico');
    if(img&&img.complete){
      ico.style.backgroundImage=`url(${img.src})`;
      ico.style.backgroundSize='cover';
    }
    box.appendChild(b);
  }
  const ab=$('#hookAbility');
  if(ab){ const c=hookChampNow(); ab.textContent=`${c.ability}  ·  ${c.range}${c.chargeUp?' (charge '+c.rangeMin+'-'+c.range+')':''} range  ·  ${c.width} width  ·  ${c.speed} speed  ·  ${(c.cast*1000)|0} ms wind-up`; }
}

function hookEnsure(){
  const cv=$('#hookCv'); if(!cv) return;
  hookReady=true;
  if(!HK) HK=hookWorld();
  hookDraw();
}

function hookBindUi(){
  paintChampPicker();
  $('#hookChamps').addEventListener('click',e=>{
    const b=e.target.closest('button[data-champ]'); if(!b) return;
    S.hook.champ=b.dataset.champ; persistHook(); paintChampPicker(); hookDraw();
  });
  $$('#hookModes button').forEach(b=>{
    b.classList.toggle('on', b.dataset.hmode===S.hook.mode);
    b.addEventListener('click',()=>{
      S.hook.mode=b.dataset.hmode; persistHook();
      $$('#hookModes button').forEach(x=>x.classList.toggle('on',x===b));
    });
  });
  const diff=$('#hookDiff'); if(diff){ diff.value=S.hook.diff; diff.onchange=()=>{S.hook.diff=diff.value;persistHook();}; }
  const qk=$('#hookQuick'); if(qk){ qk.checked=!!S.hook.quick; qk.onchange=()=>{S.hook.quick=qk.checked;persistHook();}; }
  const pair=$('#hookPair'); if(pair){ pair.value=S.hook.pair||'random'; pair.onchange=()=>{S.hook.pair=pair.value;persistHook();}; }
  const btn=$('#hookBtn'); if(btn) btn.onclick=()=>{ if(HK&&HK.phase==='run') hookEndRun(true); else startHook(); };
  const fs=$('#fsBtnHook'); if(fs) fs.onclick=()=>{ const st=$('#hookStage'); if(!st)return; if(document.fullscreenElement) document.exitFullscreen(); else st.requestFullscreen(); };
  syncHookBinds();
  $$('[data-hookbind]').forEach(b=>b.onclick=()=>{
    hookBind=b.dataset.hookbind;
    b.textContent='Press a key…';
  });
  const cv=$('#hookCv'), stage=$('#hookStage');
  const target=stage||cv;
  target.addEventListener('contextmenu',e=>{ e.preventDefault(); if(!HK||HK.phase!=='run') return; const w=hookEventWorld(e,cv); HK.player.tx=w.x; HK.player.ty=w.y; });
  target.addEventListener('pointermove',e=>{ if(!cv)return; hookCursor=hookEventWorld(e,cv); });
  target.addEventListener('pointerdown',e=>{
    if(e.button===2){ e.preventDefault(); if(!HK||HK.phase!=='run') return; const w=hookEventWorld(e,cv); HK.player.tx=w.x; HK.player.ty=w.y; }
  });
}

function hookKeyLabel(code){
  return ({KeyQ:'Q',KeyW:'W',KeyE:'E',KeyR:'R',KeyD:'D',KeyF:'F',KeyA:'A',KeyS:'S',Space:'Space'}[code])||code.replace(/^Key/,'').replace(/^Digit/,'');
}
function syncHookBinds(){
  const q=$('#hookBindQ'), f=$('#hookBindF');
  if(q) q.textContent=hookKeyLabel(S.hook.keys.hook||'KeyQ');
  if(f) f.textContent=hookKeyLabel(S.hook.keys.flash||'KeyD');
}

function hookIsTyping(ev){
  const t=ev.target; if(!t) return false;
  const tag=(t.tagName||'').toLowerCase();
  return tag==='input'||tag==='textarea'||tag==='select'||t.isContentEditable;
}

document.addEventListener('keydown', ev=>{
  if(hookBind){
    ev.preventDefault();
    if(ev.code!=='Escape'){ S.hook.keys[hookBind]=ev.code; persistHook(); }
    hookBind=null; syncHookBinds(); return;
  }
  const on=document.querySelector('#nav button.on');
  if(!on||on.dataset.t!=='hook') return;
  if(hookIsTyping(ev)) return;
  if(ev.repeat && ev.code!==(S.hook.keys.hook||'KeyQ')) return;
  if(ev.code==='Escape' && HK&&HK.phase==='run'){ hookEndRun(true); ev.preventDefault(); return; }
  if(ev.code===(S.hook.keys.flash||'KeyD')){
    if(HK&&HK.phase==='run'){ hookDoFlash(HK, hookCursor.x, hookCursor.y); ev.preventDefault(); }
    return;
  }
  if(ev.code===(S.hook.keys.hook||'KeyQ')){
    ev.preventDefault();
    if(!HK||HK.phase!=='run') return;
    if(ev.repeat) return;
    const c=hookChampNow();
    if(c.chargeUp){
      if(HK.charge&&HK.charge.charging) return;
      HK.charge={wind:0,t:0,range:c.rangeMin||400,charging:true, started:HK.t};
    } else if(S.hook.quick){
      hookFire(HK, hookCursor.x, hookCursor.y, c.range, true);
    } else {
      hookFire(HK, hookCursor.x, hookCursor.y, c.range, false);
    }
  }
});
document.addEventListener('keyup', ev=>{
  const on=document.querySelector('#nav button.on');
  if(!on||on.dataset.t!=='hook') return;
  if(hookIsTyping(ev)) return;
  if(ev.code!==(S.hook.keys.hook||'KeyQ')) return;
  if(!HK||HK.phase!=='run'||!HK.charge) return;
  const c=hookChampNow();
  if(c.chargeUp && HK.charge.charging){
    const range=M.hookChargeRange(c, HK.charge.t);
    const aim=M.hookDir(HK.player.x,HK.player.y,hookCursor.x,hookCursor.y);
    hookRelease(HK, range, aim.x, aim.y);
  }
});

hookBindUi();
hookEnsure();

Object.assign(window.EZ, {
  startHook, abandonHook, pauseHook, resumeHook,
  hookState:()=>HK, hookChamp:()=>S.hook.champ,
  hookSetChamp:(id)=>{ if(M.HOOK_CHAMPS[id]){ S.hook.champ=id; persistHook(); paintChampPicker(); } },
  hookFreeze:(on)=>{ if(HK) HK.frozen=!!on; },
  hookPlace:(spec)=>{
    if(!HK) HK=hookWorld();
    if(spec.player){ HK.player.x=spec.player.x; HK.player.y=spec.player.y; HK.player.tx=spec.player.x; HK.player.ty=spec.player.y; }
    if(spec.clear){ HK.units=[]; HK.minions=[]; }
    if(spec.units){ for(const u of spec.units){ const ch=hookMakeChamp(u.champ||'Jinx',u.x,u.y,u.role); Object.assign(ch,u,{dead:false,hidden:false,stun:0}); HK.units.push(ch); } }
    if(spec.minions){ for(const m of spec.minions) HK.minions.push(Object.assign({id:'t'+Math.random().toString(36).slice(2),kind:'minion',team:'enemy',r:HK_MR,tx:m.x,ty:m.y,spd:0,dead:false},m)); }
    hookDraw(); return HK;
  },
  hookFireAt:(x,y,opts)=>{
    if(!HK) startHook('free');
    HK.phase='run';
    const skip=opts&&opts.skipCast;
    const range=opts&&opts.range;
    return hookFire(HK,x,y,range,!!skip);
  },
  hookFlashAt:(x,y)=>hookDoFlash(HK,x,y),
  hookStep:(ms)=>{ if(!HK) return; const dt=Math.min(0.2,(ms||16)/1000); if(HK.phase!=='run') HK.phase='run'; hookStep(HK,dt); hookDraw(); return HK; },
  hookEnd:()=>hookEndRun(false),
  hookPortraits:()=>({ver:ddVer, loaded:Object.keys(ddImgs)}),
  hookLoadPortraits:loadPortraits,
  hookSightline, hookMapSize:()=>({w:HK_W,h:HK_H}), hookMap
});
