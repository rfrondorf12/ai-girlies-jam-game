import { chromium } from 'playwright-core';
const D='/workspace/agj-character-pack/screens/', U='http://localhost:8134/test.html';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errs=[]; const page=async(q,shot,w=1500)=>{const p=await b.newPage({viewport:{width:1280,height:540}});
 p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(q+': '+m.text())}); p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 await p.goto(U+q); await p.waitForFunction(()=>window.__ready,null,{timeout:60000});
 const t0=await p.evaluate(()=>window.__time()); await p.waitForTimeout(w); const t1=await p.evaluate(()=>window.__time());
 const info=await p.evaluate(()=>window.__info); await p.screenshot({path:D+shot}); await p.close(); return {info,t0,t1};};
const base=await page('','lineup.png'); console.log('clips',JSON.stringify(base.info));
for(const c of ['Idle','Walk','Run','Jump','Attack','Lunge']){const r=await page('?clip='+c,`clip-${c}.png`,900);
 console.log(c,Object.entries(r.info).map(([n,v])=>n+'='+v.playing).join(' '),'advancing:',r.t1.map((t,i)=>t!==r.t0[i]).every(Boolean));}
await page('?only=Survivor&clip=Run&close','closeup-survivor.png',700); await page('?only=Brute&clip=Attack&close','closeup-brute.png',800);
console.log('errors',JSON.stringify(errs)); await b.close();
