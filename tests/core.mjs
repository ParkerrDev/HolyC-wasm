import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

async function build(source,options={}) {
  const result=compileHolyC(source,{lenient:false,...options});
  const host=createHost();
  const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
  host.attach(instance);instance.exports.__rt_init();return instance.exports;
}
const core=await build(`I64 Bare(){return MyCore;}
I64 Explicit(){return MyCore();}`,{exports:["Bare","Explicit"]});
for(let i=0n;i<4n;i++) {
  core.__core.value=i;
  for(const fn of ["Bare","Explicit"]) assert.equal(core[fn](),i);
}
assert.throws(()=>compileHolyC("I64 (*core)();core=&MyCore;",{lenient:false}),/cannot address undefined/);
for(const noPrelude of [false,true]) {
  const user=await build(`I64 MyCore(){return 3;}
I64 Bare(){return MyCore;}
I64 Explicit(){return MyCore();}
I64 Pointer(){I64 (*f)();f=&MyCore;return (*f)();}`,{noPrelude,exports:["Bare","Explicit","Pointer"]});
  for(const fn of ["Bare","Explicit","Pointer"]) assert.equal(user[fn](),3n);
}
console.log("MyCore: bare/explicit custom intrinsic calls, four core IDs, address rejection and user overrides pass.");
