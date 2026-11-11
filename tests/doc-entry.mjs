import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {cases,recorded} from './doc-entry/cases.mjs';
const compile=(source,opts={})=>compileHolyC(source,{lenient:false,...opts});
const plain=compile('I64 Answer(){return 42;}',{exports:['Answer']});
assert.deepEqual(plain.requiredCapabilities,[]);
assert(!WebAssembly.Module.imports(new WebAssembly.Module(plain.bytes)).some(x=>['__task_require','__gr_update_mono','__time_ms_checked'].includes(x.name)));
assert.throws(()=>compile('DocEntryDel(NULL,NULL);'),/DocEntryDel/);
for(const missing of ['DocInit','DocNew','DocRst','DocRecalc','DocClear'])
  assert.throws(()=>compile(missing+';',{runtimeProfile:'keydev'}),/undefined|untyped/i,missing);
const pure=compile('I64 Editable(){CDocEntry e; e.type=DOCT_TEXT;e.de_flags=0;return IsEditableText(&e);}',
  {runtimeProfile:'keydev',exports:['Editable']});
assert.deepEqual(pure.requiredCapabilities,[]);
const bare=createHost(),instance=new WebAssembly.Instance(new WebAssembly.Module(pure.bytes),{env:bare.env});
bare.attach(instance);instance.exports.__main();assert.equal(instance.exports.Editable(),1n);
const diagnostic=compile('DocEntryDel(NULL,NULL);',{runtimeProfile:'keydev'});
assert.deepEqual(diagnostic.requiredCapabilities,['task-continuations']);
assert.throws(()=>new WebAssembly.Instance(new WebAssembly.Module(diagnostic.bytes),{env:createTaskHost().env}),WebAssembly.LinkError);
for(const name of cases) {
  const test=recorded(name),result=compile(test.wasmSource,{runtimeProfile:'keydev'});
  assert.deepEqual(result.warnings,[]);
  let output='',heap=null,count=null;
  const host=createTaskHost({gfx:new Framebuffer(null),ansi:false,onText:text=>output+=text});
  host.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}));
  try {
    for(let i=0;i<5;i++) {
      output='';await host.run();assert.equal(output,test.output,name);
      if(heap===null){heap=host.state.heapPtr;count=host.state.tasks[0].allocations;}
      else {assert.equal(host.state.heapPtr,heap,name);assert.equal(host.state.tasks[0].allocations,count,name);}
      assert.equal(host.state.tasks.length,1,name);
    }
  } finally {await host.dispose();}
  assert.equal(host.state.tasks[0].allocations,0,name);
  console.log(test.output.trim(),'five lifetimes and disposal pass');
}
console.log('Entry APIs require the explicit KeyDev profile; pure utility reachability remains device-free, diagnostics require the real device, and unfinished document APIs stay absent.');
