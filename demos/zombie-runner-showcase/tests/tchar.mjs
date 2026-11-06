import {chromium} from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto('http://localhost:8137/?noadapt&noobs');await p.waitForFunction(()=>window.__game&&window.__game.state==='title',null,{timeout:60000});await p.keyboard.press('Space');
await p.evaluate(()=>{window.__game.level=3;window.__cam={p:[2.2,1.9,-0.5],t:[0,1.4,-4]};});
await p.waitForFunction(()=>window.__game.zombies.some(z=>z.position.z>-5.5&&z.position.z<-3),null,{timeout:60000}).catch(()=>{});
await p.screenshot({path:'./out/11-texture-closeup.png'});await b.close();
