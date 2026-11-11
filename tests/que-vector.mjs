import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {cases,recorded} from './que-vector/cases.mjs';
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.wasmSource,{lenient:false});
  assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities.includes('task-continuations');
  let output='',heap=null,count=null;
  const host=(tasks?createTaskHost:createHost)({ansi:false,onText:text=>output+=text}),live=new Set();
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;};
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  try {
    for(let i=0;i<5;i++) {
      output='';if(tasks)await host.run();else instance.exports.__main();
      assert.equal(output,test.output,name);
      if(heap===null){heap=host.state.heapPtr;count=live.size;}
      else {assert.equal(host.state.heapPtr,heap,name);assert.equal(live.size,count,name);}
      if(name==='QueVector')assert.equal(live.size,0,'Pure queue vectors need no session directory/hash allocations.');
      else assert(live.size>2,name+': session directory/hash state remains owned');
      if(tasks)assert.equal(host.state.tasks.length,1);
    }
  } finally {
    if(tasks)await host.dispose();
    else for(const ptr of [...live])host.env.__free(ptr);
  }
  assert.equal(live.size,0,name);
  console.log(test.output.trim(),'five lifetimes with native vector/marker/child ownership and final session disposal');
}
