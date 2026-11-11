import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {recorded} from './lex-string/cases.mjs';
const test=recorded(),result=compileHolyC(test.source,{lenient:false,
  exports:['CmpCtrlNew','CmpCtrlDel','LexInStr']});
assert.deepEqual(result.warnings,[]);assert.deepEqual(result.requiredCapabilities,[]);
let output='',heap=null,count=null,denyAlloc=false,attempts=0;
const host=createHost({ansi:false,onText:text=>output+=text}),live=new Set();
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(denyAlloc){attempts++;return 0n;}
    const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
  };
}
const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
try {
  for(let i=0;i<5;i++) {
    output='';instance.exports.__main();assert.equal(output,test.output);
    if(heap===null){heap=host.state.heapPtr;count=live.size;}
    else {assert.equal(host.state.heapPtr,heap);assert.equal(live.size,count);}
  }
  const src=host.env.__malloc(16n),dst=host.env.__malloc(32n),done=host.env.__malloc(8n);
  let bytes=new Uint8Array(instance.exports.memory.buffer);
  bytes.set([65,92,120,52,49,92,48,34,90,0],Number(src));
  const cc=instance.exports.CmpCtrlNew(src,0n,0n);
  bytes=new Uint8Array(instance.exports.memory.buffer);bytes.fill(0xA5,Number(dst),Number(dst)+32);
  const before=[host.state.heapPtr,live.size,instance.exports.__sp.value];
  denyAlloc=true;
  assert.equal(instance.exports.LexInStr(cc,dst+4n,16n,done),4n);
  denyAlloc=false;
  assert.equal(attempts,0,'String chunk decoding must allocate nothing.');
  assert.deepEqual([host.state.heapPtr,live.size,instance.exports.__sp.value],before);
  assert.equal(bytes[Number(done)],1);
  assert.deepEqual([...bytes.slice(Number(dst),Number(dst)+32)],
    [...Array(4).fill(0xA5),65,65,0,0,...Array(24).fill(0xA5)]);
  instance.exports.CmpCtrlDel(cc);host.env.__free(dst);host.env.__free(done);
  assert.equal(live.size,count);
} finally {denyAlloc=false;for(const ptr of [...live])host.env.__free(ptr);}
assert.equal(live.size,0);
console.log(test.output.trim(),'five lifetimes, native buffer/state/chunk boundaries, allocation-free decoding and final ownership release pass.');
