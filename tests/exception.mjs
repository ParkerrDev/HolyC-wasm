import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

const source=readFileSync(new URL("v503/Exception.HC",import.meta.url));
const result=compileHolyC(source,{lenient:false,exports:["Safe","Leaf"]});
const host=createHost({ansi:false,onText:()=>{}});
const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
host.attach(instance);
const fn=instance.exports;
fn.__main();
const stack=fn.__sp.value;
for (let i=0;i<10000;i++) {
  assert.equal(fn.Safe(BigInt(i)),BigInt(i));
  assert.equal(fn.__sp.value,stack,"caught exception must release abandoned frames");
}
assert.throws(()=>fn.Leaf(73n),error=>error instanceof WebAssembly.Exception &&
  error.is(fn.__exception_tag) && error.getArg(fn.__exception_tag,0)===73n);
console.log("Exceptions: 10,000 cross-call/callback throws restore the shadow stack; uncaught code reaches the host.");
