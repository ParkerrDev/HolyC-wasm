import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {cases,recorded} from './define/cases.mjs';
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.wasmSource,{lenient:false});
  assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities.includes('task-continuations');
  let output='',heap=null,count=null;
  const host=(tasks?createTaskHost:createHost)({ansi:false,onText:text=>output+=text}),live=new Set();
  for(const name of ['__malloc','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;};
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  try {
    for(let i=0;i<5;i++) {
      output='';if(tasks)await host.run();else instance.exports.__main();
      assert.equal(output,test.output,name);
      if(heap===null){heap=host.state.heapPtr;count=live.size;}
      else {assert.equal(host.state.heapPtr,heap,name);assert.equal(live.size,count,name);}
      assert.equal(live.size,tasks?host.state.boot.allocations:2,name+": only the boot (with the root hash table) survives");
      if(tasks)assert.equal(host.state.tasks.length,1);
    }
  } finally {
    if(tasks)await host.dispose();
    else for(const ptr of [...live])host.env.__free(ptr);
  }
  assert.equal(live.size,0,name);
  console.log(test.output.trim(),'five lifetimes; native AD metadata and explicit host omission checked separately');
}
const boundary=compileHolyC('#define STATIC_ONLY 17\nI64 Exists(){return HashFind("STATIC_ONLY",Fs->hash_table,HTT_DEFINE_STR)!=NULL;}',
  {lenient:false,exports:['Exists']});
const host=createHost(),instance=new WebAssembly.Instance(new WebAssembly.Module(boundary.bytes),{env:host.env});
host.attach(instance);instance.exports.__main();assert.equal(instance.exports.Exists(),0n);
//As V5.03's Lex does, a statement compiled after DefineLoad runs sees its define.
const late=compileHolyC('DefineLoad("LATE_ONLY","43"); "%d\\n",LATE_ONLY;',{lenient:false});
let lateOut='';const lateHost=createTaskHost({ansi:false,jit:late.jit,onText:text=>lateOut+=text});
lateHost.attach(new WebAssembly.Instance(new WebAssembly.Module(late.bytes),{env:lateHost.env}));
try{await lateHost.run();}finally{await lateHost.dispose();}
assert.equal(lateOut,'43\n');
console.log('Runtime defines are program-owned hash entries; a later run-time compile sees them, a static export does not.');
