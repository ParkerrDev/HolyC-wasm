import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
const source=`
U0 Setup() {
  Silent;Cd("B:/Files/Inner",TRUE);
  FileWrite("A.TXT","Original",8,0xB2D3D12345678);
  FileWrite("../Parent","Parent",6,0xB2D3D12345678);
}
I64 Trial(I64 mode) {
  I64 error=0,size,attr,chain=Fs->next_except;
  U8 *ptr;
  CDirEntry de;
  try {
    switch(mode) {
      case 0:ptr=FileNameAbs("Parent",FUF_SCAN_PARENTS);Free(ptr);break;
      case 1:if(FileFind("Parent",&de,FUF_SCAN_PARENTS)) Free(de.full_name);break;
      case 2:FileFind("Missing",&de,FUF_SCAN_PARENTS|FUF_Z_OR_NOT_Z);break;
      case 3:ptr=FileRead("A.TXT",&size,&attr);Free(ptr);break;
      case 4:ptr=FileRead("Missing",&size,&attr);Free(ptr);break;
      case 5:FileWrite("A.TXT","Replacement",11,0xB2D3D12345678);break;
      case 6:FileWrite("New/Deep/X.BIN","Created",7,0xB2D3D12345678);break;
      case 7:FileWrite("A.TXT",NULL,0,0xB2D3D12345678);break;
    }
  } catch {error=Fs->except_ch;Fs->catch_except=TRUE;}
  if(chain!=Fs->next_except) throw('Chain');
  if(StrCmp(Fs->cur_dir,"/Files/Inner") || Drv2Let!='B' || !IsSilent)
    throw('Context');
  return error;
}
I64 Unsupported(I64 mode) {
  I64 error=0;
  U8 *ptr;
  try {
    switch(mode) {
      case 0:FileWrite("New/Deep/Arc.HC.Z","data",4);break;
      case 1:ptr=FileRead("C:/Arc.HC.Z");Free(ptr);break;
      case 2:FileWrite("New/Deep/A.TXT","data",4,,RS_ATTR_RESIDENT);break;
      case 3:FileWrite("New/Deep/A.TXT","data",4,,RS_ATTR_DIR);break;
      case 4:FileWrite("A.TXT",NULL,1);break;
      case 5:FileWrite("A.TXT","data",0x4000001);break;
    }
  } catch {error=Fs->except_ch;Fs->catch_except=TRUE;}
  return error;
}
`;
const compiled=compileHolyC(source,{lenient:false,exports:['Setup','Trial','Unsupported','DirHostClear']});
assert.deepEqual(compiled.warnings,[]);const module=new WebAssembly.Module(compiled.bytes);
function create() {
  const host=createHost({onText:()=>{},files:[{path:'C:/Arc.HC.Z',bytes:Uint8Array.of(1,2,3)}]}),live=new Set();
  let calls=0,failAt=0;
  for(const name of ['__malloc','__malloc_kernel','__malloc_for']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{
      if(++calls===failAt)return 0n;
      const ptr=alloc(...args);if(ptr)live.add(ptr);return ptr;
    };
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
  instance.exports.__rt_init();instance.exports.Setup();
  return {host,fn:instance.exports,live,get calls(){return calls;},arm(at=0){calls=0;failAt=at;}};
}
const tag=text=>[...Buffer.from(text)].reduce((a,b,i)=>a|BigInt(b)<<BigInt(i*8),0n);
let failures=0;
for(let mode=0;mode<8;mode++) {
  const counted=create();counted.arm();assert.equal(counted.fn.Trial(BigInt(mode)),0n);
  const sites=counted.calls;counted.fn.DirHostClear();assert.equal(counted.live.size,0);
  for(let at=1;at<=sites;at++) {
    const volume=create();volume.arm(at);
    assert.equal(volume.fn.Trial(BigInt(mode)),tag('OutMem'),`mode ${mode}, site ${at}`);
    assert.equal(volume.fn.__sp.value,16777216n);volume.arm();
    const before=volume.host.files().find(f=>Buffer.from(f.path).toString()==='B:/Files/Inner/A.TXT');
    assert.deepEqual(before.bytes,Uint8Array.from(Buffer.from('Original')),`failure modified original data at mode ${mode}, site ${at}`);
    assert.equal(volume.fn.Trial(BigInt(mode)),0n);volume.fn.DirHostClear();
    assert.equal(volume.live.size,0,`leak at mode ${mode}, site ${at}`);
    assert.equal(volume.host.state.heapPtr,16777248);failures++;
  }
}
const unsupported=create(),initial=unsupported.host.files(),count=unsupported.live.size;
for(const [mode,name] of ['FsArc','FsArc','FsRes','FsAttr','FsBuf','FsQuota'].entries()) {
  assert.equal(unsupported.fn.Unsupported(BigInt(mode)),tag(name));
  assert.equal(unsupported.fn.__sp.value,16777216n);
  assert.equal(unsupported.live.size,count);assert.deepEqual(unsupported.host.files(),initial);
}
unsupported.fn.DirHostClear();assert.equal(unsupported.live.size,0);
const repeat=create();let heap,live;
for(let i=0;i<30;i++) {
  for(const mode of [5,3,7,3])assert.equal(repeat.fn.Trial(BigInt(mode)),0n);
  heap??=repeat.host.state.heapPtr;live??=repeat.live.size;
  assert.equal(repeat.host.state.heapPtr,heap);assert.equal(repeat.live.size,live);
}
repeat.fn.DirHostClear();assert.equal(repeat.live.size,0);
console.log(`File failures: ${failures} allocation sites preserve original data, directory/exception state and immediate retry; unsupported compression/resident/attributes/buffers/quotas reject without mutations or leaks.`);
