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
  const sources=await Promise.all(['Tasks','TaskExcept','GetChar','Break'].map(async name=>({name,
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
  const directory={source:await readFile(new URL('probes/DirectoryTask.HC',import.meta.url),'latin1'),
    expected:await readFile(new URL('probes/DirectoryTask.out',import.meta.url),'latin1')};
  const volume=await page.evaluate(async fixture=>{
    const {compileHolyC}=await import('/src/compiler.js');
    const {createTaskHost}=await import('/src/runtime/tasks.js');
    const result=compileHolyC(fixture.source+' "VOLUME_WAIT\\n"; GetKey;',{lenient:false});
    let output='',ready;
    const host=createTaskHost({files:[{path:new Uint8Array([67,58,47,255]),bytes:new Uint8Array([0,255,10])}],
      ansi:false,onText:text=>{output+=text;if(output.endsWith('VOLUME_WAIT\n'))ready();}});
    host.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}));
    const rows=[];
    for(let i=0;i<2;i++) {
      output='';const waiting=new Promise(resolve=>ready=resolve),running=host.run();await waiting;
      const entries=host.files(),file=entries.find(entry=>entry.path.length===4 && entry.path[3]===255);
      rows.push({match:output===fixture.expected+'VOLUME_WAIT\n',bytes:Array.from(file.bytes)});
      if(!host.postMessage(2,27,1))throw new Error('Directory session did not remain ready for input');
      await running;
    }
    await host.dispose();return {rows,allocations:host.state.tasks[0].allocations};
  },directory);
  assert.deepEqual(volume,{rows:[{match:true,bytes:[0,255,10]},{match:true,bytes:[0,255,10]}],allocations:0});
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
  console.log('Browser JSPI: original task lifecycle, cross-task exceptions, catchable breaks and character waits and native directory/byte-volume sessions match with no surviving child allocations; real browser keys deliver Shift-Escape/Space, arrows and repeat through set-1 decoding.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
