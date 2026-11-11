import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {cases,recorded} from './doc-nav/cases.mjs';
for(const name of cases) {
  const test=recorded(name);
  if(name==='NativeOwner')continue; //The native heap header is not the host allocator ABI.
  const result=compileHolyC(test.source,{lenient:false,exports:name==='DocNavigate'?['DocNavModes']:[]});assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities.includes('task-continuations');assert.equal(tasks,name==='DocBaseTask');
  let output='',calls=0,foreign=0;const live=new Set();
  const host=(tasks?createTaskHost:createHost)({ansi:false,onText:s=>output+=s});
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{
      calls++;const p=alloc(...args);if(p>0n)live.add(p);
      if(tasks && name==='__malloc_for' && args[0]===88n && args[1]!==host.state.tasks[0].ptr) {
        assert(host.state.tasks.some(t=>t.ptr===args[1] && t.allocations>0));foreign++;
      }
      return p;
    };
  }
  const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  let heap,count;
  try {
    if(tasks)await host.run('__rt_init');else instance.exports.__rt_init();
    const initCount=live.size,initCalls=calls;
    if(name==='DocNavigate') {
      instance.exports.DocNavModes(4n,0x04030201n,0x55n);
      assert.equal(calls,initCalls,'navigation is allocation-free after metadata initialization');
    }
    for(let i=0;i<5;i++) {
      output='';if(tasks)await host.run();else instance.exports.__main();
      assert.equal(output,test.output,name);assert.equal(live.size,initCount,name);
      if(i===0){heap=host.state.heapPtr;count=live.size;}
      else{assert.equal(host.state.heapPtr,heap,name);assert.equal(live.size,count,name);}
      if(tasks)assert.equal(host.state.tasks.length,1);
    }
    if(tasks)assert.equal(foreign,20,'each entry is allocated for its registered child');
  } finally {if(tasks)await host.dispose();else for(const p of [...live])host.env.__free(p);}
  assert.equal(live.size,0);console.log(name,'matches original native state/bytes through five lifetimes, ownership and disposal');
}
for(const profile of ['console','keydev']) {
  for(const name of ['DocNew','DocPrint','EdLeftClickLink'])
    assert.throws(()=>compileHolyC(name+';',{lenient:false,runtimeProfile:profile}),/undefined symbol/);
}
assert.throws(()=>compileHolyC('DocClear;',{lenient:false,runtimeProfile:'keydev'}),/undefined symbol/);
console.log('Native base/navigation functions do not introduce unfinished construction/output, link-editor or clear APIs.');
