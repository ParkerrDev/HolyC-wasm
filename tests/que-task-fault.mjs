import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {read} from './que-vector/cases.mjs';
const result=compileHolyC(read('QueTaskFault.HC'),{lenient:false,exports:['QvTaskTrial','QvFaultTaskDone']});
assert.deepEqual(result.warnings,[]);
const host=createTaskHost({ansi:false,onText:()=>{}}),live=new Set();let calls=0,failAt=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
const state=()=>[live.size,host.state.heapPtr,instance.exports.__sp.value];
let sites;
try {
  await host.run();assert.equal(await host.run('QvTaskTrial'),0n);calls=0;
  assert.equal(await host.run('QvTaskTrial'),0n);sites=calls;const before=state();
  assert(sites>8);
  for(let site=1;site<=sites;site++) {
    calls=0;failAt=site;assert.equal(await host.run('QvTaskTrial'),0x6D654D74754Fn,'child allocation '+site);failAt=0;
    assert.deepEqual(state(),before);assert.equal(host.state.tasks.length,1);
    assert.equal(await host.run('QvTaskTrial'),0n);assert.deepEqual(state(),before);
  }
  await host.run('QvFaultTaskDone');
} finally {failAt=0;await host.dispose();}
assert.equal(live.size,0);
console.log(sites,'child startup/vector/marker allocations fail and recover with no retained tasks or owned blocks; borrowed parent vector remains intact.');
