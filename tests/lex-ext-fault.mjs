import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read} from './lex-ext/cases.mjs';
const result=compileHolyC(read('ExtFault.HC'),{lenient:false,runtimeProfile:'keydev',exports:['ExtFaultSetup','ExtFaultCase','ExtFaultDone','ExtFaultCalls']});
assert.deepEqual(result.warnings,[]);
const diagnostics=[],host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{},onLexError:r=>diagnostics.push(r)}),live=new Set();
let armed=false,calls=0,failAt=0,failures=0,callbacks=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
 const alloc=host.env[name];host.env[name]=(...args)=>{
  if(armed && ++calls===failAt)return 0n;
  const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
 };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
host.env.ExtFaultMark=phase=>{armed=!phase;if(armed)calls=0;};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
const state=()=>({live:live.size,stack:instance.exports.__sp.value,owners:host.state.tasks.map(t=>[t.ptr,t.allocations])});
try{
 await host.run('ExtFaultSetup');const baseline=state();
 for(const child of [0n,1n])for(let mode=0n;mode<4n;mode++){
  failAt=0;assert.equal(await host.run('ExtFaultCase',mode,0n,child),0n);const sites=calls;assert(sites>0);assert.deepEqual(state(),baseline);
  for(let n=1;n<=sites;n++){
   failAt=n;assert.equal(await host.run('ExtFaultCase',mode,0n,child),0x6D654D74754Fn,`mode ${mode}, child ${child}, allocation ${n}`);
   assert.deepEqual(state(),baseline);failures++;
   failAt=0;assert.equal(await host.run('ExtFaultCase',mode,0n,child),0n);assert.deepEqual(state(),baseline);
  }
  assert.equal(await host.run('ExtFaultCase',mode,100000n,child),0n);
  const bytes=instance.exports.ExtFaultCalls();assert(bytes>0n);
  for(let n=1n;n<=bytes;n++){
   assert.equal(await host.run('ExtFaultCase',mode,n,child),0x6F68634578654Cn,`mode ${mode}, child ${child}, echo ${n}`);
   assert.deepEqual(state(),baseline);callbacks++;
  }
  assert.equal(await host.run('ExtFaultCase',mode,0n,child),0n);assert.deepEqual(state(),baseline);
 }
 for(const child of [0n,1n])for(const mode of [4n,5n]){
  assert.equal(await host.run('ExtFaultCase',mode,0n,child),mode===4n?0x72656C69706D6F43n:0x7370614378654Cn);
  assert.deepEqual(state(),baseline);
 }
 assert.deepEqual(diagnostics.map(r=>r.category),['Compiler','LexCaps','Compiler','LexCaps']);
 await host.run('ExtFaultDone');
}finally{armed=false;failAt=0;await host.dispose();}
assert.equal(live.size,0);
console.log(failures,'string extraction allocation failures and',callbacks,'throwing echo callbacks release detached/concatenated/control ownership for root and child tasks, preserve output size on failure and permit retry; malformed/unsupported scanning retains explicit Compiler/LexCaps errors without leaks.');
