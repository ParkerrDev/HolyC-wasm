import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,recorded} from './lex-token/cases.mjs';
const source=read('TokenBoundary.HC');
const result=compileHolyC(source,{lenient:false,exports:['TokenBoundaryNew','TokenBoundary','TokenBoundaryDel']});
//CmpCtrlNew links the task runtime in the one Adam, so it is a task program.
assert.deepEqual(result.warnings,[]);assert.deepEqual(result.requiredCapabilities,['task-continuations']);
const host=createTaskHost({onText:()=>{},jit:result.jit}),live=new Set();let calls=0;
for(const name of ['__malloc','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{calls++;const ptr=alloc(...args);if(ptr)live.add(ptr);return ptr;};
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
await host.run('__rt_init');
try {
  //Mode 0 is '#' with no keyword table: V5.03 takes the name and goes on.
  assert.equal(instance.exports.TokenBoundaryNew(),undefined);
  assert.equal(instance.exports.TokenBoundary(0n),0n);
  instance.exports.TokenBoundaryDel();
  //A prompt stream reads a line with CmdLinePmt (V5.03), so only missing input refuses.
  for(const mode of [2n,3n]) {
    instance.exports.TokenBoundaryNew();calls=0;
    const before=[live.size,host.state.heapPtr,instance.exports.__sp.value];
    const category='LexState';
    const code=Buffer.from(category).reduce((n,b,i)=>n+(BigInt(b)<<BigInt(8*i)),0n);
    assert.equal(instance.exports.TokenBoundary(mode),code);
    assert.deepEqual([live.size,host.state.heapPtr,instance.exports.__sp.value],before);
    assert.equal(calls,0,'capability/state rejection allocates nothing');
    assert.equal(host.state.lexError.category,category);
    instance.exports.TokenBoundaryDel();
  }
} finally {await host.dispose();}
assert.equal(live.size,0);
const test=recorded('LexMalformed'),malformed=compileHolyC(test.wasmSource,{lenient:false});
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
console.log('Missing input rejects before mutation; \'#\' with no keyword table gives the name as V5.03; throwing/async diagnostic observers preserve HolyC cleanup and original categories.');
