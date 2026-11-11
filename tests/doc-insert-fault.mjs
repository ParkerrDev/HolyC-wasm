import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
const read=name=>readFile(new URL('doc-entry/'+name,import.meta.url),'latin1'),
  source=(await read('DocEntriesChk.HC')).replace(/\nDocEntriesChk;\s*$/,'\n')+
    (await read('DocInsertChk.HC')).replace(/\nDocInsertChk;\s*$/,'\n')+
    await read('DocInsertFault.HC')+'\nRaw(OFF);\n',
  compiled=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',
    exports:['DocInsertFaultSetup','DocInsertFaultTrial','DocInsertFaultDone']});
assert.deepEqual(compiled.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();
let calls=0,failAt=0,count=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(++calls===failAt)return 0n;
    const ptr=alloc(...args);if(ptr)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(compiled.bytes),{env:host.env});
host.attach(instance);
try {
  await host.run();const baseline=live.size;
  for(const held of [0n,1n]) {
    await host.run('DocInsertFaultSetup',held);calls=0;
    assert.equal(await host.run('DocInsertFaultTrial'),0n);const sites=calls;
    assert(sites>0);await host.run('DocInsertFaultDone');assert.equal(live.size,baseline);
    for(let n=1;n<=sites;n++) {
      await host.run('DocInsertFaultSetup',held);
      const before=[live.size,host.state.heapPtr,instance.exports.__sp.value];
      calls=0;failAt=n;assert.equal(await host.run('DocInsertFaultTrial'),0x6D654D74754Fn);
      failAt=0;assert.deepEqual([live.size,host.state.heapPtr,instance.exports.__sp.value],before);
      assert.equal(await host.run('DocInsertFaultTrial'),0n);
      await host.run('DocInsertFaultDone');assert.equal(live.size,baseline);count++;
    }
  }
} finally {failAt=0;await host.dispose();}
assert.equal(live.size,0);
console.log(count,'split allocation failures leave document/input bytes and lock ownership unchanged; retry and complete cleanup pass.');
