import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,base} from './doc-entry/cases.mjs';
const source=base+read('DocInsertChk.HC').replace(/\nDocInsertChk;\s*$/,'\n')+
  read('DocCopyFault.HC')+read('DocInsertFault.HC')+read('DocForeignFault.HC')+'\nRaw(OFF);\n';
const result=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports:['DocForeignTrial']});
assert.deepEqual(result.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();
let armed=false,calls=0,failAt=0,child=0n,before,after,owners=[];
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(armed && ++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr>0n)live.add(ptr);
    if(armed && ptr>0n)owners.push({name,owner:args[1],childAllocations:host.state.tasks.find(t=>t.ptr===child).allocations});
    return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const state=()=>({live:live.size,root:host.state.tasks[0].allocations,
  child:host.state.tasks.find(t=>t.ptr===child).allocations,heap:host.state.heapPtr,stack:instance.exports.__sp.value});
host.env.DocForeignMark=(phase,ptr,error)=>{
  if(phase===0n){child=ptr;calls=0;owners=[];before=state();armed=true;}
  else {armed=false;after={...state(),error};}
};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
let count=0;
try {
  await host.run();const baseline=live.size;
  for(const split of [0n,1n]) {
    await host.run('DocForeignTrial',split);
    assert.equal(await host.run('DocForeignTrial',split),0n);const sites=calls,heap=host.state.heapPtr;
    assert(sites>0);
    const checkOwners=()=>{
      assert(owners.length>0);
      for(const owner of owners){assert.equal(owner.name,'__malloc_for');assert.equal(owner.owner,child);assert(owner.childAllocations>before.child);}
    };
    checkOwners();assert.equal(after.root,before.root);assert.equal(after.child,before.child+(split?2:0));
    assert.equal(live.size,baseline);
    for(let n=1;n<=sites;n++) {
      failAt=n;
      assert.equal(await host.run('DocForeignTrial',split),0x6D654D74754Fn);
      failAt=0;
      assert.deepEqual({...after,error:undefined},{...before,error:undefined});
      if(owners.length)checkOwners();
      assert.equal(live.size,baseline);assert.equal(host.state.heapPtr,heap);assert.equal(host.state.tasks.length,1);
      count++;
    }
  }
} finally {armed=false;await host.dispose();}
assert.equal(live.size,0);
console.log(count,'foreign mem_task allocation failures preserve caller/child ownership, documents and stack; immediate retry and child cleanup pass.');
