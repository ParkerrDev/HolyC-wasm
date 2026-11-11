import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,recorded} from './lex-token/cases.mjs';
const source=read('TokenBoundary.HC');
const result=compileHolyC(source,{lenient:false,exports:['TokenBoundaryNew','TokenBoundary','TokenBoundaryDel']});
assert.deepEqual(result.warnings,[]);assert.deepEqual(result.requiredCapabilities,[]);
const host=createHost({onText:()=>{}}),live=new Set();let calls=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{calls++;const ptr=alloc(...args);if(ptr)live.add(ptr);return ptr;};
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
instance.exports.__rt_init();
try {
  for(let mode=0n;mode<5n;mode++) {
    instance.exports.TokenBoundaryNew();calls=0;
    const before=[live.size,host.state.heapPtr,instance.exports.__sp.value];
    const category=mode<3n?'LexCaps':'LexState';
    const code=Buffer.from(category).reduce((n,b,i)=>n+(BigInt(b)<<BigInt(8*i)),0n);
    assert.equal(instance.exports.TokenBoundary(mode),code);
    assert.deepEqual([live.size,host.state.heapPtr,instance.exports.__sp.value],before);
    assert.equal(calls,0,'capability/state rejection allocates nothing');
    assert.equal(host.state.lexError.category,category);
    if(mode===0n){assert.equal(host.state.lexError.offset,8n);assert.equal(host.state.lexError.token,256n);}
    instance.exports.TokenBoundaryDel();
  }
} finally {for(const ptr of [...live])host.env.__free(ptr);}
assert.equal(live.size,0);
const test=recorded('LexMalformed'),malformed=compileHolyC(test.wasmSource,{lenient:false,runtimeProfile:test.profile});
for(const asynchronous of [false,true]) {
  const cause=new Error('diagnostic consumer failed');let calls=0,output='';
  const host=createTaskHost({gfx:new Framebuffer(null),ansi:false,onText:s=>output+=s,
    onLexError:()=>{calls++;if(asynchronous)return Promise.reject(cause);throw cause;}});
  const instance=new WebAssembly.Instance(new WebAssembly.Module(malformed.bytes),{env:host.env});host.attach(instance);
  try {
    const sp=instance.exports.__sp.value;await host.run();
    assert.equal(output,test.output);assert.equal(calls,3);assert.equal(instance.exports.__sp.value,sp);
    assert.equal(host.state.lexError.category,'Compiler');
    if(asynchronous)assert.match(host.state.lexDiagnosticError.message,/must be synchronous/);
    else assert.equal(host.state.lexDiagnosticError,cause);
  } finally {await host.dispose();}
}
console.log('Prompt/document/missing input rejects before mutation; directives stop after the marker without compiler/file actions; throwing/async diagnostic observers preserve HolyC cleanup and original categories.');
