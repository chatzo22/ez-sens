// Unit checks for EZ Sens conversion math against published reference points. Run: node test/math.test.js
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
eval(html.match(/<script id="ezmath">([\s\S]*?)<\/script>/)[1]);
const M=globalThis.EZMath; let n=0;
const near=(a,b,t,msg)=>{n++;assert(Math.abs(a-b)<=t,`${msg}: got ${a}, expected ${b}±${t}`);};
const cm=(d,s,g,p)=>M.cm360(d,s,g,p), cv=(s,a,b,o)=>M.convert(s,a,b,o);
// CS2 / Source
near(cm(800,1,'cs2'),51.95,0.01,'CS2 1.0@800 = 52 cm (sensitivitymatch)');
near(cm(800,1,'apex'),51.95,0.01,'Apex = CS2 scale');
// Valorant
near(cv(0.4,'valorant','cs2'),1.273,0.001,'Val 0.4 -> CS2 1.273 (sensitivitymatch)');
near(cm(800,1,'valorant'),16.3,0.05,'Val 1@800 = 16.3 cm (sensitivitymatch table)');
// OW2 / CoD / D2
near(cv(5,'ow2','finals'),33,1e-9,'OW2 5 -> FINALS 33 (senslab)');
near(cv(5,'cod','finals'),33,1e-9,'CoD 5 -> FINALS 33 (senslab)');
near(cm(800,1,'d2'),173.2,0.05,'D2 1@800 = 173.2 cm (sensitivitymatch)');
// Fortnite
near(cv(8,'fortnite','valorant'),0.635,0.001,'Fortnite 8% -> Val 0.635 (senslab)');
near(cv(7.5,'fortnite','finals'),41.7,0.05,'Fortnite 7.5 -> FINALS 41.7 (senslab)');
// R6
near(cv(7,'r6','finals'),40.1,0.05,'R6 7 -> FINALS 40.1 (senslab)');
near(cm(800,1,'r6'),199.5,0.05,'R6 1@800 = 199.5 cm (sensitivitymatch)');
// THE FINALS
near(cv(1,'cs2','finals'),22,1e-9,'CS2 -> FINALS x22');
near(cm(1600,16,'finals'),35.7,0.05,'FINALS 16@1600 = 35.7 (senslab)');
near(cm(800,30,'finals'),38.1,0.01,'FINALS 30@800 = 38.1 (senslab)');
// ARC Raiders
near(cv(1,'cs2','arc'),16.1645,1e-3,'CS2 -> ARC x16.1645');
near(cv(25,'arc','cs2'),1.547,1e-3,'ARC 25 -> CS2 1.547 (sensswap)');
near(cm(800,50,'arc'),16.8,0.01,'ARC 50@800 = 16.8 (clip.dor.gg)');
near(cv(1,'cs2','arc',{pTo:{fov:80}}),16.1645*70/80,1e-3,'ARC FOV 80 x0.875 (sens-converter)');
// Marvel Rivals
near(cv(1.5,'marvel','finals'),26.25,0.06,'Marvel 1.5 -> FINALS ~26.3 (senslab)');
near(cm(800,1,'marvel'),65.3,0.05,'Marvel 1@800 = 65.3 (sensitivitymatch)');
// Rust
near(cm(800,0.25,'rust'),40.6,0.05,'Rust 0.25@800 FOV75 = 40.6 (sensconverters)');
near(cv(0.4,'valorant','rust'),0.249,0.002,'Val 0.4 -> Rust 0.25 (sensconverters)');
near(M.dpc('rust',1,{fov:90}),0.135,1e-9,'Rust FOV90 = 0.135 (rustfront)');
near(cv(0.3,'rust','cs2'),1.534,0.001,'Rust 0.3 -> CS2 1.534 (sensitivitymatch)');
// Tarkov
near(cm(800,0.3,'tarkov'),30.5,0.05,'Tarkov 0.3@800 = 30.5 (aimhub)');
near(cv(0.5,'tarkov','cs2'),2.841,0.001,'Tarkov 0.5 -> CS2 2.841 (sensitivitymatch)');
near(cv(2,'cs2','tarkov'),0.352,0.001,'CS2 2 -> Tarkov 0.352 (aimhub)');
// Battlefield 6 (non-linear)
near(cm(800,20,'bf6'),30.9,0.05,'BF6 20@800 = 30.9 (sensitivitymatch)');
near(cm(800,25,'bf6'),25.0,0.05,'BF6 25@800 = 25 (senslab)');
near(cm(800,15,'bf6'),40.3,0.05,'BF6 15@800 = 40.3 (sensitivitymatch)');
near(cv(20,'bf6','cs2'),1.684,0.001,'BF6 20 -> CS2 1.684 (sensitivitymatch)');
near(M.sensForCm(30,800,'bf6'),20.61,0.01,'30 cm -> BF6 20.61 (senslab)');
assert(Number.isNaN(M.sensForCm(600,800,'bf6')),'BF6 below slider minimum -> NaN'); n++;
// Deadlock / Halo (disputed, majority values)
near(cv(2,'cs2','deadlock'),1.0,1e-9,'CS2 2 -> Deadlock 1 (senslab/mouse-sensitivity.com)');
near(cm(800,0.8,'deadlock'),32.5,0.05,'Deadlock 0.8@800 = 32.5 (aimbetween)');
near(cm(800,1,'halo'),50.8,0.05,'Halo 1@800 = 50.8 (toolmarble)');
near(cv(2,'cs2','halo'),1.956,0.001,'CS2 2 -> Halo 1.956 (toolmarble)');
// generic
near(cv(1,'cs2','cs2',{dpiFrom:800,dpiTo:1600}),0.5,1e-9,'DPI change');
assert.strictEqual(M.edpi(800,1.25),1000); assert.strictEqual(M.menuRound('finals',21.6),22); assert.strictEqual(M.menuRound('cs2',1.2345),1.23); n+=3;
for(const g of M.GAMES){ const s=M.sensForCm(40,800,g.id); near(cm(800,s,g.id),40,1e-9,'roundtrip '+g.id); near(M.degPerCountFromCm(40,800),M.dpc(g.id,s),1e-12,'dpc '+g.id); }
// calibration
near(M.yawFromRuler({sens:1,dpi:800,dist:3*51.9545,unit:'cm',turns:3}),0.022,1e-6,'ruler calibration');
near(M.yawFromRuler({sens:2,dpi:400,dist:20.4545,unit:'in',turns:1}),0.022,1e-6,'ruler calibration inches');
near(M.yawFromCounts({sens:1,counts:-3*16363.636,turns:3}),0.022,1e-6,'count calibration');
M.setCustom([{id:'c1',name:'X',yaw:0.05}]); near(cv(1,'cs2','c1'),0.44,1e-9,'custom game conversion');
// floor / ceiling pitch clamp (targets stay fully above the floor)
const A=M.ARENA, rad=1.3, r=M.targetRadius(A.dist,rad);
near(r, A.dist*Math.tan(rad*Math.PI/180), 1e-12, 'target radius from angular size');
const lim=M.pitchLimits(A.dist,rad,A.floorY,A.ceilY);
near(M.yFromPitch(lim.min,A.dist), A.floorY+r, 1e-9, 'min pitch sits on the floor plus radius');
near(M.yFromPitch(lim.max,A.dist), A.ceilY-r, 1e-9, 'max pitch sits on the ceiling minus radius');
assert(M.yFromPitch(lim.min,A.dist)-r>=A.floorY-1e-9, 'clamped min is fully above the floor'); n++;
assert(M.clampPitch(-80,A.dist,rad,A.floorY,A.ceilY)===lim.min, 'clamp low pitch to floor'); n++;
assert(M.clampPitch(80,A.dist,rad,A.floorY,A.ceilY)===lim.max, 'clamp high pitch to ceiling'); n++;
const b=M.bouncePitch(lim.min-5,-40,A.dist,rad,A.floorY,A.ceilY);
assert(b.pitch===lim.min && b.vp>0, 'bounce off the floor flips velocity up'); n++;
const b2=M.bouncePitch(lim.max+5,40,A.dist,rad,A.floorY,A.ceilY);
assert(b2.pitch===lim.max && b2.vp<0, 'bounce off the ceiling flips velocity down'); n++;
// off-screen hint: center is hidden, right-of-screen points right, follows the sample
const mid=M.offscreenHint(0,0,false);
assert(mid.alpha===0 && mid.inside, 'on-screen center has no hint'); n++;
const right=M.offscreenHint(1.4,0,false);
assert(right.alpha===1 && right.x>0 && Math.abs(right.y)<0.05, 'off-screen right hint sits on the right edge'); n++;
const up=M.offscreenHint(0,1.5,false);
assert(up.alpha===1 && up.y>0 && Math.abs(up.x)<0.05, 'off-screen up hint sits on the top edge'); n++;
const behind=M.offscreenHint(-0.2,0.1,true);
assert(behind.alpha===1 && behind.x<0, 'behind-camera hint uses the view-space direction'); n++;
const fade=M.offscreenHint(0.9,0,false,{inset:0.78});
assert(fade.alpha>0 && fade.alpha<1, 'near the edge the hint fades in'); n++;
const a1=M.offscreenHint(1.2,0.3,false), a2=M.offscreenHint(0.4,0.9,false);
assert(a1.ang!==a2.ang, 'hint angle tracks the sample direction'); n++;
// per-game crosshair codes + classic CSGO share-code import
const xh=M.normXH({style:'t',color:'#Ff00Aa',size:10,thick:3,gap:-2,outline:true,outlineW:2,dot:true,opacity:0.5,dynamic:true});
assert.strictEqual(xh.color,'#ff00aa'); n++;
const code=M.xhCode(xh), back=M.parseEZX(code);
assert.deepStrictEqual(back,xh); n++;
assert.strictEqual(M.parseXHCode(code).src,'ez'); n++;
const cs=M.decodeCsgoXH('CSGO-Cn37R-YE7vo-pLCAL-aURmZ-z6zkG');
assert(cs.ok&&cs.fields.style===2&&cs.fields.gap===-1.3&&cs.fields.length===4.6&&cs.fields.thick===1.2, 'CSGO example fields'); n++;
assert(cs.fields.r===175&&cs.fields.g===81&&cs.fields.b===213&&cs.fields.alpha===137&&cs.fields.dot&&cs.fields.t&&cs.fields.outline, 'CSGO example color/flags'); n++;
assert(cs.xh.style==='t'&&cs.xh.color==='#af51d5'&&cs.xh.dot&&cs.xh.dynamic, 'CSGO maps to a T-dot profile'); n++;
assert(M.decodeCsgoXH('CSGO-AAAAA-AAAAA-AAAAA-AAAAA-AAAAA').error, 'junk CSGO code rejected'); n++;
assert.strictEqual(M.parseXHCode('CSvbPubOq37zTGqtsPTP5QTrp5CB4xFXiKRLfzJsm49ZRe').error,'cs2-new'); n++;

