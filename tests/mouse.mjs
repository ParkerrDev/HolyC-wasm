import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {compileHolyC} from "../src/compiler.js";
import {createTaskHost} from "../src/runtime/tasks.js";
const source=readFileSync(new URL("probes/MouseSet.HC",import.meta.url),"latin1"),
  output=readFileSync(new URL("probes/MouseSet.out",import.meta.url),"latin1"),
  native=JSON.parse(readFileSync(new URL("probes/MouseSet.native.json",import.meta.url))),
  hash=value=>createHash("sha256").update(value,"latin1").digest("hex");
assert.equal(native.sourceSha256,hash(source));assert.equal(native.outputSha256,hash(output));
assert.equal(native.backend.engine,"qemu");assert.equal(native.except,"");
const calls=[];let text="";
const host=createTaskHost({ansi:false,onText:value=>text+=value,setMouse:(...args)=>calls.push(args)}),
  result=compileHolyC(source,{lenient:false}),
  {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
host.attach(instance);
try {await host.run();assert.equal(text,output);
  assert.deepEqual(calls.slice(0,4),[[123,234,7,true,false],[123,234,7,true,false],
    [123,234,7,true,true],[0,0,-7,false,false]]);
} finally {await host.dispose();}
console.log("MsSet: coordinates, defaults, rejected values, button flags and host device writes match native V5.03.");
