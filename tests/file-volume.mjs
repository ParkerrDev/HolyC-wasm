import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
const source=String.raw`
I64 WriteTry(U8 *name,I64 size) {
  I64 res=0;
  try {res=!!FileWrite(name,"abc",size,0xB2D3D12345678,RS_ATTR_HIDDEN);}
  catch {res=-Fs->except_ch;Fs->catch_except=TRUE;}
  return res;
}
I64 Info(U8 *name,I64 field) {
  CDirEntry de;
  I64 res=-1;
  if(FileFind(name,&de)) {
    switch(field) {
      case 0:res=de.size;break;
      case 1:res=de.attr;break;
      case 2:res=de.datetime;break;
    }
    Free(de.full_name);
  }
  return res;
}
`;
const compiled=compileHolyC(source,{lenient:false,exports:['WriteTry','Info','Cd','DirHostClear']});
assert.deepEqual(compiled.warnings,[]);const module=new WebAssembly.Module(compiled.bytes);
const tag=text=>[...Buffer.from(text)].reduce((v,ch,i)=>v|BigInt(ch)<<BigInt(i*8),0n);
function load(files=[]) {
  const host=createHost({files,onText:()=>{}}),instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
  const fn=instance.exports;
  function path(value,call) {
    const bytes=Buffer.from(value,'latin1'),ptr=fn.MAlloc(BigInt(bytes.length+1),0n);
    new Uint8Array(fn.memory.buffer).set(bytes,Number(ptr));new Uint8Array(fn.memory.buffer)[Number(ptr)+bytes.length]=0;
    try{return call(ptr);}finally{fn.Free(ptr);}
  }
  return {host,fn,path};
}
const seeded=load([{path:'C:/Keep',bytes:Uint8Array.of(7)}]);seeded.fn.__main();
const nodes=Number(seeded.fn.DirHostMaxNodes()),bytes=Number(seeded.fn.DirHostMaxBytes()),limit=Number(seeded.fn.DirHostMaxPath());
assert.equal(seeded.path('C:/Saved.BIN',p=>seeded.fn.WriteTry(p,3n)),1n);
const image=new Uint8Array(seeded.fn.memory.buffer).slice(),cursor=seeded.host.state.heapPtr,entries=seeded.host.files();
const restored=load([{path:'invalid',bytes:new Uint8Array()}]);
if(restored.fn.memory.buffer.byteLength<image.length)restored.fn.memory.grow((image.length-restored.fn.memory.buffer.byteLength)/65536);
new Uint8Array(restored.fn.memory.buffer).set(image);restored.host.state.heapPtr=cursor;restored.fn.__rt_init();
assert.deepEqual(restored.host.files(),entries);
for(const [field,value] of [3n,2n,0xB2D3D12345678n].entries())
  assert.equal(restored.path('C:/Saved.BIN',p=>restored.fn.Info(p,BigInt(field))),value);
restored.fn.DirHostClear();assert.equal(restored.host.state.heapPtr,16777248);
const initial=seeded.host.files().length-2;seeded.fn.DirHostClear();

const full=load(Array.from({length:nodes-initial},(_,i)=>({path:'C:/Q'+i,bytes:new Uint8Array()})));
full.fn.__main();assert.equal(full.host.files().length,nodes);
assert.equal(full.path('C:/New',p=>full.fn.WriteTry(p,3n)),-tag('FsQuota'));
assert.equal(full.path('C:/Q0',p=>full.fn.WriteTry(p,3n)),1n);
assert.equal(full.host.files().length,nodes);full.fn.DirHostClear();assert.equal(full.host.state.heapPtr,16777248);

const exact=load([{path:'C:/Big',bytes:new Uint8Array(bytes-3)},{path:'C:/Small',bytes:Uint8Array.of(9,8,7)}]);
exact.fn.__main();assert.equal(exact.path('C:/Small',p=>exact.fn.WriteTry(p,3n)),1n);
assert.equal(exact.path('C:/New',p=>exact.fn.WriteTry(p,1n)),-tag('FsQuota'));
assert.equal(exact.path('C:/Small',p=>exact.fn.WriteTry(p,0n)),1n);
assert.equal(exact.path('C:/New',p=>exact.fn.WriteTry(p,3n)),1n);
assert.equal(exact.path('C:/Small',p=>exact.fn.Info(p,0n)),0n);
const data=exact.host.files();assert.equal(data.reduce((n,f)=>n+(f.bytes?.length??0),0),bytes);
assert.deepEqual(data.find(f=>Buffer.from(f.path).toString()==='C:/New').bytes,Uint8Array.of(97,98,99));
exact.fn.DirHostClear();assert.equal(exact.host.state.heapPtr,16777248);

const part='x'.repeat(36),count=Math.floor((limit-3)/37),deep='C:/'+Array(count).fill(part).join('/');
const paths=load([{path:deep,directory:true}]);paths.fn.__main();assert.equal(paths.path(deep,p=>paths.fn.Cd(p,0n)),1n);
assert.equal(paths.path('A'.repeat(37),p=>paths.fn.WriteTry(p,1n)),-tag('FsPath'));
assert(paths.host.files().every(f=>f.path.length<=limit));paths.fn.DirHostClear();assert.equal(paths.host.state.heapPtr,16777248);
console.log('File volume: exact node/data quotas, replacement/truncation accounting, composed-path limits and full-memory byte/attribute/date restore pass.');
