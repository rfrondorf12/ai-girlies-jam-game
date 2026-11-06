import {chromium} from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto('http://localhost:8137/?debug&fps&noadapt&nozombies&noobs');await p.waitForFunction(()=>window.__game&&window.__game.state==='title',null,{timeout:60000});await p.keyboard.press('Space');await p.waitForTimeout(1500);
await p.evaluate(()=>{const f=window.__spawnObstacle; f('truck',0,-16); f('crate',1,-11); f('barricade',2,-8); f('car',1,-24);});
await p.waitForTimeout(400); await p.screenshot({path:'./out/9-debug-colliders.png'});await b.close();
