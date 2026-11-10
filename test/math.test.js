// Unit checks for EZ Sens conversion math. Run: node test/math.test.js
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
eval(html.match(/<script id="ezmath">([\s\S]*?)<\/script>/)[1]);
const M=globalThis.EZMath; const near=(a,b,t=1e-3,msg)=>assert(Math.abs(a-b)<=t,`${msg}: ${a} vs ${b}`);
near(M.cm360(800,1,'cs2'),51.9545,1e-3,'CS2 800/1.0 cm360');
near(M.in360(800,1,'cs2'),20.4545,1e-3,'CS2 in360');
near(M.convert(1,'cs2','finals'),22,1e-9,'CS2->FINALS x22');
near(M.convert(1,'cs2','arc'),16.16447,1e-4,'CS2->ARC x16.1645');
near(M.convert(25,'arc','cs2'),1.5466,1e-3,'ARC 25 -> CS2 (sensswap)');
near(M.cm360(800,25,'arc'),33.59,0.02,'ARC 25@800 = 33.6cm (sensswap)');
near(M.cm360(800,50,'arc'),16.8,0.01,'ARC 50@800 = 16.8 (wiki/clip.dor.gg)');
near(M.cm360(1600,16,'finals'),35.7,0.05,'FINALS 16@1600 = 35.7 (senslab Brutal Logic)');
near(M.cm360(800,30,'finals'),38.1,0.01,'FINALS 30@800 = 38.1 (senslab)');
near(M.convert(20,'arc','cs2',{fovFrom:80}),M.convert(20,'arc','cs2')*80/70,1e-9,'ARC FOV scaling out');
near(M.convert(1,'cs2','arc',{fovTo:80}),16.16447*70/80,1e-4,'ARC FOV scaling in');
near(M.convert(1,'cs2','cs2',{dpiFrom:800,dpiTo:1600}),0.5,1e-9,'DPI change');
assert.strictEqual(M.edpi(800,1.25),1000);
assert.strictEqual(M.menuRound('finals',21.6),22); assert.strictEqual(M.menuRound('cs2',1.2345),1.23);
for(const g of ['cs2','finals','arc']){ const cm=M.cm360(800,M.sensForCm(40,800,g),g); near(cm,40,1e-9,'roundtrip '+g);
  near(M.degPerCountFromCm(40,800),M.degPerCount(g,M.sensForCm(40,800,g)),1e-12,'dpc '+g); }
console.log('all math checks passed');
