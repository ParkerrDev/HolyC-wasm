import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

async function build(source,options={}) {
  const result=compileHolyC(source,{lenient:false,...options});
  const host=createHost();
  const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
  host.attach(instance);instance.exports.__rt_init();return instance.exports;
}
for(const noPrelude of [false,true]) {
  const fn=await build(`I64 F64MulToI64(F64 a,F64 b){return 7;}
I64 User(){return F64MulToI64(1.0,2.0);}
I64 Product(F64 a,F64 b){return a*b;}
I64 Staged(F64 a,F64 b){F64 c=a*b;return c;}`,{noPrelude,exports:["Product","Staged","User"]});
  assert.equal(fn.User(),7n);
  assert.equal(fn.Product(1/3,3*2**32),4294967295n);
  assert.equal(fn.Product(-1/3,3*2**32),-4294967295n);
  assert.equal(fn.Staged(1/3,3*2**32),4294967296n);
}
console.log("Native product precision survives direct integer conversion with and without the prelude.");
