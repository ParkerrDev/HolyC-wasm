import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost,taskSupport} from '../src/runtime/tasks.js';

assert(taskSupport(),'task tests require actual JSPI, not a simulated Spawn');
const deadline=setTimeout(()=>{throw new Error('HolyC task checks did not settle');},20000);
function compiled(source,options={}) {
  const result=compileHolyC(source,{lenient:false,...options});
  assert.deepEqual(result.warnings,[]);return {...result,module:new WebAssembly.Module(result.bytes)};
}
function load(result,options={}) {
  const host=createTaskHost(options),instance=new WebAssembly.Instance(result.module,{env:host.env});
  host.attach(instance);return {host,instance,fn:instance.exports};
}
const starter=compiled('import I64 Side(); I64 effect=Side; U0 Child(U8 *) {Yield;} Spawn(&Child);');
assert.deepEqual(starter.requiredCapabilities,['task-continuations']);
for(const host of [createHost(),createTaskHost({webAssembly:{}})]) {
  let effects=0;host.env.Side=()=>{effects++;return 1n;};
  assert.throws(()=>new WebAssembly.Instance(starter.module,{env:host.env}),/continuation|JSPI/);
  assert.equal(effects,0,'capability check precedes source initializers and main');
}
const unused=compiled('U0 Child(U8 *) {Yield;} U0 Unused() {Spawn(&Child);}');
assert.deepEqual(unused.requiredCapabilities,[]);
assert(!WebAssembly.Module.imports(unused.module).some(entry=>entry.name.startsWith('__task_')));

const nativeSource=readFileSync(new URL('v503/Tasks.HC',import.meta.url));
let output='';
const fixture=load(compiled(nativeSource),{ansi:false,onText:text=>output+=text});
const expected=readFileSync(new URL('v503/Tasks.out',import.meta.url),'latin1');
for(let repeat=0;repeat<10;repeat++) {
  output='';await fixture.host.run();assert.equal(output,expected);
  assert.deepEqual(fixture.host.state.tasks.map(task=>[task.status,task.allocations]),[['dead',0]]);
  assert.equal(fixture.host.state.heapPtr,16777248);
  assert.equal(fixture.fn.__sp.value,16777216n);
}
assert.throws(()=>fixture.host.snapshot(),/cannot be serialized/);await fixture.host.dispose();

// Kernel-owned messages survive the sender's heap cleanup, including a delayed receiver.
const posted=load(compiled(`
U0 Sender(U8 *) {PostMsg(Fs->parent_task,MSG_CMD,42,73);}
I64 Result() {
  I64 a,b;
  CTask *child=Spawn(&Sender,,,,Fs);
  while(TaskValidate(child)) Yield;
  GetMsg(&a,&b,1<<MSG_CMD);
  return a*100+b;
}
`,{exports:['Result']}));
assert.equal(await posted.host.run('Result'),4273n);
assert.equal(posted.host.state.heapPtr,16777248);await posted.host.dispose();

// GetKey consumes a zero-character key-down and preserves all 64 scan bits.
const inputResult=compiled('I64 scan=0; I64 Input() {return GetKey(&scan);}',{exports:['Input']});
const input=load(inputResult);
const waiting=input.host.run('Input');
assert(input.host.postMessage(3,99,1));
assert(input.host.postMessage(2,0,0x123456788000004Bn));
assert.equal(await waiting,0n);
assert.equal(new DataView(input.fn.memory.buffer).getBigUint64(inputResult.globals.get('scan').addr,true),0x123456788000004Bn);
await input.host.dispose();

// A caught Spawn allocation failure releases its partially built task before retry.
const failureResult=compiled(`
U0 Idle(U8 *) {while(TRUE) Sleep(1);}
I64 Trial() {
  CTask *child=NULL;
  I64 error=0;
  try {child=Spawn(&Idle,,,,Fs);}
  catch {error=Fs->except_ch;Fs->catch_except=TRUE;}
  if(child) Kill(child);
  return error;
}
`,{exports:['Trial']});
const failures=load(failureResult),original=failures.host.env.__malloc;
// Reinstantiate after installing the import fault injector.
let calls=0,failAt=0;
failures.host.env.__malloc=size=>++calls===failAt?0n:original(size);
const failInstance=new WebAssembly.Instance(failureResult.module,{env:failures.host.env});failures.host.attach(failInstance);
for(const fail of [0,1,2,0,1,2,0]) {
  calls=0;failAt=fail;
  assert.equal(await failures.host.run('Trial'),fail?0x6D654D74754Fn:0n);
  assert.equal(failures.host.state.tasks.length,1);
  assert.equal(failures.host.state.tasks[0].allocations,0);
  assert.equal(failures.host.state.heapPtr,16777248);
}
await failures.host.dispose();

