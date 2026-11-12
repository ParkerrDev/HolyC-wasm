import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {cases,recorded} from './doc-layout/cases.mjs';
for(const name of cases) {
  const test=recorded(name);if(name==='LayoutOwner')continue;
  const result=compileHolyC(test.source,{lenient:false,runtimeProfile:'keydev'});
  assert.deepEqual(result.warnings,[]);
  let output='',heap,count;const live=new Set();
  const host=createTaskHost({gfx:new Framebuffer(null),ansi:false,onText:s=>output+=s});
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{const p=alloc(...args);if(p>0n)live.add(p);return p;};
  }
  const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
  host.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}));
  try {
    for(let i=0;i<5;i++) {
      output='';await host.run();assert.equal(output,test.output,name);
      if(!i){heap=host.state.heapPtr;count=live.size;}
      else{assert.equal(host.state.heapPtr,heap,name);assert.equal(live.size,count,name);}
      assert.equal(host.state.tasks.length,1);
    }
  } finally {await host.dispose();}
  assert.equal(live.size,0);console.log(test.output.trim(),'five lifetimes and complete disposal');
}
const plain=compileHolyC('I64 Answer(){return 1;}',{lenient:false,exports:['Answer']});
assert.deepEqual(plain.requiredCapabilities,[]);
assert(!WebAssembly.Module.imports(new WebAssembly.Module(plain.bytes)).some(e=>e.name.startsWith('__malloc')||e.name.startsWith('__task')));
for(const name of ['DocNew','EdLeftClickLink'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false,runtimeProfile:'keydev'}),/undefined|untyped/);
for(const name of ['DocWordWrapDel','DocRecalcXY','DocSplitTag','DocWordWrapAdd','DocTmpAttr','DocCharDist','DocDelToNum','DocDelToEntry','DocEntryLink'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false}),/undefined|untyped/);
const pure=compileHolyC('I64 Distance(){CDoc doc;doc.x=3;doc.y=4;return DocCharDist(&doc,0,0);}',{lenient:false,runtimeProfile:'keydev',exports:['Distance']});
assert.deepEqual(pure.requiredCapabilities,[]);const host=createHost();
const instance=new WebAssembly.Instance(new WebAssembly.Module(pure.bytes),{env:host.env});host.attach(instance);
instance.exports.__main();assert.equal(instance.exports.Distance(),1600n);
console.log('Layout helper reachability preserves allocation/device-free arithmetic; console and absent layout/editor APIs remain explicit boundaries.');
