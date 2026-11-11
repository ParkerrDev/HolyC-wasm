import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
const read=name=>readFile(new URL('doc-entry/'+name,import.meta.url),'latin1');
const result=compileHolyC((await read('DocEntriesChk.HC')).replace(/\nDocEntriesChk;\s*$/,'\n')+
  await read('DocCopyFault.HC')+'\nRaw(OFF);\n',{
    lenient:false,runtimeProfile:'keydev',exports:['DocCopySetup','DocCopyTrial','DocCopyDone','DocCopyDiagnostics']});
assert.deepEqual(result.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();
let calls=0,failAt=0,total=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
host.attach(instance);
try {
  await host.run();const session=live.size;
  for(const empty of [0n,1n])for(let mask=0;mask<512;mask++) {
    await host.run('DocCopySetup',BigInt(mask),empty);
    calls=0;assert.equal(await host.run('DocCopyTrial'),0n);const sites=calls,
      before=[live.size,host.state.heapPtr,instance.exports.__sp.value];
    for(let n=1;n<=sites;n++) {
      calls=0;failAt=n;
      assert.equal(await host.run('DocCopyTrial'),0x6D654D74754Fn,`${mask}/${empty}, allocation ${n}`);
      failAt=0;
      assert.deepEqual([live.size,host.state.heapPtr,instance.exports.__sp.value],before);
      assert.equal(await host.run('DocCopyTrial'),0n,'Immediate retry');
      assert.deepEqual([live.size,host.state.heapPtr,instance.exports.__sp.value],before);
      total++;
    }
    await host.run('DocCopyDone');assert.equal(live.size,session);
  }
  await host.run('DocCopySetup',511n,0n);
  let time=0;host.state.timeMs=()=>time+=500;
  const before=live.size;
  await host.run('DocCopyDiagnostics');
  assert.equal(live.size,before);
  assert(host.state.gfx.indices.some(pixel=>pixel===15),'Invalid-entry diagnostics use the real raw display.');
  assert.equal(await host.run('DocCopyTrial'),0n);
  await host.run('DocCopyDone');assert.equal(live.size,session);
} finally {failAt=0;await host.dispose();}
assert.equal(live.size,0);
console.log(total,'allocation failures across all owned/borrowed/null fields and bins preserve source bytes, destination queues/IDs, allocation ownership, heap/stack and immediate retry. Real raw diagnostics preserve live entries.');
