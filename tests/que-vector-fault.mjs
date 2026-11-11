import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {read} from './que-vector/cases.mjs';
const exports=['QvNewTrial','QvFaultSetup','QvGrowTrial','QvFaultDone','RemFaultSetup','RemReadTrial','RemFaultDone'];
const result=compileHolyC(read('QueVectorFault.HC'),{lenient:false,exports});
assert.deepEqual(result.warnings,[]);assert.deepEqual(result.requiredCapabilities,[]);
const host=createHost({ansi:false,onText:()=>{}}),live=new Set();let calls=0,failAt=0,total=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
const state=()=>[live.size,host.state.heapPtr,instance.exports.__sp.value];
const run=(name,...args)=>instance.exports[name](...args);
const outMem=0x6D654D74754Fn;
try {
  instance.exports.__main();
  calls=0;assert.equal(run('QvNewTrial'),0n);const newSites=calls,baseline=state();
  assert.equal(newSites,1);
  for(let site=1;site<=newSites;site++) {
    calls=0;failAt=site;assert.equal(run('QvNewTrial'),outMem);failAt=0;
    assert.deepEqual(state(),baseline);assert.equal(run('QvNewTrial'),0n);assert.deepEqual(state(),baseline);total++;
  }
  run('QvFaultSetup');calls=0;assert.equal(run('QvGrowTrial'),0n);const growSites=calls;
  assert.equal(growSites,2);run('QvFaultDone');assert.deepEqual(state(),baseline);
  for(let site=1;site<=growSites;site++) {
    run('QvFaultSetup');const sp=instance.exports.__sp.value;
    calls=0;failAt=site;assert.equal(run('QvGrowTrial'),outMem);failAt=0;
    assert.equal(instance.exports.__sp.value,sp);
    assert.equal(run('QvGrowTrial'),0n,'Retry extends the retained valid prefix.');
    run('QvFaultDone');assert.deepEqual(state(),baseline);total++;
  }
  run('RemFaultSetup');calls=0;assert.equal(run('RemReadTrial'),0n);const remSites=calls;
  assert.equal(remSites,5);run('RemFaultDone');assert.deepEqual(state(),baseline);
  for(let site=1;site<=remSites;site++) {
    run('RemFaultSetup');const before=state();
    calls=0;failAt=site;assert.equal(run('RemReadTrial'),outMem);failAt=0;
    assert.deepEqual(state(),before,'Failed marker scan frees every temporary queue node.');
    assert.equal(run('RemReadTrial'),0n,'Retry reads the remaining source from its actual consumed position.');
    assert.deepEqual(state(),before);run('RemFaultDone');assert.deepEqual(state(),baseline);total++;
  }
} finally {failAt=0;for(const ptr of [...live])host.env.__free(ptr);}
assert.equal(live.size,0);
console.log(total,'allocation failures preserve valid vector prefixes, free marker-scan temporaries, retain caller source and output-length ownership, and permit immediate retries without heap/stack leaks.');
