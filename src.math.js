(function(root){
  const K = 360*2.54; // 914.4
  const S = { // source links
    smm:['sensitivitymatch.com methodology','https://sensitivitymatch.com/methodology/'],
    aimpro:['aimprofps.com yaw table','https://aimprofps.com/en/sensitivity-converter/'],
    lk:['lkforge.com yaw table','https://lkforge.com/tools/calculators/sens-converter/'],
    slf:['senslab.pro THE FINALS guide','https://senslab.pro/guides/the-finals-sensitivity'],
    sld:['senslab.pro Deadlock guide','https://senslab.pro/guides/deadlock-sensitivity'],
    aimb:['aimbetween.games CS2↔Deadlock','https://aimbetween.games/sensitivity/cs2-to-deadlock'],
    scd:['sens-converter.com Deadlock','https://sens-converter.com/deadlock-sens-converter/'],
    csd:['convertsens.com Deadlock','https://convertsens.com/deadlock-to-cs2'],
    scs:['sensconverters.com CS2→FINALS','https://sensconverters.com/cs2-to-the-finals-sens-converter/'],
    fmm:['findmymouse.com','https://findmymouse.com/convert/the-finals/cs-2'],
    sma:['sensitivitymatch.com ARC Raiders','https://sensitivitymatch.com/mouse-sensitivity-converter/arc-raiders/'],
    ssw:['sensswap.com ARC→CS2','https://sensswap.com/arc-raiders-to-cs2-sensitivity/'],
    sca:['sens-converter.com ARC Raiders','https://sens-converter.com/arc-raiders-sens-converter/'],
    dor:['clip.dor.gg ARC range','https://clip.dor.gg/en/blog/arc-raiders-sensitivity-range'],
    smr:['sensitivitymatch.com Rust','https://sensitivitymatch.com/mouse-sensitivity-converter/rust/'],
    rf:['rustfront.com (client code trace)','https://rustfront.com/tools/sensitivity'],
    scr:['sensconverters.com Rust','https://sensconverters.com/rust-sens-converter/'],
    slr:['senslab.pro Rust','https://senslab.pro/sensitivity/rust'],
    smt:['sensitivitymatch.com Tarkov','https://sensitivitymatch.com/mouse-sensitivity-converter/escape-from-tarkov/'],
    aht:['aimhub.gg Tarkov','https://aimhub.gg/en/sensitivity-calculator/escape-from-tarkov/'],
    sct:['sensconverters.com Tarkov','https://sensconverters.com/tarkov-sens-converter/'],
    fmt:['findmymouse.com Tarkov','https://findmymouse.com/convert/escape-from-tarkov'],
    smb:['sensitivitymatch.com Battlefield 6','https://sensitivitymatch.com/mouse-sensitivity-converter/battlefield-6/'],
    slb:['senslab.pro Battlefield 6 (KovaaK\'s / aiming.pro formula)','https://senslab.pro/sensitivity/battlefield6'],
    smh:['sensitivitymatch.com Halo→CS2 (0.02222)','https://sensitivitymatch.com/mouse-sensitivity-converter/halo-infinite-to-cs2/'],
    dcp:['dcprosens.com Halo (0.0225, KovaaK\'s matcher)','https://dcprosens.com/sens-finder/halo/'],
    tm:['toolmarble.com Halo (0.0225)','https://toolmarble.com/gaming/sensitivity-converter/halo-infinite'],
    scrust:['sens-converter.com Rust factors','https://sens-converter.com/rust-sens-converter/'],
    slfv:['senslab.pro Fortnite→Valorant','https://senslab.pro/sensitivity/fortnite-to-valorant'],
  };
  const lin = y => ({dpc:(s)=>s*y, inv:(d)=>d/y, model:String(y)});
  const B = [
    Object.assign({id:'cs2',name:'Counter-Strike 2',aka:'cs cs2 csgo counter strike',status:'verified',round:2,hfov:106.26,
      note:'Source m_yaw 0.022, same as CS:GO. Menu shows 2 decimals; console takes more.',src:['smm','aimpro','lk','scs']},lin(0.022)),
    Object.assign({id:'valorant',name:'Valorant',aka:'val valo',status:'consensus',
      note:'0.07 everywhere (one site rounds to 0.06996, −0.06%).',src:['smm','aimpro','lk']},lin(0.07)),
    Object.assign({id:'apex',name:'Apex Legends',aka:'apex',status:'verified',
      note:'Source-based engine, 0.022 — same number as CS2.',src:['smm','aimpro','lk']},lin(0.022)),
    Object.assign({id:'ow2',name:'Overwatch 2',aka:'ow overwatch',status:'consensus',note:'0.0066.',src:['smm','aimpro','lk','slf']},lin(0.0066)),
    Object.assign({id:'cod',name:'Call of Duty (MW2/MW3/BO6/BO7/Warzone)',aka:'cod warzone mw3 bo6 bo7 black ops modern warfare',status:'consensus',
      note:'0.0066 hip-fire for the IW-engine titles; ADS multipliers separate.',src:['smm','aimpro','lk']},lin(0.0066)),
    Object.assign({id:'fortnite',name:'Fortnite',aka:'fn fortnite',status:'consensus',unit:'%',
      note:'Enter the X-axis sensitivity %. 0.005555 per 1%.',src:['smm','aimpro','lk','slfv']},lin(0.005555)),
    Object.assign({id:'r6',name:'Rainbow Six Siege',aka:'r6 siege rainbow',status:'consensus',
      note:'Assumes the default MouseSensitivityMultiplierUnit 0.02 in the config file.',src:['smm','aimpro','lk']},lin(0.00572957795)),
    Object.assign({id:'d2',name:'Destiny 2',aka:'destiny d2',status:'consensus',note:'0.0066.',src:['smm','aimpro','lk','scrust']},lin(0.0066)),
    Object.assign({id:'finals',name:'THE FINALS',aka:'finals the finals embark',status:'community',round:0,
      note:'0.001 per point (not 1:1 with OW2). Whole numbers only. Matches pros\' published cm/360 within ~3%.',src:['slf','smm','scs','fmm']},lin(0.001)),
    {id:'arc',name:'ARC Raiders',aka:'arc raiders embark',status:'community',round:0,params:[{k:'fov',label:'ARC FOV (60–80)',def:70,min:60,max:80,step:1}],
      dpc:(s,p)=>s*0.00136101*((p&&p.fov)||70)/70, inv:(d,p)=>d/(0.00136101*((p&&p.fov)||70)/70), model:'0.00136101 × FOV/70',
      hfovFn:p=>2*Math.atan(Math.tan(((p&&p.fov)||70)*Math.PI/360)*16/9)*180/Math.PI,
      note:'Default FOV 70 (vertical). FOV scaling is reported by sensitivitymatch/sens-converter but called single-source by clip.dor.gg — trust FOV 70 most. Turn Mouse Smoothing off. Decimal support unconfirmed, so rounded to whole numbers.',src:['sma','ssw','sca','fmm','dor']},
    Object.assign({id:'marvel',name:'Marvel Rivals',aka:'marvel rivals mr',status:'community',
      note:'0.0175 (one table lists 0.017453, −0.3%; one older table lists 0.022, which the others contradict).',src:['smm','slf','aimpro']},lin(0.0175)),
    {id:'rust',name:'Rust',aka:'rust',status:'community',params:[{k:'fov',label:'Rust FOV (70–90)',def:75,min:70,max:90,step:1}],
      dpc:(s,p)=>s*0.0015*((p&&p.fov)||75), inv:(d,p)=>d/(0.0015*((p&&p.fov)||75)), model:'0.0015 × FOV (0.1125 @ FOV 75)',
      note:'Turn speed scales with graphics.fov (default 75). Set exact values with input.sensitivity in the F1 console.',src:['smr','rf','scr','slr']},
    Object.assign({id:'tarkov',name:'Escape from Tarkov',aka:'eft tarkov escape',status:'community',round:2,
      note:'0.125. Armor turn-speed penalties make you turn slower.',src:['smt','aht','sct','fmt']},lin(0.125)),
    {id:'bf6',name:'Battlefield 6',aka:'bf6 battlefield',status:'community',
      dpc:(s)=>0.00173623*s+0.00231498, inv:(d)=>(d-0.00231498)/0.00173623, model:'0.00173623 × sens + 0.00231498',
      note:'Non-linear slider (0–200, default 20): a fixed base turn is added, so there is no single multiplier. Raw Mouse Input on, Uniform Soldier Aiming on.',src:['smb','slb','aimpro']},
    Object.assign({id:'deadlock',name:'Deadlock',aka:'deadlock valve',status:'disputed',
      note:'Using 0.044 (2× CS2), measured by mouse-sensitivity.com and used by most converters. Some tables still list 0.022 (1:1 with CS2). Check with a 360° turn.',src:['sld','aimb','scd','csd','smm','aimpro']},lin(0.044)),
    Object.assign({id:'halo',name:'Halo Infinite',aka:'halo infinite',status:'disputed',
      note:'Using 0.0225 (KovaaK\'s matcher, several tables); others list 0.02222 (1.3% slower). Horizontal axis scale assumed 1.',src:['dcp','tm','lk','scrust','smh']},lin(0.0225)),
  ];
  let custom = [];
  const byId = id => B.find(g=>g.id===id) || custom.find(g=>g.id===id);
  function get(id){ const g=byId(id); if(!g) throw new Error('unknown game '+id); return g; }
  function setCustom(list){ custom = (list||[]).filter(c=>c&&c.id&&c.yaw>0).map(c=>Object.assign({id:c.id,name:c.name||'Custom',status:'custom',custom:true,yaw:c.yaw,
    note:'Your own profile'+(c.how?' ('+c.how+')':'')+'.',src:[]},lin(c.yaw))); return custom; }
  function all(){ return B.concat(custom); }
  function defaults(id){ const g=get(id),o={}; (g.params||[]).forEach(p=>o[p.k]=p.def); return o; }
  function dpc(id,sens,p){ return get(id).dpc(sens,p||defaults(id)); }
  function cm360(dpi,sens,id,p){ return K/(dpi*dpc(id,sens,p)); }
  function in360(dpi,sens,id,p){ return cm360(dpi,sens,id,p)/2.54; }
  function sensForCm(cm,dpi,id,p){ const s=get(id).inv(K/(cm*dpi),p||defaults(id)); return s>0?s:NaN; }
  function convert(sens,from,to,o){ o=o||{}; const d1=o.dpiFrom||800, d2=o.dpiTo||d1;
    return sensForCm(cm360(d1,sens,from,o.pFrom),d2,to,o.pTo); }
  function edpi(dpi,sens){ return dpi*sens; }
  function menuRound(id,s){ const g=get(id); if(g.round==null||!isFinite(s)) return s; const p=Math.pow(10,g.round); return Math.max(1/p,Math.round(s*p)/p); }
  function degPerCountFromCm(cm,dpi){ return K/(cm*dpi); }
  function countsPer360(cm,dpi){ return cm/2.54*dpi; }
  // calibration: yaw at sens 1 (linear assumption)
  function yawFromRuler(o){ const cm=o.unit==='in'?o.dist*2.54:o.dist; return K*o.turns/(o.dpi*o.sens*cm); }
  function yawFromCounts(o){ return 360*o.turns/(Math.abs(o.counts)*o.sens); }
  // Arena target placement: camera at the origin, target lives at `dist` along (yaw, pitch).
  // Angles are degrees. Sphere radius comes from its angular size (radDeg).
  const D2R=Math.PI/180, R2D=180/Math.PI;
  const ARENA={dist:20,floorY:-1.7,ceilY:12};
  function targetRadius(dist,radDeg){ return dist*Math.tan(radDeg*D2R); }
  function yFromPitch(pitch,dist){ return dist*Math.sin(pitch*D2R); }
  function pitchFromY(y,dist){ return Math.asin(Math.max(-1,Math.min(1,y/dist)))*R2D; }
  function pitchLimits(dist,radDeg,floorY,ceilY){
    const r=targetRadius(dist,radDeg), minY=floorY+r, maxY=ceilY-r;
    return {min:pitchFromY(minY,dist),max:pitchFromY(maxY,dist),r,minY,maxY};
  }
  function clampPitch(pitch,dist,radDeg,floorY,ceilY){
    const lim=pitchLimits(dist,radDeg,floorY,ceilY);
    return Math.max(lim.min,Math.min(lim.max,pitch));
  }
  // Clamp pitch and bounce vertical speed off the floor / ceiling.
  function bouncePitch(pitch,vp,dist,radDeg,floorY,ceilY){
    const lim=pitchLimits(dist,radDeg,floorY,ceilY); let p=pitch,v=vp;
    if(p<=lim.min){ p=lim.min; if(v<0)v=Math.abs(v); }
    if(p>=lim.max){ p=lim.max; if(v>0)v=-Math.abs(v); }
    return {pitch:p,vp:v,lim};
  }
  // Map a projected point (NDC, y-up) to a screen-edge hint. behind = target is behind the camera.
  // Returns edge position in NDC, angle (radians, y-up), and alpha (0 on-screen → 1 fully off-screen).
  function offscreenHint(ndcX,ndcY,behind,opts){
    const inset=(opts&&opts.inset!=null)?opts.inset:0.78, pad=(opts&&opts.pad!=null)?opts.pad:0.04;
    let x=+ndcX||0, y=+ndcY||0;
    if(behind){ const len=Math.hypot(x,y); if(len<1e-8){x=1;y=0;} else {x=x/len*2;y=y/len*2;} }
    const ax=Math.abs(x), ay=Math.abs(y);
    const inside=!behind&&ax<=1&&ay<=1;
    let alpha;
    if(behind) alpha=1;
    else {
      const t=Math.max(0,ax-inset,ay-inset)/Math.max(1e-6,1-inset);
      alpha=Math.max(0,Math.min(1,t));
    }
    const len=Math.hypot(x,y)||1, sx=x/len, sy=y/len;
    const lx=1-pad, ly=1-pad;
    const tx=Math.abs(sx)<1e-8?Infinity:lx/Math.abs(sx);
    const ty=Math.abs(sy)<1e-8?Infinity:ly/Math.abs(sy);
    const t=Math.min(tx,ty);
    return {x:sx*t,y:sy*t,ang:Math.atan2(sy,sx),alpha,inside};
  }
  root.EZMath = {K,SOURCES:S,GAMES:B,get,all,setCustom,defaults,dpc,cm360,in360,sensForCm,convert,edpi,menuRound,degPerCountFromCm,countsPer360,yawFromRuler,yawFromCounts,
    ARENA,targetRadius,yFromPitch,pitchFromY,pitchLimits,clampPitch,bouncePitch,offscreenHint};
})(typeof window!=='undefined'?window:globalThis);
