import {chromium} from 'playwright-core';
const q=process.argv[2]||'', out=process.argv[3]||'/tmp/q.png', wait=+(process.argv[4]||4000);
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1280,height:720}});
const e=[];p.on('console',m=>(m.type()==='error'||m.type()==='warning')&&e.push(m.text()));p.on('pageerror',x=>e.push('PAGEERR '+x.message));
await p.goto('http://localhost:8137/'+q);await p.waitForFunction(()=>window.__game&&window.__game.state==='title',null,{timeout:60000}).catch(()=>{});await p.keyboard.press('Space');await p.waitForTimeout(wait);
await p.screenshot({path:out});console.log(JSON.stringify(await p.evaluate(()=>({st:window.__game?.state,hit:window.__game?.lastHit,obs:window.__game?.obs.length,perf:window.__perf&&{l:window.__perf.level,log:window.__perf.log}}))),'errors',JSON.stringify(e.slice(0,5)));await b.close();
