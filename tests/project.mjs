import assert from "node:assert/strict";
import {compileProject} from "../src/project.js";
import {createHost} from "../src/runtime/host.js";

const entry='C:/Home/Test/Main.HC';
const program={filename:entry,source:'#define ENABLED 1\n#include "a/Load.HC"\n#include "b/Load.HC"\nI64 answer=First+Second;\n',files:[
  {path:'C:/Home/Test/a/Load.HC',source:'#ifdef ENABLED\n#include "../shared"\nI64 First(){return SHARED;}\n#endif\n'},
  {path:'C:/Home/Test/b/Load.HC',source:'I64 Second(){return SHARED+2;}\n'},
  {path:'C:/Home/Test/Shared.HH',source:'#define SHARED 20\n'},
]};
const result=compileProject(program),host=createHost({onText(){}});
const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});host.attach(instance);instance.exports.__main();
assert.equal(new DataView(instance.exports.memory.buffer).getBigInt64(Number(result.globals.get('answer').addr),true),42n);
assert.throws(()=>compileProject({...program,source:'#include "Missing.HC"\n'}),/include not in this project/);
assert.throws(()=>compileProject({...program,source:'NotANativeAPI();'}),/NotANativeAPI/);
assert.throws(()=>compileProject({...program,source:'I64 Broken( {'}),/parse error: expected type/);

console.log("Project compilation: nested includes, shared macros and strict failures passed.");
