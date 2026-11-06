import { chromium } from 'playwright-core';
const D='./out/';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
await p.goto('http://localhost:8137/?noadapt'); await p.waitForFunction(()=>window.__scene,null,{timeout:60000});
console.log('clips',JSON.stringify(await p.evaluate(()=>window.__clips)));
const pc=()=>p.evaluate(()=>window.__pclip());
await p.waitForTimeout(800); ok('title clip Idle ('+await pc()+')',await pc()==='Idle'); await p.screenshot({path:D+'1-title.png'});
const g=()=>p.evaluate(()=>{const {zombies,...r}=window.__game;return {...r,nz:zombies.length};});
await p.keyboard.press('Space'); await p.waitForTimeout(400); ok('running clip Run ('+await pc()+')',await pc()==='Run');
await p.keyboard.press('Space'); await p.waitForTimeout(220); const jy=(await g()).y; ok(`jump y=${jy.toFixed(2)} clip=${await pc()}`, jy>0.5 && await pc()==='Jump');
await p.screenshot({path:D+'4-jump-midair.png'});
await p.waitForFunction(()=>window.__game.grounded&&window.__pclip()==='Run',null,{timeout:6000}).catch(()=>{}); ok('back to Run after landing ('+await pc()+')',await pc()==='Run');
await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(400); const s1=await g(); ok(`lane left lane=${s1.lane} x=${s1.x.toFixed(2)}`, s1.lane===0);
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); ok('lane right', (await g()).lane===1);
const f0=(await g()).frames; await p.waitForTimeout(2000); console.log('fps (software)',((await g()).frames-f0)/2);
await p.screenshot({path:D+'2-early-run.png'});
let s; for(let i=0;i<40;i++){s=await g(); if(s.state==='over')break; await p.waitForTimeout(500);}
ok('idle player gets caught or crashes -> '+s.state+' by '+s.lastHit, s.state==='over'); await p.waitForTimeout(1600);
console.log('enemies at game over',JSON.stringify(await p.evaluate(()=>window.__kinds())));
await p.screenshot({path:D+'6-game-over.png'});
await p.keyboard.press('Space'); await p.evaluate(()=>{window.__game.dist=490;});
const rp=p.evaluate(async()=>{const S=window.__game; const t0=performance.now(); const seen=new Set(); let sawLunge=false;
 while(performance.now()-t0<20000&&S.state==='run'){ const L=[-3,0,3]; const danger=l=>S.zombies.some(z=>Math.abs(z.position.x-L[l])<1.5&&z.position.z>-10&&z.position.z<1.5)||S.obs.some(o=>Math.abs(o.position.x-L[l])<1.5&&o.position.z>-14&&o.position.z<4);
  window.__kinds().forEach(k=>{seen.add(k); if(/Attack|Lunge/.test(k))sawLunge=true;});
  if(danger(S.lane)){ const alt=[S.lane-1,S.lane+1].filter(l=>l>=0&&l<3&&!danger(l)); if(alt.length) S.lane=alt[0]; else if(S.grounded) dispatchEvent(new KeyboardEvent('keydown',{code:'Space'})); }
  await new Promise(r=>setTimeout(r,16)); } return {state:S.state,score:S.score,level:S.level,seen:[...seen],sawLunge};});
await p.waitForTimeout(3000); await p.waitForFunction(()=>{const z=window.__game.zombies.filter(z=>z.visible&&z.position.z>-30&&z.position.z<0); return new Set(z.map(q=>q.userData.kind)).size>=3||(new Set(z.map(q=>q.userData.kind)).size>=2&&z.length>=3);},null,{timeout:15000,polling:50}).catch(()=>console.log('mixed condition timeout')); await p.screenshot({path:D+'3-mid-level-mixed.png'});
console.log('kinds on screen at mid-level shot',JSON.stringify(await p.evaluate(()=>window.__kinds())));
const r=await rp; console.log('bot from L2:',JSON.stringify(r)); ok('reached level 3', r.level>=3);
// closeup of a lunge: freeze a fresh run, put a FastZombie right in front
await p.keyboard.press('Space'); await p.waitForTimeout(300);
await p.evaluate(()=>{const S=window.__game; S.level=3; window.__cam={p:[2.6,1.8,1.2],t:[0,1.1,-2.4]};});
await p.waitForFunction(()=>{const S=window.__game; return S.state!=='run'||S.zombies.some(z=>z.userData.lunged&&z.position.z>-3.6&&z.position.z<-2.2);},null,{timeout:30000}).catch(()=>{});
await p.waitForTimeout(60); console.log('closeup kinds',JSON.stringify(await p.evaluate(()=>window.__kinds())));
await p.screenshot({path:D+'5-enemy-lunge-closeup.png'});
// FPS panel + debug overlay shots, and adaptive quality proof
for (const [q,f] of [['?fps&noadapt','8-fps-overlay.png'],['?debug&fps&noadapt&nozombies','9-debug-colliders.png']]) { await p.goto('http://localhost:8137/'+q); await p.waitForFunction(()=>window.__game&&window.__game.state==='title',null,{timeout:60000}); await p.keyboard.press('Space');
  await p.waitForFunction(()=>window.__game.obs.some(o=>o.position.z>-22&&o.position.z<-6)||window.__game.state!=='run',null,{timeout:60000}).catch(()=>{}); await p.screenshot({path:D+f}); }
await p.goto('http://localhost:8137/?fps'); await p.waitForFunction(()=>window.__game&&window.__game.state==='title',null,{timeout:60000}); await p.keyboard.press('Space');
await p.waitForFunction(()=>window.__perf.level===0,null,{timeout:40000}).catch(()=>{}); const pf=await p.evaluate(()=>({level:window.__perf.level,log:window.__perf.log,avg:window.__perf.avg}));
ok('adaptive quality steps down under 30 FPS: '+JSON.stringify(pf.log), pf.level<2); await p.screenshot({path:D+'10-adaptive-low.png'});
console.log('errors',JSON.stringify(errs.slice(0,10))); await b.close();
