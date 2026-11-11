import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const source=readFileSync(new URL('hash/HashFault.HC',import.meta.url));
const methods=['HashNewTrial','HashListTrial','HashAddTrial','HashFileTrial','HashSpawnTrial','HashForeignTrial'];
const result=compileHolyC(source,{lenient:false,exports:[...methods,'HashUnsupported']});
assert.deepEqual(result.warnings,[]);const module=new WebAssembly.Module(result.bytes);
const outMem=0x6D654D74754Fn;
function tracked() {
  const host=createTaskHost({onTaskError:error=>{throw error;}}),live=new Set();let calls=0,failAt=0;
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{
      if(++calls===failAt)return 0n;
      const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
    };
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
  return {host,fn:instance.exports,live,get calls(){return calls;},arm(at=0){calls=0;failAt=at;}};
}
let failures=0;
for(const method of methods) {
  const t=tracked();
  try {
    await t.host.run();assert.equal(await t.host.run(method),0n);
    const before=[t.host.state.heapPtr,t.live.size,t.fn.__sp.value];
    t.arm();assert.equal(await t.host.run(method),0n);const sites=t.calls;
    assert(sites>0);
    for(let failAt=1;failAt<=sites;failAt++) {
      t.arm(failAt);assert.equal(await t.host.run(method),outMem,method+': '+failAt);
      assert.deepEqual([t.host.state.heapPtr,t.live.size,t.fn.__sp.value],before);
      assert.equal(t.host.state.tasks.length,1);
      t.arm();assert.equal(await t.host.run(method),0n);
      assert.deepEqual([t.host.state.heapPtr,t.live.size,t.fn.__sp.value],before);
      failures++;
    }
    t.arm();await t.host.run('HashUnsupported');assert.equal(t.live.size,before[1]);
  } finally {await t.host.dispose();}
  assert.equal(t.live.size,0);
}
for(let failAt=1;failAt<=2;failAt++) {
  const t=tracked();t.arm(failAt);
  try {
    await assert.rejects(t.host.run(),WebAssembly.Exception);
    t.arm();await assert.rejects(t.host.run(),/fresh.*instance/);
  } finally {await assert.rejects(t.host.dispose(),/fresh.*instance/);}
  assert.equal(t.live.size,0);
}
console.log(failures,'table/list/generic/child/foreign allocations recover without leaks; unsupported graphs preserve tables; failed root table initialization is poisoned and disposable.');
