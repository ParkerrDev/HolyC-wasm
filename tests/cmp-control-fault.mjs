import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {read} from './cmp-control/cases.mjs';
const methods=['CmpNewTrial','CmpBorrowTrial','CmpPushTrial','CmpFileTrial','CmpTaskTrial'];
const source=read('CmpFault.HC');
const result=compileHolyC(source,{lenient:false,exports:[...methods,'CmpFaultDone','CmpModeTrial']});
assert.deepEqual(result.warnings,[]);
const host=createTaskHost({ansi:false,onText:()=>{}}),live=new Set();let calls=0,failAt=0,count=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
const state=()=>[live.size,host.state.heapPtr,instance.exports.__sp.value];
try {
  await host.run();
  for(const method of methods) {
    const expected=0n;
    assert.equal(await host.run(method),expected);calls=0;
    assert.equal(await host.run(method),expected);const sites=calls,before=state();
    assert(sites>0);
    for(let n=1;n<=sites;n++) {
      calls=0;failAt=n;assert.equal(await host.run(method),0x6D654D74754Fn,method+': '+n);
      failAt=0;assert.deepEqual(state(),before);assert.equal(host.state.tasks.length,1);
      assert.equal(await host.run(method),expected);assert.deepEqual(state(),before);count++;
    }
  }
  const before=state();
  for(let mode=0;mode<4;mode++) {
    calls=0;
    assert.equal(await host.run('CmpModeTrial',BigInt(mode)),0x65646F4D78654Cn);
    assert.deepEqual(state(),before,'unsupported stream modes leave ownership intact');
    assert.equal(calls,0,'unsupported mode rejected before allocation');
  }
  await host.run('CmpFaultDone');
} finally {failAt=0;await host.dispose();}
assert.equal(live.size,0);
console.log(count,'compiler-control/filename/snapshot/child allocation failures preserve caller buffers and stream state; unsupported prompt/document modes reject before mutation; cleanup and retry pass.');
