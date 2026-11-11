import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url).pathname;
const web=resolve(process.env.TEMPLEOS_WEB||'../TempleOS-Web');
const {chromium}=await import(pathToFileURL(web+'/node_modules/playwright-core/index.mjs'));
const server=createServer(async(request,response)=>{
  try {
    const path=new URL(request.url,'http://localhost').pathname;
    if(path==='/') {response.setHeader('Content-Type','text/html');response.end('<!doctype html><title>HolyC task check</title>');return;}
    if(path==='/site/Keyboard.js') {response.setHeader('Content-Type','text/javascript');response.end(await readFile(web+'/Keyboard.js'));return;}
    const file=resolve(root,'.'+path);
    if(!file.startsWith(root+'src/')) throw new Error('Unserved path');
    response.setHeader('Content-Type','text/javascript');response.end(await readFile(file));
  } catch {response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const sources=await Promise.all(['Tasks','TaskExcept'].map(async name=>({name,
    source:await readFile(new URL('v503/'+name+'.HC',import.meta.url),'latin1'),
    expected:await readFile(new URL('v503/'+name+'.out',import.meta.url),'latin1')})));
  const results=await page.evaluate(async fixtures=>{
    const {compileHolyC}=await import('/src/compiler.js');
    const {createTaskHost,taskSupport}=await import('/src/runtime/tasks.js');
    if(!taskSupport()) throw new Error('This browser lacks JSPI task continuations');
    const results=[];
    for(const fixture of fixtures) {
      let output='';const result=compileHolyC(fixture.source,{lenient:false});
      const host=createTaskHost({ansi:false,onText:text=>output+=text});
      const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
      host.attach(instance);
      await host.run();
      results.push({name:fixture.name,match:output===fixture.expected,output,tasks:host.state.tasks.length,
        allocations:host.state.tasks[0].allocations});
      await host.dispose();
    }
    return results;
  },sources);
  for(const result of results) {
    assert(result.match,result.name+': '+result.output);
    assert.equal(result.tasks,1);assert.equal(result.allocations,0);
  }
  await page.evaluate(async()=>{
    const {compileHolyC}=await import('/src/compiler.js');
    const {createTaskHost}=await import('/src/runtime/tasks.js');
    const {KEY,KeyBytes}=await import('/site/Keyboard.js');
    const result=compileHolyC('while(TRUE) {I64 ch=GetKey; "%d\\n",ch;}',{lenient:false});
    window.keyOutput='';
    const host=createTaskHost({ansi:false,onText:text=>window.keyOutput+=text});
    host.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}));
    window.keyHost=host;window.keyRun=host.run();
    for(const type of ['keydown','keyup']) addEventListener(type,event=>{
      const key=KEY[event.code];
      if(key!==undefined) {event.preventDefault();const bytes=KeyBytes(key,type==='keydown');if(bytes.length)host.keyBytes(bytes);}
    });
  });
  await page.keyboard.down('Shift');
  await page.keyboard.press('Escape');await page.keyboard.press('Space');
  await page.keyboard.up('Shift');await page.keyboard.press('ArrowLeft');
  await page.keyboard.down('a');await page.keyboard.down('a');await page.keyboard.up('a');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.keyOutput.split('\n').length===8);
  assert.equal(await page.evaluate(()=>window.keyOutput),'0\n28\n31\n0\n97\n97\n27\n');
  await page.evaluate(async()=>{keyHost.resetInput();await keyHost.stop();await keyRun;await keyHost.dispose();});
  assert.deepEqual(errors,[]);
  console.log('Browser JSPI: original native task lifecycle and cross-task exceptions match with no surviving child allocations; real browser keys deliver Shift-Escape/Space, arrows and repeat through set-1 decoding.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
