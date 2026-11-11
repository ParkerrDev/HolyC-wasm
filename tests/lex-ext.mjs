import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {recorded} from './lex-ext/cases.mjs';
const test=recorded(),result=compileHolyC(test.source,{lenient:false});assert.deepEqual(result.warnings,[]);
assert.deepEqual(result.requiredCapabilities,[]);
let output='',heap,count;const live=new Set(),host=createHost({onText:s=>output+=s});
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
 const alloc=host.env[name];host.env[name]=(...args)=>{const p=alloc(...args);if(p>0n)live.add(p);return p;};
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
try{
 for(let i=0;i<5;i++){
  output='';instance.exports.__main();assert.equal(output,test.output);
  if(!i){heap=host.state.heapPtr;count=live.size;}else{assert.equal(host.state.heapPtr,heap);assert.equal(live.size,count);}
 }
}finally{for(const p of [...live])host.env.__free(p);}
assert.equal(live.size,0);
console.log(test.output.trim(),'native bytes, token/stream state, five allocation-stable lifetimes and disposal; default console remains independent.');
