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
  // Per-game crosshair profiles + short codes + classic CSGO- share-code import
  const XH_STYLES=['cross','dot','crossdot','circle','t'];
  const XH_DEF={style:'cross',color:'#36f1a6',size:8,thick:2,gap:2,outline:true,outlineW:1,dot:false,opacity:1,dynamic:false};
  const clampN=(v,lo,hi,d)=>Number.isFinite(+v)?Math.max(lo,Math.min(hi,+v)):d;
  function hexColor(c){ c=String(c||'').trim(); if(/^#?[0-9a-fA-F]{6}$/.test(c)) return '#'+c.replace('#','').toLowerCase(); return XH_DEF.color; }
  function normXH(o){ o=o||{};
    const style=XH_STYLES.includes(o.style)?o.style:'cross';
    return {style,color:hexColor(o.color),size:Math.round(clampN(o.size,1,48,8)),thick:Math.round(clampN(o.thick,1,12,2)),
      gap:Math.round(clampN(o.gap,-12,24,2)),outline:!!o.outline,outlineW:Math.round(clampN(o.outlineW,1,4,1)),
      dot:!!o.dot||style==='dot'||style==='crossdot',opacity:Math.round(clampN(o.opacity,0.1,1,1)*100)/100,dynamic:!!o.dynamic};
  }
  function xhCode(o){ const n=normXH(o), st={cross:'C',dot:'D',crossdot:'X',circle:'O',t:'T'}[n.style]||'C';
    const f=(n.outline?1:0)|(n.dot?2:0)|(n.dynamic?4:0);
    return 'EZX1-'+st+n.color.slice(1)+'-s'+n.size+'t'+n.thick+'g'+n.gap+'w'+n.outlineW+'a'+Math.round(n.opacity*100)+'f'+f; }
  function parseEZX(s){ const m=String(s).trim().match(/^EZX1-([CDXOT])([0-9a-fA-F]{6})-s(-?\d+)t(-?\d+)g(-?\d+)w(-?\d+)a(-?\d+)f(-?\d+)$/i);
    if(!m)return null; const st={C:'cross',D:'dot',X:'crossdot',O:'circle',T:'t'}[m[1].toUpperCase()]||'cross'; const f=+m[8];
    return normXH({style:st,color:'#'+m[2],size:+m[3],thick:+m[4],gap:+m[5],outlineW:+m[6],opacity:(+m[7])/100,outline:!!(f&1),dot:!!(f&2)||st==='dot'||st==='crossdot',dynamic:!!(f&4)}); }
  // Classic CSGO-/CS2 legacy share codes (public format: 25 base-57 chars → 18 bytes). New dashed-free CS… container is skipped.
  const CS_ALPH='ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
  function csgoBytes(code){ let s=String(code).trim().replace(/^CSGO-/i,'').replace(/-/g,''); if(s.length!==25)return null;
    for(const ch of s) if(CS_ALPH.indexOf(ch)<0)return null;
    s=s.split('').reverse().join(''); let n=0n; for(const ch of s) n=n*57n+BigInt(CS_ALPH.indexOf(ch));
    const b=new Array(18).fill(0); for(let i=17;i>=0;i--){ b[i]=Number(n&255n); n>>=8n; } return b; }
  function i8(v){ return v>127?v-256:v; }
  function rgbHex(r,g,b){ const h=n=>('0'+(Math.max(0,Math.min(255,n|0)).toString(16))).slice(-2); return '#'+h(r)+h(g)+h(b); }
  function xhFromCsgoFields(f){ if(!f)return null;
    let style='cross';
    if(f.t) style='t';
    else if(f.kind==='circle') style=f.dot?'circle':'circle';
    else if(f.kind==='dot'|| (f.length<=0.15 && f.dot)) style='dot';
    else if(f.dot) style='crossdot';
    const dyn=!!f.dynamic;
    return normXH({style,color:rgbHex(f.r,f.g,f.b),size:Math.max(1,Math.round(f.length*2)),thick:Math.max(1,Math.round(f.thick*2)),
      gap:Math.round(f.gap*2),outline:!!f.outline,outlineW:Math.max(1,Math.round(f.outlineW||1)),dot:!!f.dot,opacity:f.useAlpha?Math.round((f.alpha/255)*100)/100:1,dynamic:dyn}); }
  function decodeCsgoXH(code){ const raw=String(code||'').trim();
    if(/^CS(?!GO)/i.test(raw) && !raw.includes('-')) return {error:'cs2-new'};
    const b=csgoBytes(raw); if(!b)return {error:'bad'};
    let sum=0; for(let i=1;i<18;i++) sum+=b[i]; if((sum&255)!==b[0]) return {error:'checksum'};
    const ver=b[1];
    if(ver===1){ const style=(b[13]&0xf)>>1, flags=b[13]>>4;
      const f={format:'legacy-v1',gap:i8(b[2])/10,outlineW:b[3]/2,r:b[4],g:b[5],b:b[6],alpha:b[7],
        outline:!!(b[10]&8),thick:b[12]/10,dot:!!(flags&1),useAlpha:!!(flags&4),t:!!(flags&8),style,length:b[14]/10,
        dynamic:style<=3,kind:style===5?'legacy':'cross'};
      return {ok:true,fields:f,xh:xhFromCsgoFields(f)}; }
    if(ver===3||ver===4){ const st=b[2]&0xf;
      const kind=st===1||st===3?'circle':st===6?'dot':'cross';
      const sh=b[14]|(b[15]<<8), scale=sh>0?1080/sh:1;
      const bits=b[10]|(b[11]<<8)|(b[12]<<16)|(b[13]<<24);
      const f={format:'legacy-v'+ver,style:st,dynamic:st===0||st===1||st===2||st===7,dot:!!(b[2]&0x40),t:!!(b[2]&0x80),
        r:b[3],g:b[4],b:b[5],alpha:b[6],useAlpha:true,gap:b[7]*scale/2,length:b[8]*scale,thick:(bits>>23)&0x1f,
        outline:ver===3?!!(b[2]&0x20):(((b[13]>>4)&3)!==0),outlineW:1,kind};
      // v3/v4 gap/length are already pixels; don't double-scale in xhFromCsgoFields
      const xh=normXH({style:f.t?'t':f.kind==='circle'?'circle':f.kind==='dot'||(f.length<2&&f.dot)?'dot':f.dot?'crossdot':'cross',
        color:rgbHex(f.r,f.g,f.b),size:Math.max(1,Math.round(f.length)),thick:Math.max(1,f.thick),
        gap:Math.round(ver>=3?b[7]*(sh>0?1080/sh:1):f.gap),outline:f.outline,outlineW:1,dot:!!f.dot,opacity:f.alpha/255,dynamic:f.dynamic});
      return {ok:true,fields:f,xh}; }
    return {error:'version'}; }
  function parseXHCode(s){ s=String(s||'').trim(); if(!s)return {error:'empty'};
    const ez=parseEZX(s); if(ez)return {ok:true,xh:ez,src:'ez'};
    if(/^CSGO-/i.test(s)||/^CS(?!GO)/i.test(s)) return Object.assign({src:'csgo'}, decodeCsgoXH(s));
    return {error:'bad'}; }


  // Close-range rifle damage. Vandal: wiki.playvalorant.com/en-us/Vandal (160/40/34, no falloff).
  // Heavy shields add 50 HP absorbed 1-for-1 (official TTK columns 100/125/150; valdb.gg).
  // AK-47: 36 base, x4 head, x1 chest, x0.75 legs, 77.5% armor pen (armor ratio 1.55).
  // Helmeted head 111, kevlar chest 27, legs never armored. Point-blank; trainer has no distance falloff.
  const DMG_IDS=['hs','val','valarm','cs2','cs2arm'];
  function dmgModel(id){
    if(id==='val') return {id:'val',name:'Valorant, no armor',hp:100,armor:0,game:'val',weapon:'Vandal',headOnly:false,helmet:false,kevlar:false};
    if(id==='valarm') return {id:'valarm',name:'Valorant, armor',hp:100,armor:50,game:'val',weapon:'Vandal',headOnly:false,helmet:false,kevlar:false};
    if(id==='cs2') return {id:'cs2',name:'CS2, no armor',hp:100,armor:0,game:'cs2',weapon:'AK-47',headOnly:false,helmet:false,kevlar:false};
    if(id==='cs2arm') return {id:'cs2arm',name:'CS2, armor',hp:100,armor:100,game:'cs2',weapon:'AK-47',headOnly:false,helmet:true,kevlar:true};
    return {id:'hs',name:'Headshots only',hp:100,armor:0,game:null,weapon:null,headOnly:true,helmet:false,kevlar:false};
  }
  function zoneDamage(model,zone){
    if(!model||model.headOnly) return zone==='head'?100:0;
    if(model.game==='val') return zone==='head'?160:zone==='legs'?34:40;
    if(model.game==='cs2') return zone==='head'?144:zone==='legs'?27:36;
    return 0;
  }
  function newBotState(model){ model=model&&model.hp!=null?model:dmgModel(model); return {hp:model.hp,armor:model.armor}; }
  function applyHit(model,state,zone){
    model=model&&model.hp!=null?model:dmgModel(model);
    if(!state) state=newBotState(model);
    if(model.headOnly && zone!=='head'){
      return {miss:true,zone,raw:0,hpDmg:0,armorDmg:0,hp:state.hp,armor:state.armor,killed:false};
    }
    if(model.headOnly){
      state.hp=0; state.armor=0;
      return {miss:false,zone:'head',raw:100,hpDmg:100,armorDmg:0,hp:0,armor:0,killed:true};
    }
    const raw=zoneDamage(model,zone);
    let hpDmg=raw, armorDmg=0;
    if(model.game==='val'){
      armorDmg=Math.min(state.armor,raw);
      hpDmg=raw-armorDmg;
    }else if(model.game==='cs2'){
      const armored=state.armor>0&&((zone==='head'&&model.helmet)||(zone!=='head'&&zone!=='legs'&&model.kevlar));
      if(armored){
        const pen=0.775, thru=raw*pen, soak=raw-thru;
        if(soak<=state.armor){ hpDmg=thru; armorDmg=soak; }
        else { const frac=state.armor/soak; hpDmg=thru*frac+raw*(1-frac); armorDmg=state.armor; }
        hpDmg=Math.floor(hpDmg+1e-9);
      }
    }
    state.armor=Math.max(0,state.armor-armorDmg);
    state.hp=Math.max(0,state.hp-hpDmg);
    return {miss:false,zone,raw,hpDmg,armorDmg,hp:state.hp,armor:state.armor,killed:state.hp<=0};
  }
  function shotsToKill(model,zone){
    model=model&&model.hp!=null?model:dmgModel(model);
    if(model.headOnly&&zone!=='head') return Infinity;
    const s=newBotState(model);
    let n=0; while(s.hp>0&&n<30){ applyHit(model,s,zone); n++; } return n;
  }

  root.EZMath = {K,SOURCES:S,GAMES:B,get,all,setCustom,defaults,dpc,cm360,in360,sensForCm,convert,edpi,menuRound,degPerCountFromCm,countsPer360,yawFromRuler,yawFromCounts,
    ARENA,targetRadius,yFromPitch,pitchFromY,pitchLimits,clampPitch,bouncePitch,offscreenHint,
    XH_DEF,XH_STYLES,normXH,xhCode,parseEZX,parseXHCode,decodeCsgoXH,csgoBytes,
    DMG_IDS,dmgModel,zoneDamage,newBotState,applyHit,shotsToKill};
})(typeof window!=='undefined'?window:globalThis);
