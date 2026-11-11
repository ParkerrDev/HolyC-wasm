import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
const result=compileHolyC(`
I64 SeedTry(U8 *path,U8 *data,I64 size,Bool directory) {
  I64 res=0;
  try {res=DirHostSeed(path,data,size,directory);}
  catch {res=-Fs->except_ch;Fs->catch_except=TRUE;}
  return res;
}
I64 GrowTry(U8 *path) {
  I64 res=0;
  try {Cd(path,TRUE);}
  catch {res=Fs->except_ch;Fs->catch_except=TRUE;}
  return res;
}
I64 AbsTry(U8 *path) {
  I64 res=0;
  U8 *abs=NULL;
  try {abs=DirNameAbs(path);}
  catch {res=Fs->except_ch;Fs->catch_except=TRUE;}
  Free(abs);return res;
}
`,{lenient:false,exports:['SeedTry','GrowTry','AbsTry','Cd','DirCur','DirHostClear']});
assert.deepEqual(result.warnings,[]);const module=new WebAssembly.Module(result.bytes);
const tag=name=>[...Buffer.from(name)].reduce((n,byte,i)=>n|BigInt(byte)<<BigInt(i*8),0n);
function load(files=[]) {
  const host=createHost({files,onText:()=>{}}),instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
  const fn=instance.exports;
  function string(value,action) {
    const bytes=Buffer.from(value,'latin1'),ptr=fn.MAlloc(BigInt(bytes.length+1),0n);
    const memory=new Uint8Array(fn.memory.buffer);memory.set(bytes,Number(ptr));memory[Number(ptr)+bytes.length]=0;
    try {return action(ptr);} finally {fn.Free(ptr);}
  }
  return {host,fn,string};
}
const base=load();base.fn.__main();
const maxNodes=Number(base.fn.DirHostMaxNodes()),maxBytes=Number(base.fn.DirHostMaxBytes()),maxPath=Number(base.fn.DirHostMaxPath());
const initial=base.host.files().length;
assert(maxNodes>initial);assert(maxBytes>0);assert(maxPath>38);
for(const files of [Array.from({length:maxNodes+1},(_,i)=>({path:'C:/Q'+i,bytes:new Uint8Array()})),
  [{path:'C:/Huge',bytes:new Uint8Array(maxBytes+1)}]]) {
  const bad=load(files);assert.throws(()=>bad.fn.__main(),WebAssembly.Exception);
  assert.equal(bad.host.state.heapPtr,16777248);assert(bad.host.state.filesystemError instanceof RangeError);
}
const full=load(Array.from({length:maxNodes-initial},(_,i)=>({path:'C:/Q'+i,bytes:new Uint8Array()})));
full.fn.__main();assert.equal(full.host.files().length,maxNodes);
assert.equal(full.string('C:/OneMore',ptr=>full.fn.SeedTry(ptr,0n,0n,0n)),-tag('FsQuota'));
assert.equal(full.host.files().length,maxNodes);assert.equal(full.fn.__sp.value,16777216n);
full.fn.DirHostClear();assert.equal(full.host.state.heapPtr,16777248);
const before=base.host.files();
assert.equal(base.string('C:/Huge',ptr=>base.fn.SeedTry(ptr,ptr,BigInt(maxBytes+1),0n)),0n);
assert.deepEqual(base.host.files(),before);
// Repeated relative directory changes must not build unexportable paths beyond
// the advertised limit, even though each individual input is short.
const segment='x'.repeat(36),parts=Math.floor((maxPath-3)/37),deep='C:/'+Array(parts).fill(segment).join('/');
const paths=load([{path:deep,directory:true}]);paths.fn.__main();
assert.equal(paths.string(deep,ptr=>paths.fn.Cd(ptr,0n)),1n);
assert.equal(paths.string(segment,ptr=>paths.fn.GrowTry(ptr)),tag('FsPath'));
assert.equal(paths.string(segment,ptr=>paths.fn.AbsTry(ptr)),tag('FsPath'));
const exported=paths.host.files();assert(exported.every(entry=>entry.path.length<=maxPath));
assert.equal(exported.length,initial+parts);
paths.fn.DirHostClear();assert.equal(paths.host.state.heapPtr,16777248);
base.fn.DirHostClear();assert.equal(base.host.state.heapPtr,16777248);
console.log(`Virtual volume limits: ${maxNodes} live nodes, ${maxBytes} seed bytes, ${maxPath}-byte composed paths, rejected-input cleanup and nonmutation pass.`);
