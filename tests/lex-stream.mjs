import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {cases,recorded} from './lex-stream/cases.mjs';
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.wasmSource,{lenient:false,runtimeProfile:test.profile});
  assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities.includes('task-continuations');
  let output='',heap=null,count=null;
  const host=(tasks?createTaskHost:createHost)({gfx:new Framebuffer(null),ansi:false,onText:text=>output+=text}),live=new Set();
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
      assert(live.size>2,name+': session directory/hash state remains owned');
      if(tasks)assert.equal(host.state.tasks.length,1);
    }
  } finally {
    if(tasks)await host.dispose();
    else for(const ptr of [...live])host.env.__free(ptr);
  }
  assert.equal(live.size,0,name);
  console.log(test.output.trim(),'five lifetimes with native byte-stream state/echo/ownership and final session disposal');
}
const count=compileHolyC('I64 Count(){return cmp.compiled_lines;}',{lenient:false,exports:['Count']});
assert.deepEqual(count.requiredCapabilities,[]);
assert(!WebAssembly.Module.imports(new WebAssembly.Module(count.bytes)).some(entry=>entry.name==='__malloc'));
const countHost=createHost(),countInstance=new WebAssembly.Instance(new WebAssembly.Module(count.bytes),{env:countHost.env});
countHost.attach(countInstance);countInstance.exports.__rt_init();assert.equal(countInstance.exports.Count(),0n);
for(const name of ['CInit','CmpFillTables'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false}),/undefined symbol/);
console.log('Lexical counter has measured complete storage; compiler graphs and CInit stay unavailable.');
