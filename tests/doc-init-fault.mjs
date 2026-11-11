import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {read} from './doc-init/cases.mjs';
const result=compileHolyC(read('DocFault.HC'),{lenient:false,exports:['DocFaultSetup','DocFaultTrial','DocFaultDone']});
assert.deepEqual(result.warnings,[]);assert.deepEqual(result.requiredCapabilities,[]);
const host=createHost({onText:()=>{}}),live=new Set();let calls=0,failAt=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
const state=()=>[live.size,host.state.heapPtr,instance.exports.__sp.value];
instance.exports.__rt_init();
const initial=live.size;
try {
  instance.exports.DocFaultSetup();
  assert.equal(instance.exports.DocFaultTrial(),0n);
  calls=0;assert.equal(instance.exports.DocFaultTrial(),0n);
  const sites=calls,before=state();assert(sites>300);
  for(let n=1;n<=sites;n++) {
    calls=0;failAt=n;assert.equal(instance.exports.DocFaultTrial(),0x6D654D74754Fn,'allocation '+n);
    failAt=0;assert.deepEqual(state(),before,'rollback '+n);
    assert.equal(instance.exports.DocFaultTrial(),0n);assert.deepEqual(state(),before,'retry '+n);
  }
  instance.exports.DocFaultDone();assert.equal(live.size,initial);
  console.log(sites,'actual document metadata/list/hash/parser allocation failures leave the output unpublished, preserve prior defines, free only document-domain entries, restore heap/stack and permit immediate retry.');
} finally {failAt=0;for(const ptr of [...live])host.env.__free(ptr);}
assert.equal(live.size,0);
