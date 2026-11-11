import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
const source=readFileSync(new URL('lex-report/ReportFault.HC',import.meta.url),'latin1');
const result=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports:['ReportSetup','ReportDone','ReportTrial','ReportCalls']});
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
try {
  await host.run('ReportSetup');
  for(let mode=0n;mode<4n;mode++) {
    assert.equal(await host.run('ReportTrial',mode,0n),0n);
    calls=0;assert.equal(await host.run('ReportTrial',mode,0n),0n);
    const sites=calls,bytes=instance.exports.ReportCalls(),before=state();
    if(mode===3n)assert.equal(sites,0,'byte-line output allocates nothing');
    else assert(sites>0,'token formatting exercises actual allocations');
    for(let n=1;n<=sites;n++) {
      calls=0;failAt=n;
      assert.equal(await host.run('ReportTrial',mode,0n),0x6D654D74754Fn);
      failAt=0;assert.deepEqual(state(),before);failures++;
      assert.equal(await host.run('ReportTrial',mode,0n),0n);assert.deepEqual(state(),before);
    }
    for(let n=1n;n<=bytes;n++) {
      assert.equal(await host.run('ReportTrial',mode,n),0x74726F706552n);
      assert.deepEqual(state(),before);callbacks++;
      assert.equal(await host.run('ReportTrial',mode,0n),0n);assert.deepEqual(state(),before);
    }
  }
  for(const [mode,expected] of [[4n,0x65646F4D78654Cn],[5n,0x657461745378654Cn],[6n,0n]]) {
    calls=0;const before=state();assert.equal(await host.run('ReportTrial',mode,0n),expected);
    assert.equal(calls,0);assert.equal(instance.exports.ReportCalls(),0n);assert.deepEqual(state(),before);
  }
  await host.run('ReportDone');
  console.log(failures,'formatting failures and',callbacks,'throwing output-byte callbacks preserve source/control state, release host formatting ownership and permit retry; unsupported document/missing input rejects before output.');
} finally {failAt=0;await host.dispose();}
assert.equal(live.size,0);
