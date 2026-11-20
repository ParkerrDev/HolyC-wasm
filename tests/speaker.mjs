import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

//V5.03 Snd's PIT writes reach the host speaker; the timer IRQ hook runs once a jiffy.
const tones=[],result=compileHolyC(`I64 irqs=0;
U0 Irq(CTask *) {irqs++;}
U0 Tone(I64 period) {OutU8(0x43,0xB6);OutU8(0x42,period);OutU8(0x42,period.u8[1]);
  OutU8(0x61,3|InU8(0x61));}
U0 Off() {OutU8(0x61,InU8(0x61)&~3);}
I64 Gate() {return InU8(0x61);}
U0 Hook() {cpu_structs->profiler_timer_irq=&Irq;}
U0 Unhook() {cpu_structs->profiler_timer_irq=NULL;}
I64 Tick() {Yield;return irqs;}
I64 Jiffies() {Yield;return cnts.jiffies;}
Bool Blinks(F64 hz) {Yield;return Blink(hz);}`,{lenient:false,
  exports:["Tone","Off","Gate","Hook","Unhook","Tick","Jiffies","Blinks"]}),
  host=createHost({timeMs:()=>0,snd:{tone:freq=>tones.push(Math.round(freq))}}),
  instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}),
  e=instance.exports;
host.attach(instance);e.__rt_init();
e.Tone(1193n);
assert.deepEqual(tones,[1007],"SYS_TIMER_FREQ/1193 once the gate opens");
assert.equal(e.Gate(),3n);
e.Off();
assert.deepEqual(tones,[1007,0]);
assert.equal(e.Gate(),0n);
host.state.timeMs=()=>250.5;
assert.equal(e.Jiffies(),250n,"jiffies follow the host clock at JIFFY_FREQ");
assert.equal(e.Blinks(2.5),1n);
host.state.timeMs=()=>400;
assert.equal(e.Blinks(2.5),0n);
e.Hook();
host.state.timeMs=()=>412;
assert.equal(e.Tick(),12n,"one IRQ for each jiffy that went by");
host.state.timeMs=()=>9000;
assert.equal(e.Tick(),1012n,"a long absence is bounded to JIFFY_FREQ IRQs");
e.Unhook();
host.state.timeMs=()=>9500;
assert.equal(e.Tick(),1012n);
console.log("Speaker: PIT channel 2 and port 0x61 make the host tone, jiffies, Blink and the timer IRQ hook pass.");