// rifle damage models (Vandal / AK-47, close range)
const vand=M.dmgModel('val'), vArm=M.dmgModel('valarm'), ak=M.dmgModel('cs2'), akArm=M.dmgModel('cs2arm'), hs=M.dmgModel('hs');
assert.strictEqual(M.zoneDamage(vand,'head'),160); n++;
assert.strictEqual(M.zoneDamage(vand,'body'),40); n++;
assert.strictEqual(M.zoneDamage(vand,'legs'),34); n++;
assert.strictEqual(M.shotsToKill(vand,'head'),1); n++;
assert.strictEqual(M.shotsToKill(vand,'body'),3); n++;
assert.strictEqual(M.shotsToKill(vand,'legs'),3); n++;
assert.strictEqual(M.shotsToKill(vArm,'head'),1); n++;
assert.strictEqual(M.shotsToKill(vArm,'body'),4); n++;
assert.strictEqual(M.shotsToKill(vArm,'legs'),5); n++;
assert.strictEqual(vArm.armor,50); n++;
assert.strictEqual(M.zoneDamage(ak,'head'),144); n++;
assert.strictEqual(M.zoneDamage(ak,'body'),36); n++;
assert.strictEqual(M.zoneDamage(ak,'legs'),27); n++;
assert.strictEqual(M.shotsToKill(ak,'head'),1); n++;
assert.strictEqual(M.shotsToKill(ak,'body'),3); n++;
assert.strictEqual(M.shotsToKill(ak,'legs'),4); n++;
assert.strictEqual(M.shotsToKill(akArm,'head'),1); n++;
assert.strictEqual(M.shotsToKill(akArm,'body'),4); n++;
assert.strictEqual(M.shotsToKill(akArm,'legs'),4); n++;
const hsBody=M.applyHit(hs,M.newBotState(hs),'body');
assert(hsBody.miss&&!hsBody.killed, 'headshots-only body is a miss'); n++;
const hsHead=M.applyHit(hs,M.newBotState(hs),'head');
assert(hsHead.killed&&hsHead.hp===0, 'headshots-only head kills'); n++;
const helmet=M.applyHit(akArm,M.newBotState(akArm),'head');
assert(helmet.killed&&helmet.hpDmg>=111&&helmet.hpDmg<144, 'AK helmet head still one-taps'); n++;
console.log(`all ${n} math checks passed (${M.GAMES.length} built-in games)`);

