import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function recorded(name) {
  const path=new URL('probes/'+name,import.meta.url).pathname;
  const source=readFileSync(path+'.HC'),out=readFileSync(path+'.out');
  const proof=JSON.parse(readFileSync(path+'.native.json'));
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.except,'');
  assert.equal(proof.sourceSha256,hash(source));assert.equal(proof.outputSha256,hash(out));
  return {source,output:out.toString('latin1')};
}
function build(source,exports=[]) {
  const result=compileHolyC(source,{lenient:false,exports});
  assert.deepEqual(result.warnings,[]);return {...result,module:new WebAssembly.Module(result.bytes)};
}
//A printing program is a task program, so it runs on the task host; the rest
//run on the plain host. The prelude's boot (V5.03's Adam) is __rt_init's work,
//which a task program ends at __rt_booted: boot keeps the live allocations it
//leaves to the instance.
function load(result,options={}) {
  const tasks=result.requiredCapabilities.includes('task-continuations');
  let output='',calls=0,failAt=0,boot=null;
  const host=(tasks?createTaskHost:createHost)({...options,jit:result.jit,onText:s=>output+=s}),live=new Set();
  for(const name of ['__malloc','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{
      if(++calls===failAt)return 0n;
      const ptr=alloc(...args);if(ptr)live.add(ptr);return ptr;
    };
  }
  const free=host.env.__free,booted=host.env.__rt_booted;
  host.env.__free=ptr=>{free(ptr);live.delete(ptr);boot?.delete(ptr);};
  host.env.__rt_booted=()=>{booted();boot=new Set(live);};
  const instance=new WebAssembly.Instance(result.module,{env:host.env});host.attach(instance);
  const fn=instance.exports;
  //Boot alone: a task program runs its empty main on the root task.
  function init() {
    if(tasks) return host.run();
    fn.__rt_init();boot??=new Set(live);
  }
  return {host,fn,live,tasks,init,get added(){return live.size-(boot?.size??0);},
    get output(){return output;},clear(){output='';},
    get calls(){return calls;},arm(at=0){calls=0;failAt=at;},
    main(){if(tasks)return host.run();init();return fn.__main();}};
}
for(const name of ['FileNames','FileState','FileDate','FileBounds','FileDirDate']) {
  const fixture=recorded(name),volume=load(build(fixture.source,['DirHostClear']));
  await volume.main();assert.equal(volume.output,fixture.output,name);
  volume.fn.DirHostClear();assert.equal(volume.added,0,name);
  if(volume.tasks) {await volume.host.dispose();assert.equal(volume.live.size,0,name);}
}
const task=recorded('FileTask'),family=load(build(task.source));assert(family.tasks);
let count;const cursors=[];
for(let i=0;i<16;i++) {
  family.clear();await family.host.run();assert.equal(family.output,task.output);
  assert.equal(family.host.state.tasks.length,1);
  cursors.push(family.host.state.heapPtr);count??=family.live.size;
  assert.equal(family.live.size,count);
}
// Replacement reserves the new data before freeing the old data, so the
// reusable slots trade places and the cursor moves among a few values: the
// later runs go no higher than the earlier ones did.
assert(Math.max(...cursors.slice(8))<=Math.max(...cursors.slice(0,8)));
const saved=family.host.files().find(f=>Buffer.from(f.path).toString()==='B:/FileTask/Data.BIN');
assert(saved);assert.deepEqual(saved.bytes,Uint8Array.from({length:777},(_,i)=>i*17&255));
await family.host.dispose();assert.equal(family.live.size,0);assert.equal(family.host.state.heapPtr,16777248);

const clock=build('CDate Read(){return Now;} F64 Tick(){return tS;} U0 Offset(I64 value){local_time_offset=value;}',
  ['Read','Tick','Offset']);
const date=Date.UTC(2024,1,15,23,59,59,999);
const time=load(clock,{dateMs:()=>date,timeMs:()=>1234});await time.init();
// The native FileDate record independently gives this date with 0.1234 seconds;
// RTC reads discard subsecond fields, so obtain the matching whole-second case
// through the recorded calendar's day and integer rational time conversion.
const nativeLine=recorded('FileDate').output.split('\n').find(line=>line.startsWith('2024:'));
const feb=BigInt('0x'+nativeLine.split(':')[3]);
const expected=(feb&~0xFFFFFFFFn)+(86399n<<32n)/86400n;
assert.equal(time.fn.Read(),expected);assert.equal(time.fn.Tick(),1.234);
for(const offset of [0x10000000n,-0x10000000n,0x100000000n]) {
  time.fn.Offset(offset);assert.equal(time.fn.Read(),expected-offset);
  assert.equal(time.fn.Tick(),1.234);
}
const oldHost=createHost();delete oldHost.env.__date_utc;
assert.throws(()=>new WebAssembly.Instance(clock.module,{env:oldHost.env}),WebAssembly.LinkError);
const invalidClock=createHost({dateMs:()=>NaN});
assert.equal(invalidClock.env.__date_utc(),-1n);assert.match(invalidClock.state.clockError.message,/UTC clock/);
const failedClock=load(build('I64 Write(){return FileWrite("C:/Bad","x",1);}',
  ['Write','DirHostClear']),{dateMs:()=>NaN});
await failedClock.init();const beforeClock=failedClock.host.files(),clockLive=failedClock.live.size;
assert.throws(()=>failedClock.fn.Write(),error=>error instanceof WebAssembly.Exception &&
  error.is(failedClock.fn.__exception_tag) && error.getArg(failedClock.fn.__exception_tag,0)===0x6B636F6C43n);
assert.equal(failedClock.fn.__sp.value,16777216n);assert.equal(failedClock.live.size,clockLive);
assert.deepEqual(failedClock.host.files(),beforeClock);
failedClock.host.state.dateMs=()=>date;assert(failedClock.fn.Write()>0n);
assert.equal(failedClock.host.state.clockError,null);failedClock.fn.DirHostClear();
assert.equal(failedClock.added,0);
if(failedClock.tasks) {await failedClock.host.dispose();assert.equal(failedClock.live.size,0);}
console.log('Files: native names, lookup/data/state and calendar probes match; sixteen child-write/read/exit sessions retain exact bytes with no owned-buffer leaks.');
