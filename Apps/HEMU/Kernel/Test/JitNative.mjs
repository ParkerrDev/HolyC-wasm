import {HemuPath} from "../Paths.js";
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {compileHolyC} from "../../../../src/compiler.js";
import {createTaskHost} from "../../../../src/runtime/tasks.js";

const file=new URL("JitNative.json",import.meta.url),root=HemuPath("Kernel/"),
  read=name=>readFileSync(new URL(name.includes(".")?name:name+".HC",root),"latin1"),
  expand=text=>text.replace(/#include "([^"]+)"/g,(_,name)=>expand(read(name))),
  source=expand(readFileSync(new URL("JitNative.HC",import.meta.url),"latin1")),
  hash=createHash("sha256").update(Buffer.from(source,"latin1")).digest("hex");
if (process.argv.includes("--record")) {
  if (!process.env.HOLYC_QEMU_ORACLE) throw Error("Set HOLYC_QEMU_ORACLE to tests/oracle/Qemu.mjs");
  const {QemuRun}=await import(pathToFileURL(process.env.HOLYC_QEMU_ORACLE)),
    result=await QemuRun([Buffer.from('Option(OPTf_WARN_PAREN,ON);\n'+source,"latin1")],{timeout:180}),
    row=result.results[0];
  assert.equal(row.except,"");assert.match(row.out,/^(?:[0-9A-F ]+\n){88}$/);
  writeFileSync(file,JSON.stringify({backend:result.backend,sourceHash:hash,out:row.out},null,2)+"\n");
  console.log("Native JIT emitter:",result.evidence);
}
const expected=JSON.parse(readFileSync(file,"utf8"));
assert.equal(hash,expected.sourceHash,"rerun native V5.03 after JIT source changes");
const compiled=compileHolyC(source,{filename:"JitNative.HC",lenient:false});
assert.deepEqual(compiled.warnings,[]);
let output="";
//Every program is a task (G5): its output reads kbd.scan_code, as V5.03's PutS.
const host=createTaskHost({jit:compiled.jit,ansi:false,onText:text=>output+=text}),
  {instance}=await WebAssembly.instantiate(compiled.bytes,{env:host.env});
host.attach(instance);
try {await host.run();} finally {await host.dispose();}
assert.equal(output,expected.out);
console.log("HolyC JIT emits matching modules natively and in WASM: 84 blocks and four dispatchers.");
