import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {cases,recorded} from './hash/cases.mjs';
const pure=compileHolyC('"%X",HashStr("Native");',{lenient:false});
assert.deepEqual(pure.requiredCapabilities,[]);
assert(!WebAssembly.Module.exports(new WebAssembly.Module(pure.bytes)).some(x=>x.name==='HashHostTaskInit'));
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.wasmSource,{lenient:false});
  assert.deepEqual(result.warnings,[]);
  let output='';const tasks=result.requiredCapabilities.includes('task-continuations');
  const host=(tasks?createTaskHost:createHost)({ansi:false,onText:text=>output+=text}),live=new Set();
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;};
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  host.env.__hash_live_span=()=>[...live].reduce((total,ptr)=>total+host.env.__msize2(ptr),0n);
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  let high=null,count=null;
  try {
    for(let i=0;i<5;i++) {
      output='';if(tasks)await host.run();else instance.exports.__main();
      assert.equal(output,test.output,name);
      if(high===null){high=host.state.heapPtr;count=live.size;}
      else {assert.equal(host.state.heapPtr,high,name);assert.equal(live.size,count,name);}
      if(tasks)assert.equal(host.state.tasks.length,1,name);else assert.equal(live.size,0,name);
    }
  } finally {if(tasks)await host.dispose();}
  assert.equal(live.size,0,name);
  console.log(test.output.trim(),'five lifetimes and ownership checks pass');
}
