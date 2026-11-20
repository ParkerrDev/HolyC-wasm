import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const baseHeap=16777248,stackTop=16777216n;
function native(name) {
  const path=new URL('probes/'+name,import.meta.url).pathname;
  const source=readFileSync(path+'.HC'),output=readFileSync(path+'.out');
  const evidence=JSON.parse(readFileSync(path+'.native.json'));
  assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
  assert.equal(evidence.sourceSha256,hash(source));assert.equal(evidence.outputSha256,hash(output));
  return {source,output:output.toString('latin1')};
}
function build(source,exports=[]) {
  const result=compileHolyC(source,{lenient:false,exports});assert.deepEqual(result.warnings,[]);
  return {...result,module:new WebAssembly.Module(result.bytes)};
}
//A printing program is a task program, so it runs on the task host; the rest
//run on the plain host. The prelude's boot (V5.03's Adam) is __rt_init's work,
//which a task program ends at __rt_booted: boot keeps the heap and the live
//allocations it leaves to the instance.
function load(result,options={}) {
  const tasks=result.requiredCapabilities.includes('task-continuations');
  let output='';const host=(tasks?createTaskHost:createHost)({...options,jit:result.jit,onText:s=>output+=s});
  const live=new Set();let calls=0,failAt=0,boot=null,seeded=null;
  for(const name of ['__malloc','__malloc_kernel','__malloc_for']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{
      if(++calls===failAt)return 0n;
      const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
    };
  }
  const free=host.env.__free,booted=host.env.__rt_booted;
  host.env.__free=ptr=>{free(ptr);live.delete(ptr);boot?.live.delete(ptr);};
  host.env.__rt_booted=()=>{booted();boot={heapPtr:host.state.heapPtr,live:new Set(live),calls};};
  //The volume's startup ends with the seed (DirHostInit).
  const seed=host.env.__fs_seed;
  if(seed) host.env.__fs_seed=()=>{const res=seed();seeded=calls;return res;};
  const instance=new WebAssembly.Instance(result.module,{env:host.env});host.attach(instance);
  const fn=instance.exports;
  function init() {fn.__rt_init();boot??={heapPtr:host.state.heapPtr,live:new Set(live),calls};}
  return {host,fn,live,tasks,get boot(){return boot;},get added(){return live.size-(boot?.live.size??0);},
    get bootHeap(){return tasks?host.state.boot.heapPtr:boot.heapPtr;},get output(){return output;},clearOutput(){output='';},
    get calls(){return calls;},get seeded(){return seeded;},arm(at=0){calls=0;failAt=at;},
    main(){if(tasks)return host.run();init();return fn.__main();}};
}
const types=native('DirectoryTypes'),layout=load(build(types.source));await layout.main();
assert.deepEqual(layout.output.split('\n').slice(0,2),types.output.split('\n').slice(0,2));
assert.match(layout.output,/Drive:B 4096\nDrive:C 4096\nBoot:C Home:C:\/Home\n$/);
const state=native('DirectoryState'),stateResult=build(state.source,['DirHostClear']);
const paths=load(stateResult);await paths.main();assert.equal(paths.output,state.output);
paths.fn.DirHostClear();assert.equal(paths.added,0);assert.equal(paths.host.state.heapPtr,paths.bootHeap);
await paths.host.dispose();assert.equal(paths.live.size,0);assert.equal(paths.host.state.heapPtr,baseHeap);
const made=native('DirectoryMake'),make=load(build(made.source,['DirHostClear']));
await make.main();assert.equal(make.output,made.output);make.fn.DirHostClear();assert.equal(make.added,0);
await make.host.dispose();assert.equal(make.live.size,0);
const names=native('DirectoryNames'),namesResult=build(names.source),checkedNames=load(namesResult);
await checkedNames.main();assert.equal(checkedNames.output,names.output);
//A task program boots all of Adam, whose DirHostInit mounts the drives, so it
//links the seed; the name check by itself still does not.
const seeds=result=>WebAssembly.Module.imports(result.module).some(entry=>entry.name==='__fs_seed');
assert(namesResult.requiredCapabilities.includes('task-continuations'));assert(seeds(namesResult));
assert(!seeds(build('Bool Names(U8 *name){return FileNameChk(name);}',['Names'])));
await checkedNames.host.dispose();
const child=native('DirectoryTask'),childResult=build(child.source);
const family=load(childResult);let heap,allocations;
for(let i=0;i<8;i++) {
  family.clearOutput();await family.host.run();assert.equal(family.output,child.output);
  assert.equal(family.host.state.tasks.length,1);
  heap??=family.host.state.heapPtr;allocations??=family.live.size;
  assert.equal(family.host.state.heapPtr,heap);assert.equal(family.live.size,allocations);
}
assert(family.host.files().some(entry=>Buffer.from(entry.path).toString()==='B:/DirChk/Other'));
await family.host.dispose();assert.equal(family.live.size,0);assert.equal(family.host.state.heapPtr,baseHeap);
assert.throws(()=>family.host.files(),/disposed/);

const simple=build('U0 Volume(){Free(DirCur);}',['Volume','DirHostClear']);
assert.deepEqual(simple.requiredCapabilities,[]);
assert.throws(()=>new WebAssembly.Instance(simple.module,{env:createHost({heapAbi:0}).env}),WebAssembly.LinkError);
const encoded=Uint8Array.from([...Buffer.from('C:/'),128,130,255]);
const files=[{path:encoded,bytes:new Uint8Array([0,255,13,10,0])},
  {path:'C:/Foo/A',bytes:new Uint8Array([1])},{path:'C:/Foo/a',bytes:new Uint8Array([2])},
  {path:'C:/Empty',directory:true},{path:'C:/zero',bytes:new Uint8Array()},
  {path:'C:/Replace',bytes:new Uint8Array([1,2,3])},{path:'C:/Replace',bytes:new Uint8Array([4])}];
