import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

async function Instance(source,imports={})
{
  const result=compileHolyC(source,{lenient:false,exports:["Call"]});
  assert(WebAssembly.validate(result.bytes));
  const host=createHost({ansi:false}),{instance}=await WebAssembly.instantiate(
    result.bytes,{env:{...host.env,...imports}});
  host.attach(instance);
  instance.exports.__main();
  return instance;
}

const linked=await Instance(`import I64 Triple(I64 n);
I64 (*cb)(I64)=&Triple;
I64 Call() {return cb(7);}`,{Triple:n=>3n*n});
assert.equal(linked.exports.Call(),21n);
assert.equal(linked.exports.__functions.get(0),null);
assert.equal(linked.exports.__functions.length,2);
const empty=await Instance("I64 (*cb)(I64); I64 Call() {return cb(1);}");
assert.throws(()=>empty.exports.Call(),WebAssembly.RuntimeError);
console.log("Callbacks: imported target links, address zero stays null, null call traps.");
