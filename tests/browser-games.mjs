import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const web=resolve(process.env.TEMPLEOS_WEB || '../TempleOS-Web');
const compiler=new URL('../src/',import.meta.url).pathname;
const {chromium}=await import(pathToFileURL(web+'/node_modules/playwright-core/index.mjs'));
const mime={'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 const base=path.startsWith('/holyc-wasm/src/')?compiler:web;
 const file=path.startsWith('/holyc-wasm/src/')?resolve(compiler,path.slice('/holyc-wasm/src/'.length)):resolve(web,'.'+(path==='/'?'/index.html':path));
 if(!file.startsWith(resolve(base)+'/'))throw new Error('Outside served checkout');
 const body=await readFile(file);
 res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});
 res.end(body);
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const dir=new URL('.oracle/browser-games/',import.meta.url).pathname;await mkdir(dir,{recursive:true});
try {
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 await context.route('**/hemu/*.gz',r=>r.abort());
 await context.route('https://templeosweb-*.workers.dev/**',r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'load'});
 for(const [name,key]of[['HolyCraft','w'],['Babel','Space'],['Volley','Space'],['Snake','w']]){
  await page.locator('#gamesBtn').click();
  await page.locator('#gmSearch').fill(name);
  const card=page.locator('.gm-card').filter({has:page.getByRole('heading',{name,exact:true})});
  await card.getByRole('button',{name:'Run in Browser',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#gameWinStatus').textContent.includes('compiled'),null,{timeout:30000});
  await page.waitForTimeout(1000);
  const before=await page.locator('#screen').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,640,480).data;let h=0;const colors=new Set();for(let i=0;i<data.length;i+=4){h=(Math.imul(h,65599)+data[i]+256*data[i+1]+65536*data[i+2])>>>0;colors.add(data[i]+256*data[i+1]+65536*data[i+2]);}return{hash:h,colors:colors.size};});
  assert(before.colors>=3,name+' draws visible colors');
  await page.locator('#screen').focus();await page.keyboard.down(key);await page.waitForTimeout(350);await page.keyboard.up(key);await page.waitForTimeout(250);
  const after=await page.locator('#screen').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,640,480).data;let h=0;for(let i=0;i<a.length;i+=4)h=(Math.imul(h,65599)+a[i]+256*a[i+1]+65536*a[i+2])>>>0;return h;});
  assert.notEqual(after,before.hash,name+' renders advancing frames');
  assert(await page.evaluate(()=>window.__holycEditor.isRunning()));
  await page.screenshot({path:dir+'/'+name+'.png'});
  console.log(name,JSON.stringify(before),'after',after,await page.locator('#gameWinStatus').innerText());
  await page.locator('#gameWinClose').click();
 }
 assert.deepEqual(errors,[]);console.log('Browser games: four actual worker executions render advancing frames without page errors; keyboard response is not asserted. Screenshots: '+dir);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
