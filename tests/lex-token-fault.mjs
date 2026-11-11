import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read} from './lex-token/cases.mjs';
const exports=['TokenFaultSetup','TokenFaultDone','TokenFaultNew','TokenFaultRun','TokenFaultDel','TokenFaultCalls'];
const result=compileHolyC(read('TokenFault.HC'),{lenient:false,runtimeProfile:'keydev',exports});
assert.deepEqual(result.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();let calls=0,failAt=0,failures=0,callbacks=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
const state=()=>[live.size,host.state.heapPtr,instance.exports.__sp.value];
const run=(name,...args)=>host.run(name,...args);
try {
  await run('TokenFaultSetup');
  for(let mode=0n;mode<3n;mode++) {
    await run('TokenFaultNew',mode,0n);assert.equal(await run('TokenFaultRun'),0n);await run('TokenFaultDel');
    await run('TokenFaultNew',mode,0n);calls=0;
    assert.equal(await run('TokenFaultRun'),0n);const sites=calls;
    await run('TokenFaultDel');const before=state();assert(sites>0);
    for(let n=1;n<=sites;n++) {
      await run('TokenFaultNew',mode,0n);calls=0;failAt=n;
      assert.equal(await run('TokenFaultRun'),0x6D654D74754Fn,`mode ${mode}, allocation ${n}`);
      failAt=0;await run('TokenFaultDel');assert.deepEqual(state(),before);failures++;
      await run('TokenFaultNew',mode,0n);assert.equal(await run('TokenFaultRun'),0n);
      await run('TokenFaultDel');assert.deepEqual(state(),before);
    }
    await run('TokenFaultNew',mode,100000n);assert.equal(await run('TokenFaultRun'),0n);
    const bytes=instance.exports.TokenFaultCalls();await run('TokenFaultDel');
    for(let n=1n;n<=bytes;n++) {
      await run('TokenFaultNew',mode,n);
      assert.equal(await run('TokenFaultRun'),0x6F68634578654Cn,`mode ${mode}, echo ${n}`);
      await run('TokenFaultDel');assert.deepEqual(state(),before);callbacks++;
      await run('TokenFaultNew',mode,0n);assert.equal(await run('TokenFaultRun'),0n);
      await run('TokenFaultDel');assert.deepEqual(state(),before);
    }
  }
  await run('TokenFaultDone');
} finally {failAt=0;await host.dispose();}
assert.equal(live.size,0);
console.log(failures,'token allocation failures and',callbacks,'throwing echo callbacks release temporary/control/include ownership, preserve old tokens on allocation failure and permit fresh retry.');
