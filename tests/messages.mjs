import {heapUsed} from './heap-used.mjs';
import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';

const result=compileHolyC(`
I64 Post(I64 code) {
  I64 res=0;
  try {Msg(code,65,SCF_KEY_DESC);}
  catch {res=Fs->except_ch;Fs->catch_except=TRUE;}
  return res;
}
I64 Read(I64 inhibit) {
  Fs->win_inhibit=inhibit;
  return ScanMsg;
}
I64 Count() {return QueCnt(&Fs->srv_ctrl.next_waiting);}
I64 Done() {return QueCnt(&Fs->srv_ctrl.next_done);}
I64 Drain() {return FlushMsgs;}
U0 Other() {
  CJob *job=CAlloc(sizeof(CJob));
  job->job_code=JOBT_EXE_STR;
  job->aux_str=StrNew("owned");
  QueIns(job,Fs->srv_ctrl.last_waiting);
}
I64 Unsupported() {
  I64 res=0;
  try {ScanMsg;}
  catch {res=Fs->except_ch;Fs->catch_except=TRUE;}
  return res;
}
U0 Clear() {JobQueDel(&Fs->srv_ctrl.next_waiting);JobQueDel(&Fs->srv_ctrl.next_done);}
`,{lenient:false,exports:['Post','Read','Count','Done','Drain','Other','Unsupported','Clear']});
let count=0,failAt=0;
const live=new Set(),host=createTaskHost({jit:result.jit}),{__malloc:malloc,__free:free,__msize:size}=host.env;
host.env.__malloc=(bytes,hc)=>{
  if (++count===failAt) return 0n;
  const ptr=malloc(bytes,hc);if(ptr) live.add(ptr);return ptr;
};
host.env.__malloc_kernel=host.env.__malloc;
host.env.__free=ptr=>{
  const length=Number(size(ptr));free(ptr);live.delete(ptr);
  if(ptr) new Uint8Array(host.state.mem.buffer,Number(ptr),length).fill(0xA5);
};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
host.attach(instance);const fn=instance.exports;await host.run();live.clear(); //The root task the exports run on, and what it keeps.
fn.Post(-2n);fn.Drain();
const base=heapUsed(host),stack=fn.__sp.value;
const code=text=>Buffer.from(text).reduce((value,byte,index)=>value|(BigInt(byte)<<BigInt(index*8)),0n);
for (let failure=1;failure<=2;failure++) {
  count=0;failAt=failure;
  assert.equal(fn.Post(-2n),code('OutMem'));
  assert.equal(fn.Count(),BigInt(failure-1));
  assert.equal(fn.Drain(),BigInt(failure-1));
  assert.equal(live.size,0);assert.equal(heapUsed(host),base);
  assert.equal(fn.__sp.value,stack);failAt=0;
  assert.equal(fn.Post(-2n),0n);assert.equal(fn.Drain(),2n);
}
for(let i=0;i<1000;i++) {
  fn.Post(2n);assert.equal(fn.Read(0x1000n),0n,'key-description filter survives poisoned freed node');
  fn.Post(2n);assert.equal(fn.Read(0n),2n);
  assert.equal(live.size,0);assert.equal(heapUsed(host),base);
}
//V5.03 ScanMsg runs a queued job as JobsHndlr does; the text's compile error
//is caught in JobRunOne, which puts the job on the done queue.
fn.Other();assert.equal(await host.run('Unsupported'),0n);
assert.equal(fn.Count(),0n,'the executable job ran and left the queue');assert.equal(fn.Done(),1n);
fn.Clear();assert.equal(live.size,0);assert.equal(heapUsed(host),base);
assert.equal(fn.__sp.value,stack);await host.dispose();
console.log('Messages: both down/up allocation failures recover; 2,000 poisoned-node removals preserve queue, heap and stack; a queued job runs.');
