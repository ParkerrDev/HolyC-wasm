import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {fixture,read} from './define/cases.mjs';
const methods=['DefineLoadTrial','DefineListTrial','DefinePrintTrial','DefineExpandTrial','DefineTaskTrial','DefineMissingTrial'];
const source=fixture('DefineChk').wasmSource.replace(/\nDefineChk;\s*$/,'\n')+read('DefineFault.HC');
const result=compileHolyC(source,{lenient:false,exports:[...methods,'DefineFaultDone']});
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
    const expected=method==='DefineMissingTrial'?0x6665446665646E55n:0n;
    assert.equal(await host.run(method),expected);calls=0;
    assert.equal(await host.run(method),expected);const sites=calls,before=state();
    assert(sites>0);
    for(let n=1;n<=sites;n++) {
      calls=0;failAt=n;assert.equal(await host.run(method),0x6D654D74754Fn,method+': '+n);
      failAt=0;assert.deepEqual(state(),before);assert.equal(host.state.tasks.length,1);
      assert.equal(await host.run(method),expected);assert.deepEqual(state(),before);count++;
    }
  }
  await host.run('DefineFaultDone');assert.equal(live.size,2,'only the root hash table remains');
} finally {failAt=0;await host.dispose();}
assert.equal(live.size,0);
console.log(count,'define/list/format/expansion/child/diagnostic allocation failures retain prior bindings and ownership, restore heap/stack and permit immediate retry.');