// Child stack bounds trap before writing into another allocation.
const errors=[];
const overflow=load(compiled(`
U0 Deep(I64 depth) {
  I64 local[128];
  MemSet(local,depth,sizeof(local));
  if(depth) Deep(depth-1);
  if(local[0]==-1) "impossible";
}
U0 Child(U8 *) {Deep(20);}
I64 Test() {
  U8 *canary=MAlloc(4096);
  CTask *child;
  I64 i,res=0;
  MemSet(canary,0x5A,4096);
  child=Spawn(&Child,,,,Fs,4096);
  while(TaskValidate(child)) Yield;
  for(i=0;i<4096;i++) if(canary[i]!=0x5A) res++;
  Free(canary);return res;
}
`,{exports:['Test']}),{onTaskError:error=>errors.push(error)});
assert.equal(await overflow.host.run('Test'),0n);
assert.equal(errors.length,1);assert.match(errors[0].message,/shadow stack overflow/);
assert.equal(overflow.host.state.heapPtr,16777248);await overflow.host.dispose();
// A cleanup catch may suspend while another task throws; its exception value is task-local.
const exceptSource=readFileSync(new URL('v503/TaskExcept.HC',import.meta.url),'latin1')
  .replace(/TaskExcept;\s*$/,'Spawn(&ExceptChild,,,,Fs);ExceptWrap;');
const exceptTask=load(compiled(exceptSource));
const parentCode=0x746E65726150n;
const parentError=error=>error instanceof WebAssembly.Exception &&
  error.is(exceptTask.fn.__exception_tag) && error.getArg(exceptTask.fn.__exception_tag,0)===parentCode;
await assert.rejects(exceptTask.host.run(),parentError);
await assert.rejects(exceptTask.host.dispose(),parentError);
assert.equal(exceptTask.host.state.heapPtr,16777248);

// Parent-owned allocations survive a child; child-owned allocations die with it.
const ownership=load(compiled(`
U0 Sender(U8 *) {
  I64 a,b,*data;
  GetMsg(&a,&b,1<<MSG_CMD);
  if (*a(I64 *)!=19) throw('Owner');
  data=MAlloc(8,Fs->parent_task);*data=73;
  PostMsg(Fs->parent_task,MSG_CMD,data,0);
}
I64 Ownership() {
  I64 *data,a,b,res;
  CTask *child=Spawn(&Sender,,,,Fs);
  data=MAlloc(8,child);*data=19;
  PostMsg(child,MSG_CMD,data,0);
  while(TaskValidate(child)) Yield;
  GetMsg(&a,&b,1<<MSG_CMD);data=a;
  res=*data;Free(data);return res;
}
`,{exports:['Ownership']}));
assert.equal(await ownership.host.run('Ownership'),73n);
assert.equal(ownership.host.state.heapPtr,16777248);await ownership.host.dispose();

const stopped=load(compiled(`
U0 Grand(U8 *) {MAlloc(123);while(TRUE) Sleep(1);}
U0 Child(U8 *) {Spawn(&Grand,,,,Fs);MAlloc(456);while(TRUE) Sleep(1);}
Spawn(&Child,,,,Fs);
GetMsg;
`));
const running=stopped.host.run();
await new Promise(resolve=>setTimeout(resolve,20));
assert.equal(stopped.host.state.tasks.length,3);
await stopped.host.stop();await running;
assert.equal(stopped.host.state.tasks.length,1);
assert.equal(stopped.host.state.heapPtr,16777248);await stopped.host.dispose();

const failed=load(compiled('U0 Child(U8 *) {while(TRUE) Sleep(1);} Spawn(&Child,,,,Fs);MAlloc(97);Sleep(1);throw(73);'));
await assert.rejects(failed.host.run(),WebAssembly.Exception);
await assert.rejects(failed.host.dispose(),WebAssembly.Exception);
assert.equal(failed.host.state.heapPtr,16777248,'teardown releases allocations even after a root exception');

console.log('Tasks: ten native lifecycle repeats, capability refusal, ownership, 64-bit keys, allocation failures, stack guards, cross-task exceptions and nested cancellation pass.');
clearTimeout(deadline);
