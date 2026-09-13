import assert from "node:assert/strict";
import {compileHolyC} from "./compiler.js";
import {createHost} from "./runtime/host.js";
for(const sharedMemory of [false,true])for(const bits of [8,16,32,64]){
 const result=compileHolyC(`U64 value=0xFEDCBA9876543210;U64 Flip(U64 mask){return __a_xor${bits}(&value,mask);}`,{lenient:false,sharedMemory,exports:["Flip"]});
 assert.equal(result.warnings.length,0);
 const host=createHost();if(sharedMemory)host.env.mem=new WebAssembly.Memory({initial:512,maximum:8192,shared:true});const instance=await WebAssembly.instantiate(result.bytes,{env:host.env});host.attach(instance.instance);instance.instance.exports.__rt_init();
 const limit=(1n<<BigInt(bits))-1n,mask=0x0123456789ABCDEFn&limit,initial=0xFEDCBA9876543210n;
 assert.equal(instance.instance.exports.Flip(mask)&limit,initial&limit);
 const view=new DataView(instance.instance.exports.memory.buffer),addr=Number(result.globals.get("value").addr);
 assert.equal(view.getBigUint64(addr,true),initial^mask); // Narrow operations must preserve adjacent bytes.
}
console.log("Atomic XOR: old value and updated memory match at 8/16/32/64 bits, shared and unshared.");
