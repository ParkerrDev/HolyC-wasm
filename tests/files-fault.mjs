import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const source=`
U0 Reset() {Silent;Cd("B:/DirChk/Alpha");HomeSet("C:/Home");}
U0 Setup() {Silent;Cd("B:/DirChk/Alpha",TRUE);Cd("B:/DirChk/Beta",TRUE);Reset;}
I64 Trial(I64 mode) {
  U8 *ptr;
  CDirContext *dirc;
  I64 error=0;
  try {
    switch(mode) {
      case 0: ptr=DirNameAbs("../Beta//DirChk/./Alpha");Free(ptr);break;
      case 1: Cd("../Beta");break;
      case 2: dirc=DirContextNew("../Beta/*.HC;*.DD");DirContextDel(dirc);break;
      case 3: dirc=DirContextNew("../Beta",TRUE);DirContextDel(dirc);break;
      case 4: HomeSet("B:/DirChk/Alpha");break;
      case 5: IsDir("B:/DirChk/Beta");break;
      case 6: DirMk("../Beta");break;
    }
  } catch {error=Fs->except_ch;Fs->catch_except=TRUE;}
  if(!IsSilent) throw('Silent');
  return error;
}
U0 Idle(U8 *) {}
I64 ChildTrial() {
  I64 error=0;
  CTask *child=NULL;
  try {child=Spawn(&Idle,,,,Fs);}
  catch {error=Fs->except_ch;Fs->catch_except=TRUE;}
  if(child) Kill(child);
  return error;
}
`;
function create(tasks=false) {
  const result=compileHolyC(source,{lenient:false,exports:tasks?['Setup','Reset','ChildTrial']:['Setup','Reset','Trial','DirHostClear']});
  assert.deepEqual(result.warnings,[]);
  const host=(tasks?createTaskHost:createHost)({onText:()=>{}}),live=new Set();let calls=0,failAt=0;
  for(const name of ['__malloc','__malloc_kernel','__malloc_for']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{
      if(++calls===failAt)return 0n;
      const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
    };
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  return {host,fn:instance.exports,live,get calls(){return calls;},arm(at=0){calls=0;failAt=at;}};
}
const volume=create();volume.fn.__rt_init();volume.fn.Setup();const baseline=volume.live.size;
let failures=0;
for(let mode=0;mode<7;mode++) {
  volume.arm();assert.equal(volume.fn.Trial(BigInt(mode)),0n);const sites=volume.calls;
  for(let repeat=0;repeat<3;repeat++)for(let at=1;at<=sites;at++) {
    volume.arm();volume.fn.Reset();volume.arm(at);
    assert.equal(volume.fn.Trial(BigInt(mode)),0x6D654D74754Fn,`mode ${mode}, allocation ${at}`);
    assert.equal(volume.live.size,baseline,`mode ${mode}, allocation ${at} leaked`);
    assert.equal(volume.fn.__sp.value,16777216n);
    volume.arm();volume.fn.Reset();assert.equal(volume.fn.Trial(BigInt(mode)),0n);
    assert.equal(volume.live.size,baseline);failures++;
  }
}
volume.fn.DirHostClear();assert.equal(volume.live.size,0);assert.equal(volume.host.state.heapPtr,16777248);
const child=create(true);await child.host.run('Setup');const count=child.live.size;
child.arm();assert.equal(await child.host.run('ChildTrial'),0n);const childSites=child.calls;
assert(childSites>=3,'constructor, stack and registered child directory must allocate');
for(let repeat=0;repeat<10;repeat++)for(let at=1;at<=childSites;at++) {
  child.arm(at);assert.equal(await child.host.run('ChildTrial'),0x6D654D74754Fn);
  assert.equal(child.live.size,count);assert.equal(child.host.state.tasks.length,1);
  assert.equal(child.fn.__sp.value,16777216n);
  child.arm();assert.equal(await child.host.run('ChildTrial'),0n);assert.equal(child.live.size,count);
}
await child.host.dispose();assert.equal(child.live.size,0);assert.equal(child.host.state.heapPtr,16777248);
console.log(`Directories: ${failures} operation allocation failures and ${childSites*10} child-constructor failures preserve ownership, shadow stack and immediate retry.`);
