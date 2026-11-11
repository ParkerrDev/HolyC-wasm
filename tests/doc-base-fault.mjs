import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {read} from './doc-nav/cases.mjs';
const result=compileHolyC(read('DocBaseFault.HC'),{lenient:false,exports:['DocBaseFault']});
assert.deepEqual(result.warnings,[]);
const host=createTaskHost({onText:()=>{}}),live=new Set();
let armed=false,fail=false,calls=0,owner,before,after,allocation;
const state=()=>({live:live.size,heap:host.state.heapPtr,stack:instance.exports.__sp.value,
  owners:host.state.tasks.map(t=>[t.ptr,t.allocations])});
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(armed && ++calls===1 && fail)return 0n;
    const p=alloc(...args);if(p>0n)live.add(p);
    if(armed && p>0n)allocation={name,args,owners:host.state.tasks.map(t=>[t.ptr,t.allocations])};
    return p;
  };
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
host.env.DocBaseMark=(phase,ptr,error)=>{
  if(phase===0n){owner=ptr;calls=0;allocation=null;before=state();armed=true;}
  else{armed=false;after={state:state(),error};}
};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
try {
  await host.run();const initial=live.size;
  for(const mode of [0n,1n,2n]) {
    fail=false;await host.run('DocBaseFault',mode);await host.run('DocBaseFault',mode);
    for(let round=0;round<5;round++) {
      fail=false;assert.equal(await host.run('DocBaseFault',mode),0n);assert.equal(calls,1);
      assert.equal(allocation.name,mode===2n?'__malloc_for':'__malloc');assert.equal(allocation.args[0],88n);
      assert.equal(allocation.args[1],mode===2n?owner:undefined);
      for(const [ptr,count] of allocation.owners)
        assert.equal(count,before.owners.find(t=>t[0]===ptr)[1]+Number(ptr===owner));
      assert.deepEqual(after.state,before);assert.equal(live.size,initial);assert.equal(host.state.tasks.length,1);
      fail=true;assert.equal(await host.run('DocBaseFault',mode),0x6D654D74754Fn);assert.equal(calls,1);
      assert.equal(allocation,null);assert.deepEqual(after.state,before);
      assert.equal(live.size,initial);assert.equal(host.state.tasks.length,1);
    }
  }
} finally {armed=false;await host.dispose();}
assert.equal(live.size,0);
console.log('Default/current/foreign entry ownership: allocation failure preserves document/owners/stack, immediate retry and child release; five repetitions each.');
