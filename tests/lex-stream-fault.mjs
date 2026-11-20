import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {read} from './lex-stream/cases.mjs';
const methods=['LexIncludeTrial'];
const source=read('LexFault.HC');
const result=compileHolyC(source,{lenient:false,exports:[...methods,'LexFaultDone']});
assert.deepEqual(result.warnings,[]);
//CmpCtrlNew links the task runtime in the one Adam, so it is a task program.
assert.deepEqual(result.requiredCapabilities,['task-continuations']);
const host=createTaskHost({ansi:false,onText:()=>{},jit:result.jit}),live=new Set();let calls=0,failAt=0,count=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
const state=()=>[live.size,host.state.heapPtr,instance.exports.__sp.value];
const run=(name="__main",...args)=>instance.exports[name](...args);
await host.run('__rt_init');
const baseline=state();
try {
  await host.run();
  for(const method of methods) {
    const expected=0n;
    assert.equal(run(method),expected);calls=0;
    assert.equal(run(method),expected);const sites=calls,before=state();
    assert(sites>0);
    for(let n=1;n<=sites;n++) {
      calls=0;failAt=n;assert.equal(run(method),0x6D654D74754Fn,method+': '+n);
      failAt=0;assert.deepEqual(state(),before);
      assert.equal(run(method),expected);assert.deepEqual(state(),before);count++;
    }
  }
  run('LexFaultDone');
  assert.deepEqual(state(),baseline,'all control/input allocations released; only session startup remains');
} finally {failAt=0;await host.dispose();}
assert.equal(live.size,0);
console.log(count,'nested-stream allocation failures preserve caller input and parent state; cleanup and retry pass.');
