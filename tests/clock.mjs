import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

const result=compileHolyC(`I64 Tick(){return GetTSC;}
I64 OldTick(){I64 res=__time_ms()*1000000.0;return res;}
F64 Seconds(){return tS;}`,{lenient:false,exports:["Tick","OldTick","Seconds"]}),
  host=createHost({timeMs:()=>0}),
  instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
host.attach(instance);instance.exports.__rt_init();
for(const value of [0,1/3,-1/3,1234.567890123,2**32+0.125,2**40+0.25]) {
  host.state.timeMs=()=>value;
  assert.equal(instance.exports.Tick(),instance.exports.OldTick(),"Injected timeMs retains exact native product conversion");
  assert.equal(instance.exports.Seconds(),value/1000);
}
let sampled=4294967296123456n;
host.env.__tsc=()=>sampled;
const device=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
host.attach(device);device.exports.__rt_init();
assert.equal(device.exports.Tick(),sampled,"TSC uses all 64 bits without milliseconds wrapping");
sampled++;
assert.equal(device.exports.Tick(),sampled);
sampled=-1n;
assert.equal(device.exports.Tick(),device.exports.OldTick(),"A failed provider returns to fresh time");
const hello=new WebAssembly.Module(compileHolyC('I64 answer=6*7;',{lenient:false}).bytes);
assert(!WebAssembly.Module.imports(hello).some(item=>item.name==="__tsc"));
console.log("TSC: dynamic exact timeMs fallback, 64-bit sampled values, failure fallback and unused-clock elimination pass.");
