import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {recorded} from './lex-ext/cases.mjs';
const test=recorded(),result=compileHolyC(test.source,{lenient:false});assert.deepEqual(result.warnings,[]);
assert.deepEqual(result.requiredCapabilities,['task-continuations']); //It prints, so it is a task.
let output='',heap,count;const live=new Set(),host=createTaskHost({onText:s=>output+=s,jit:result.jit});
for(const name of ['__malloc','__malloc_kernel']){
 const alloc=host.env[name];host.env[name]=(...args)=>{const p=alloc(...args);if(p>0n)live.add(p);return p;};
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
try{
 for(let i=0;i<5;i++){
  output='';await host.run();assert.equal(output,test.output);
  if(!i){heap=host.state.heapPtr;count=live.size;}else{assert.equal(host.state.heapPtr,heap);assert.equal(live.size,count);}
 }
}finally{await host.dispose();}
assert.equal(live.size,0);
console.log(test.output.trim(),'native bytes, token/stream state, five allocation-stable lifetimes and disposal.');
