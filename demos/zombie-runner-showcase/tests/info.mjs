import {chromium} from 'playwright-core';
const port=process.argv[2]||8137, q=process.argv[3]||'';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto(`http://localhost:${port}/${q}`);await p.waitForFunction(()=>window.__game&&window.__game.state==='title',null,{timeout:60000});await p.keyboard.press('Space');await p.waitForTimeout(4000);
const r=await p.evaluate(()=>new Promise(res=>{let n=0,t=performance.now(),dc=0,tr=0;(function l(){n++;const i=window.__renderer.info.render;dc+=i.calls;tr+=i.triangles;performance.now()-t<4000?requestAnimationFrame(l):res({fps:n/4,calls:Math.round(dc/n),tris:Math.round(tr/n),geos:window.__renderer.info.memory.geometries,tex:window.__renderer.info.memory.textures})})()}));
console.log(q||'(full)',JSON.stringify(r));await b.close();
