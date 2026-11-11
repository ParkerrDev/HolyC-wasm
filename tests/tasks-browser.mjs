import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {recorded as keydevRecorded} from './keydev/cases.mjs';
import {recorded as hashRecorded} from './hash/cases.mjs';
import {recorded as docRecorded} from './doc-entry/cases.mjs';
import {recorded as defineRecorded} from './define/cases.mjs';
import {recorded as cmpRecorded} from './cmp-control/cases.mjs';
import {recorded as memberRecorded} from './member/cases.mjs';
import {recorded as tablesRecorded} from './cmp-tables/cases.mjs';
import {recorded as vectorRecorded} from './que-vector/cases.mjs';
import {recorded as lexRecorded} from './lex-stream/cases.mjs';
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
  const hashTask=hashRecorded('HashTask');
  sources.push({name:'HashTask',source:hashTask.wasmSource,expected:hashTask.output});
  const memberTask=memberRecorded('MemberTask');
  sources.push({name:'MemberTask',source:memberTask.identity.nativeBindings+memberTask.source,expected:memberTask.output});
  const tableTask=tablesRecorded('CmpTableTask');
  sources.push({name:'CmpTableTask',source:tableTask.wasmSource,expected:tableTask.output});
  const vectorTask=vectorRecorded('QueVectorTask');
  sources.push({name:'QueVectorTask',source:vectorTask.wasmSource,expected:vectorTask.output});
  const lexTask=lexRecorded('LexTask');
  sources.push({name:'LexTask',source:lexTask.wasmSource,expected:lexTask.output});
  const cmpTask=cmpRecorded('CmpTask');
  sources.push({name:'CmpTask',source:cmpTask.wasmSource,expected:cmpTask.output});
  const defineTask=defineRecorded('DefineTask');
  sources.push({name:'DefineTask',source:defineTask.wasmSource,expected:defineTask.output});
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
      const row={name:fixture.name,match:output===fixture.expected,output,tasks:host.state.tasks.length,
        allocations:host.state.tasks[0].allocations};
      await host.dispose();row.disposedAllocations=host.state.tasks[0].allocations;results.push(row);
    }
    return results;
  },sources);
  for(const result of results) {
    assert(result.match,result.name+': '+result.output);
    assert.equal(result.tasks,1);
    if(['CmpTask','LexTask','QueVectorTask','CmpTableTask'].includes(result.name))assert(result.allocations>2,'native directory/hash state remains session-owned');
    else assert.equal(result.allocations,['HashTask','DefineTask'].includes(result.name)?2:0);
    assert.equal(result.disposedAllocations,0);
  }
  const volumes=await Promise.all(['DirectoryTask','FileTask'].map(async name=>({name,
    source:await readFile(new URL('probes/'+name+'.HC',import.meta.url),'latin1'),
    expected:await readFile(new URL('probes/'+name+'.out',import.meta.url),'latin1')})));
  for(const directory of volumes) {
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
      if(fixture.name==='FileTask') {
        const generated=entries.find(entry=>String.fromCharCode(...entry.path)==='B:/FileTask/Data.BIN');
        if(generated?.bytes.length!==777 || generated.bytes.some((byte,index)=>byte!==(index*17&255)))
          throw new Error('Child file bytes did not survive native task exit');
      }
      rows.push({match:output===fixture.expected+'VOLUME_WAIT\n',bytes:Array.from(file.bytes)});
      if(!host.postMessage(2,27,1))throw new Error('Directory session did not remain ready for input');
      await running;
    }
    await host.dispose();return {rows,allocations:host.state.tasks[0].allocations};
  },directory);
  assert.deepEqual(volume,{rows:[{match:true,bytes:[0,255,10]},{match:true,bytes:[0,255,10]}],allocations:0});
  }
  for(const fixture of [keydevRecorded('KeyScroll'),docRecorded('DocEntryTask'),lexRecorded('LexEcho')]) {
  const keydev=await page.evaluate(async fixture=>{
    const {compileHolyC}=await import('/src/compiler.js');
    const {createTaskHost}=await import('/src/runtime/tasks.js');
    const {Framebuffer}=await import('/src/runtime/graphics.js');
    let output='';
    const result=compileHolyC(fixture.source,{lenient:false,runtimeProfile:'keydev'});
    if(result.warnings.length)throw new Error(result.warnings.join('\n'));
    const host=createTaskHost({gfx:new Framebuffer(null),ansi:false,onText:text=>output+=text});
    host.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}));
    await host.run();const heap=host.state.heapPtr,first=output;
    output='';await host.run();
    if(output!==first || host.state.heapPtr!==heap || host.state.tasks.length!==1)
      throw new Error('KeyDev/document task lifetime did not stabilize');
    await host.dispose();return {output,allocations:host.state.tasks[0].allocations};
  },{source:fixture.wasmSource});
  assert.deepEqual(keydev,{output:fixture.output,allocations:0});
  }
  await page.evaluate(async()=>{
    const {compileHolyC}=await import('/src/compiler.js');
    const {createTaskHost}=await import('/src/runtime/tasks.js');
    const {Framebuffer}=await import('/src/runtime/graphics.js');
    const {KEY,KeyBytes}=await import('/site/Keyboard.js');
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
    document.body.append(canvas);const gfx=new Framebuffer(canvas.getContext('2d'));
    const result=compileHolyC('I64 stage=0; I64 Stage(){return stage;} RawPrint(8,"A"); stage=1; GetKey; Raw(OFF); "DONE";',
      {lenient:false,runtimeProfile:'keydev',exports:['Stage']});
    window.rawOutput='';
    const host=createTaskHost({gfx,ansi:false,timeMs:()=>performance.now(),
      onTick:()=>gfx.present(),onText:text=>window.rawOutput+=text});
    const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
    window.rawInstance=instance;window.rawHost=host;window.rawRun=host.run();window.rawCanvas=canvas;
    window.rawKeys=event=>{const key=KEY[event.code];if(key!==undefined){event.preventDefault();host.keyBytes(KeyBytes(key,event.type==='keydown'));}};
    addEventListener('keydown',window.rawKeys);addEventListener('keyup',window.rawKeys);
  });
  await page.waitForFunction(()=>rawInstance.exports.Stage()===1n);
  assert.deepEqual(await page.evaluate(()=>Array.from(rawCanvas.getContext('2d').getImageData(0,0,3,1).data)),
    [0,0,0,255,0,0,0,255,255,255,255,255]);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>rawOutput==='DONE');
  await page.evaluate(async()=>{await rawRun;await rawHost.dispose();
    removeEventListener('keydown',rawKeys);removeEventListener('keyup',rawKeys);rawCanvas.remove();
    if(rawHost.state.tasks[0].allocations)throw new Error('Raw session retained allocations');});
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
  console.log('Browser JSPI: original task lifecycle, cross-task exceptions, catchable breaks and character waits and native directory/byte-volume sessions match with no surviving child allocations; native task hash/define/compiler-control/byte-stream/document ownership, scoped KeyDev ScrollLock and raw canvas/GetKey behavior pass; real browser keys deliver Shift-Escape/Space, arrows and repeat through set-1 decoding.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
