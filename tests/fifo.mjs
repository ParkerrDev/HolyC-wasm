import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const trial=compileHolyC(`
I64 Trial(I64 wide) {
  I64 error=0;
  CFifoU8 *bytes=NULL;
  CFifoI64 *ints=NULL;
  try {
    if(wide) {ints=FifoI64New(16);FifoI64Del(ints);}
    else {bytes=FifoU8New(16);FifoU8Del(bytes);}
  } catch {error=Fs->except_ch;Fs->catch_except=TRUE;}
  return error;
}`,{lenient:false,exports:['Trial']});
assert.deepEqual(trial.warnings,[]);assert.deepEqual(trial.requiredCapabilities,[]);
const host=createHost(),original=host.env.__malloc;
let at=0,failAt=0;
host.env.__malloc=size=>++at===failAt?0n:original(size);
const instance=new WebAssembly.Instance(new WebAssembly.Module(trial.bytes),{env:host.env});host.attach(instance);instance.exports.__rt_init();
instance.exports.Trial(0n);
const baseline=host.state.heapPtr,stack=instance.exports.__sp.value;
for(let repeat=0;repeat<100;repeat++) for(const wide of [0n,1n]) for(const fail of [0,1,2,0]) {
  at=0;failAt=fail;
  assert.equal(instance.exports.Trial(wide),fail?0x6D654D74754Fn:0n);
  assert.equal(host.state.heapPtr,baseline);assert.equal(instance.exports.__sp.value,stack);
}
const bridge=compileHolyC(`
I64 QueueCount() {if(kbd.scan_code_fifo) return FifoI64Cnt(kbd.scan_code_fifo);return 0;}
I64 KeyCount() {return kbd.cnt;}
U0 Focus(Bool value) {if(value)sys_focus_task=TaskHostRoot;else sys_focus_task=NULL;}
I64 Drain() {return KbdMsgsQue;}
I64 Read(I64 *ch,I64 *sc) {return ScanMsg(ch,sc);}
U0 Wait() {while(TRUE)Sleep(1);}
`,{lenient:false,exports:['QueueCount','KeyCount','Focus','Drain','Read','Wait']});
const runtime=createTaskHost(),alloc=runtime.env.__malloc;
let attempts=0,broken=0;
runtime.env.__malloc=size=>++attempts===broken?0n:alloc(size);
const target=new WebAssembly.Instance(new WebAssembly.Module(bridge.bytes),{env:runtime.env});runtime.attach(target);
const running=runtime.run('Wait');
const deadline=setTimeout(()=>{throw new Error('FIFO keyboard test did not settle');},15000);
while(runtime.state.tasks[0].status!=='waiting') await new Promise(resolve=>setTimeout(resolve,1));
const seed=runtime.env.__malloc(1n);runtime.env.__free(seed);
for(const fail of [1,2]) {
  attempts=0;broken=fail;
  assert.throws(()=>runtime.keyBytes([0x1E]),WebAssembly.Exception);
  assert.equal(target.exports.KeyCount(),0n,'failed lazy construction precedes key state changes');
  assert.equal(runtime.state.heapPtr,16777248);assert.equal(runtime.state.tasks[0].allocations,0);
}
broken=0;target.exports.Focus(0n);
runtime.keyBytes([0x1E]);runtime.keyBytes([0x9E]);
assert.equal(target.exports.QueueCount(),2n);assert.equal(target.exports.Drain(),0n);
target.exports.Focus(1n);assert.equal(target.exports.Drain(),3n);assert.equal(target.exports.QueueCount(),0n);
const pointer=runtime.env.__malloc(16n),memory=new DataView(target.exports.memory.buffer);
assert.equal(target.exports.Read(pointer,pointer+8n),2n);
assert.equal(memory.getBigInt64(Number(pointer),true),97n);
assert.equal(memory.getBigInt64(Number(pointer+8n),true),0x1E0000001En);
assert.equal(target.exports.Read(pointer,pointer+8n),3n);
assert.equal(memory.getBigInt64(Number(pointer+8n),true),0x11E0000011En);
runtime.env.__free(pointer);
target.exports.Focus(0n);runtime.keyBytes([0x1E]);assert.equal(target.exports.QueueCount(),1n);
runtime.resetInput();target.exports.Focus(1n);target.exports.Drain();
// Reset discarded the pending down; at most its synthetic release remains.
const out=runtime.env.__malloc(16n);assert.notEqual(target.exports.Read(out,out+8n),2n);runtime.env.__free(out);
await runtime.stop();await running;await runtime.dispose();assert.equal(runtime.state.heapPtr,16777248);
clearTimeout(deadline);
console.log('FIFO: both constructors recover from all allocation sites; lazy keyboard queues retain focus-less scans and reset discards stale downs without leaks.');
