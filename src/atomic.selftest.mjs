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
for(const sharedMemory of [false,true])for(const bits of [8,16,32,64]){
 const result=compileHolyC(`U64 value=0xFEDCBA9876543210;
 U64 Read(I64 p){return __a_load${bits}(p);}
 U0 Store(I64 p,U64 n){__a_store${bits}(p,n);}`,{lenient:false,sharedMemory,exports:['Read','Store']});
 const host=createHost();if(sharedMemory)host.env.mem=new WebAssembly.Memory({initial:512,maximum:8192,shared:true});
 const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});host.attach(instance);instance.exports.__rt_init();
 const {Read,Store,memory}=instance.exports,addr=BigInt(result.globals.get('value').addr);
 const mask=(1n<<BigInt(bits))-1n,initial=0xFEDCBA9876543210n,replacement=0x123456789ABCDEF0n;
 assert.equal(BigInt.asUintN(64,Read(addr)),initial&mask);
 assert.equal(Store(addr,replacement),undefined);
 assert.equal(BigInt.asUintN(64,Read(addr)),replacement&mask);
 assert.equal(new DataView(memory.buffer).getBigUint64(Number(addr),true),(initial&~mask)|(replacement&mask));
 if(bits>8){assert.throws(()=>Read(addr+1n),WebAssembly.RuntimeError);assert.throws(()=>Store(addr+1n,0n),WebAssembly.RuntimeError);}
 assert.throws(()=>Read(BigInt(memory.buffer.byteLength)),WebAssembly.RuntimeError);
}
for(const call of ['__a_load32(0,1)','__a_store32(0)','__a_store64(0,,1)','__a_cmpxchg64(0,1)'])
 assert.throws(()=>compileHolyC(call+';',{lenient:false}),/requires .* arguments/);
console.log('Atomic loads/stores: all widths preserve adjacent bytes; narrow reads zero-extend, stores return U0, bounds/alignment and arity are enforced.');
