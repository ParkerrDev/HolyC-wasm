import assert from "node:assert/strict";
import {compileHemu} from "../Compile.js";
import {createHemuHost} from "../Host.js";

const NativeDate=Date,compiled=compileHemu({filename:"Boot.HC",exports:["RtcRead"]});
const module=await WebAssembly.compile(compiled.bytes);
async function Machine(saved) {
  const host=createHemuHost(),instance=await WebAssembly.instantiate(module,{env:host.env});
  host.attach(instance);instance.exports.__rt_init();
  if(saved)new Uint8Array(instance.exports.memory.buffer).set(saved);
  return instance.exports;
}
let engine=await Machine();
let now=new NativeDate(2026,11,31,23,59,59).getTime();
globalThis.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[now]));}};
try {
  const read=idx=>Number(engine.RtcRead(BigInt(idx)));
  assert.deepEqual([0,2,4].map(read),[59,59,23]);
  const saved=new Uint8Array(engine.memory.buffer).slice();
  now=new NativeDate(2027,0,1,0,0,0).getTime();
  assert.deepEqual([2,4,6,7,8,9].map(read),[59,23,4,31,12,26],
    "A midnight rollover cannot mix old seconds with a new date");
  engine=await Machine(saved);
  assert.deepEqual([6,7,8,9].map(read),[4,31,12,26],
    "Restoring halfway through a native calendar read preserves the original sample");
  assert.deepEqual([0,2,4,6,7,8,9].map(read),[0,0,0,5,1,1,27]);
  now=new NativeDate(2027,6,10,15,42,13).getTime();
  assert.deepEqual([0,2,4,6,7,8,9].map(read),[13,42,15,6,10,7,27],
    "The next guest read samples current local time after a pause or restored session");
  now=new NativeDate(2027,6,10,14,12,2).getTime();
  assert.equal(read(0),2);assert.equal(read(2),12);assert.equal(read(4),14,
    "Computer clock corrections apply without changing emulated elapsed timers");
} finally {globalThis.Date=NativeDate;}
console.log("RTC: coherent local calendar, midnight/year rollover, resume and backwards clock adjustment pass.");
