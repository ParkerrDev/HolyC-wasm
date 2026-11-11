import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {recordedReject} from './doc-recalc/cases.mjs';
const result=compileHolyC(recordedReject().source+'\nRaw(OFF);\n',{runtimeProfile:'keydev',lenient:false,exports:['RecalcReject']});assert.deepEqual(result.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}});let armed=false,calls=0,live=new Set();
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
 const alloc=host.env[name];host.env[name]=(...args)=>{if(armed)calls++;const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;};
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
host.env.RecalcRejectMark=phase=>{armed=!phase;};
host.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}));
try{
 await host.run();const base=live.size;
 for(let i=0n;i<=46n;i++)for(const held of [0n,1n]){
  await host.run('RecalcReject',i,held);assert.equal(live.size,base);assert.equal(calls,0);assert.equal(host.state.tasks.length,1);
 }
}finally{await host.dispose();}assert.equal(live.size,0);
console.log('94 unsupported normal-layout requests preserve document, entry, tag, task flags and exception chains before allocation, drawing or callbacks.');
