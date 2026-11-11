import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
const source='import I64 Effect(); I64 mask=doldoc.hash->mask; I64 seen=Effect; Effect; I64 Read(){return mask;} I64 DocSize(){return sizeof(CDolDocGlbls);}';
const result=compileHolyC(source,{lenient:false,exports:['Read','DocSize']});assert.deepEqual(result.warnings,[]);
const module=new WebAssembly.Module(result.bytes);
function load(failAt=0) {
  let calls=0,effects=0;const live=new Set(),host=createHost({onText:()=>{}});
  host.env.Effect=()=>{effects++;return 1n;};
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{if(++calls===failAt)return 0n;const p=alloc(...args);if(p)live.add(p);return p;};
  }
  const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
  const instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
  return {host,instance,live,get calls(){return calls;},get effects(){return effects;},
    dispose(){for(const p of [...live])host.env.__free(p);assert.equal(live.size,0);}};
}
const good=load();let sites;
try {
  good.instance.exports.__main();sites=good.calls;assert(sites>300);
  assert.equal(good.instance.exports.Read(),511n);assert.equal(good.effects,2);
  good.instance.exports.__main();assert.equal(good.effects,3);assert.equal(good.calls,sites);
} finally {good.dispose();}
const failed=load(sites-1);
try {
  assert.throws(()=>failed.instance.exports.__main(),WebAssembly.Exception);
  assert.equal(failed.effects,0);
  const address=result.globals.get('doldoc').addr;
  const bytes=new Uint8Array(failed.instance.exports.memory.buffer,address,Number(failed.instance.exports.DocSize()));
  assert(bytes.every(byte=>byte===0),'partially constructed metadata is never published');
  const calls=failed.calls;
  assert.throws(()=>failed.instance.exports.__main(),/initialization failed or reentered/);
  assert.equal(failed.calls,calls);assert.equal(failed.effects,0);
} finally {failed.dispose();}
const fresh=load();try {fresh.instance.exports.__main();assert.equal(fresh.instance.exports.Read(),511n);}finally{fresh.dispose();}
console.log('Reachable document initialization completes before user defaults/effects; late allocation failure publishes no metadata, poisons the module, and a fresh instance succeeds.');
