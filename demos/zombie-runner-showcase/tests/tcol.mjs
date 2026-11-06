// Collision test: tall obstacle blocks, low obstacle is cleared by a jump, player lands on ground (and on a crate top).
import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:960,height:540}}); const errs=[]; p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8137/?nozombies&noobs&noadapt&lowfx'); await p.waitForFunction(()=>window.__game&&window.__game.state==='title',null,{timeout:60000});
let fails=0; const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n); if(!c)fails++;};
const run=(kind,lane,jumpAt)=>p.evaluate(([kind,lane,jumpAt])=>new Promise(res=>{const S=window.__game; window.__reset(); const o=window.__spawnObstacle(kind,lane,-25); let jumped=false,maxG=0,maxY=0,t0=performance.now();
  (function f(){ maxG=Math.max(maxG,S.ground); maxY=Math.max(maxY,S.y);
    if(jumpAt!=null&&!jumped&&o.position.z>=jumpAt){jumped=true; dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));}
    if(S.state!=='run'||o.position.z>4&&S.grounded||performance.now()-t0>40000) return res({state:S.state,hit:S.lastHit,maxG,maxY,y:S.y,grounded:S.grounded,z:o.position.z});
    requestAnimationFrame(f);})();}),[kind,lane,jumpAt]);
let r=await run('truck',1,null); ok(`tall truck in your lane blocks you -> ${r.state}, hit ${r.hit}`, r.state==='over'&&/^truck/.test(r.hit));
r=await run('truck',1,-4.4); ok(`jumping does not clear a tall truck -> ${r.state}, hit ${r.hit}`, r.state==='over'&&/^truck/.test(r.hit));
r=await run('barricade',1,null); ok(`running into a low barricade crashes -> ${r.state}, hit ${r.hit}`, r.state==='over'&&/^barricade/.test(r.hit));
r=await run('barricade',1,-4.4); ok(`jump clears low barricade -> ${r.state}, peak y ${r.maxY.toFixed(2)}`, r.state==='run');
ok(`lands back on the ground -> y ${r.y.toFixed(2)}, grounded ${r.grounded}`, r.state==='run'&&r.y===0&&r.grounded);
r=await run('truck',0,null); ok(`truck in another lane does not hit you -> ${r.state}`, r.state==='run');
r=await run('crate',1,-5.6); ok(`jump onto a crate: stood on its top (max ground ${r.maxG.toFixed(2)} m), then dropped to ground y ${r.y.toFixed(2)}`, r.state==='run'&&r.maxG>1.2&&r.y===0);
console.log('errors',JSON.stringify(errs)); await b.close(); process.exit(fails?1:0);