const seeded=load(simple,{files});seeded.main();
const entries=seeded.host.files(),find=name=>entries.find(entry=>Buffer.from(entry.path).toString('latin1')===name);
assert.deepEqual(entries.find(entry=>Buffer.from(entry.path).equals(encoded)).bytes,files[0].bytes);
assert.deepEqual(find('C:/Foo/A').bytes,new Uint8Array([1]));assert.deepEqual(find('C:/Foo/a').bytes,new Uint8Array([2]));
assert.deepEqual(find('C:/Replace').bytes,new Uint8Array([4]));assert.equal(find('C:/zero').bytes.length,0);
assert.equal(find('C:/Empty').directory,true);assert.equal(seeded.host.state.filesystemError,null);
const afterExport=seeded.live.size,exportHeap=seeded.host.state.heapPtr;
for(let i=0;i<10;i++){seeded.host.files();assert.equal(seeded.live.size,afterExport);assert.equal(seeded.host.state.heapPtr,exportHeap);}
seeded.arm(1);assert.throws(()=>seeded.host.files(),WebAssembly.Exception);
assert.equal(seeded.fn.__sp.value,stackTop);assert.equal(seeded.live.size,afterExport);seeded.arm();
assert.deepEqual(seeded.host.files(),entries);
// All native volume state survives a full linear-memory restore; the host keeps
// no JS path index, and the restored once guard prevents reseeding.
const image=new Uint8Array(seeded.fn.memory.buffer).slice(),cursor=seeded.host.state.heapPtr;
const restored=load(simple,{files:[{path:'INVALID',bytes:new Uint8Array()}]});
if(restored.fn.memory.buffer.byteLength<image.length)restored.fn.memory.grow((image.length-restored.fn.memory.buffer.byteLength)/65536);
new Uint8Array(restored.fn.memory.buffer).set(image);restored.host.state.heapPtr=cursor;
restored.fn.__rt_init();assert.deepEqual(restored.host.files(),entries);
//The image holds seeded's boot, so its clear goes no higher than seeded's boot left.
restored.fn.DirHostClear();assert(restored.host.state.heapPtr<=seeded.bootHeap);
//The volume is all this program's boot keeps, so its clear leaves the empty heap.
seeded.fn.DirHostClear();assert.equal(seeded.added,0);assert.equal(seeded.host.state.heapPtr,baseHeap);

const invalid=[[],['relative'],['C://double'],['C:/..'],['C:/bad\0name'],['C:/'+'n'.repeat(38)],
 ['C:/'+'n'.repeat(4096)],['C:/snowman\u2603'],['C:/Folder/File','C:/Folder/File/Child'],
 ['C:/Same','C:/Same',true]];
for(const paths of invalid.slice(1)) {
  const entries=paths.filter(p=>typeof p==='string').map(path=>({path,bytes:new Uint8Array([3])}));
  if(paths.at(-1)===true)entries[1]={path:paths[1],directory:true};
  const bad=load(simple,{files:entries});assert.throws(()=>bad.fn.__main(),WebAssembly.Exception);
  assert.equal(bad.live.size,0);assert.equal(bad.fn.__sp.value,stackTop);
  assert.throws(()=>bad.fn.__main(),/fresh.*instance/);
}
// Fail every startup allocation, including seed copies and native node/data
// publication. The volume is the boot's first work (DirHostInit), so each
// failure in it releases the complete partial volume. A failure in the rest of
// the boot (V5.03's Adam after its drives) leaves the volume it built intact.
// A program boots only the Adam it reaches, so this one reaches Win.HC, whose
// boot (winmgr.t's CAlloc) comes after the drives.
const later=build('U0 Volume(){Free(DirCur);} I64 IdleCnt(){return winmgr.t->calc_idle_cnt;}',
  ['Volume','DirHostClear','IdleCnt']);
assert.deepEqual(later.requiredCapabilities,[]);
const counted=load(later,{files});counted.main();
const startupSites=counted.calls,volumeSites=counted.seeded,volume=counted.host.files();
assert(volumeSites>0 && volumeSites<startupSites);assert.equal(counted.boot.calls,startupSites);
counted.fn.DirHostClear();
for(let at=1;at<=startupSites;at++) {
  const bad=load(later,{files});bad.arm(at);
  assert.throws(()=>bad.fn.__main(),WebAssembly.Exception,`startup allocation ${at}`);
  if(at<=volumeSites) assert.equal(bad.live.size,0,`startup allocation ${at}`);
  else {bad.arm();assert.deepEqual(bad.host.files(),volume,`startup allocation ${at}`);}
  assert.equal(bad.fn.__sp.value,stackTop);bad.arm();
  assert.throws(()=>bad.fn.__main(),/fresh.*instance/);
}
for(const source of ['"%s",Fs->cur_dir;','CTask *ptr=Fs; "%s",ptr->cur_dir;']) {
  const direct=load(build(source));await direct.main();assert.equal(direct.output,'/Home');await direct.host.dispose();
}
const unused=build('I64 Value(){return 42;}',['Value']);
assert(!WebAssembly.Module.imports(unused.module).some(entry=>entry.name==='__fs_seed'));
assert(!WebAssembly.Module.exports(unused.module).some(entry=>entry.name==='DirHostSeed'));
console.log(`Virtual directories: native layouts/paths and eight child/session repeats match; exact binary paths/data, RAM restore, export failure and ${startupSites} startup allocation failures (${volumeSites} in the volume) pass.`);
