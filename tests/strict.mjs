import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";

const compile=(source,opts={})=>compileHolyC(source,{lenient:false,...opts});
assert.throws(()=>compile("asm { NOP }"),/x86 assembly is not supported/);
assert.throws(()=>compile("U0 F() { asm { NOP } }"),/x86 assembly is not supported/);
assert.throws(()=>compile("I64 Missing(); Missing;"),/Unresolved function/);
assert.throws(()=>compile("I64 Missing(); I64 p=&Missing;"),/Unresolved function/);
assert.throws(()=>compile("I64 Missing();",{exports:["Missing"]}),/Unresolved exported function/);
const unused=compile("I64 Missing();");
assert(WebAssembly.validate(unused.bytes));
assert.deepEqual(unused.warnings,[],"an unused prototype is allowed");
const label=compile("U0 F() { unused: return; } F;");
assert(label.warnings.some(message=>message.includes("Unused label")));
assert(WebAssembly.validate(label.bytes));
assert.throws(()=>compile("U32 class Tiny {U8 a;}; Tiny x;"),
  /different layout and storage width/);
console.log("Strict compilation rejects unsupported assembly, unresolved calls and mismatched scalar layouts.");
