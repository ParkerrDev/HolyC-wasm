import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,recordedOwnership} from './doc-life/cases.mjs';
recordedOwnership();
const source=read('../doc-recalc/Common.HC')+read('Common.HC')+read('LifeOwned.HC')+'\nRaw(OFF);\n';
const r=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports:['LifeOwned']});assert.deepEqual(r.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();
let armed=false,calls=0,base,owner;
const state=()=>new Map(host.state.tasks.map(t=>[t.ptr,t.allocations]));
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
 const alloc=host.env[name];host.env[name]=(...args)=>{if(armed)calls++;const p=alloc(...args);if(p>0n)live.add(p);return p;};
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
host.env.LifeOwnedMark=(phase,ptr,retained)=>{
 if(phase<0n){base=state();owner=ptr;}
 else if(!phase){armed=true;calls=0;}
 else{
  armed=false;assert.equal(calls,0);
  const current=state();assert.equal(current.size,base.size);
  for(const [task,size] of base)assert.equal(current.get(task),size+(task===owner?Number(retained):0));
 }
};
const instance=new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env});host.attach(instance);
try{
 await host.run();const initial=live.size;let heap;
 for(let run=0;run<5;run++){
  for(const del of [0n,1n])for(const foreign of [0n,1n])for(const held of [0n,1n])for(const pending of [0n,1n]){
   await host.run('LifeOwned',del,foreign,held,pending);
   assert.equal(live.size,initial);assert.equal(host.state.tasks.length,1);
  }
  if(!run)heap=host.state.heapPtr;else assert.equal(host.state.heapPtr,heap);
 }
}finally{armed=false;await host.dispose();}assert.equal(live.size,0);
console.log('80 reset/delete lifecycles allocate nothing after setup, release owned/shared/orphan/undo fields for current and foreign tasks, and handle inherited locks plus pending Break without leaks.');
