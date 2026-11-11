import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

const source=`U0 Show()
{
  "$$RED$$%s$$FG$$ %c %04d\\n","hi",'abc',7;
  Print("%s","$$BLUE$$there$$FG$$");
}`;
const result=compileHolyC(source,{lenient:false,exports:["Show"]}),
  imports=WebAssembly.Module.imports(new WebAssembly.Module(result.bytes));
assert.ok(imports.some(value=>value.name==="__puts"));
assert.ok(!imports.some(value=>value.name==="__printf"));
for (const ansi of [false,true]) {
  let out="";
  const host=createHost({ansi,onText:s=>out+=s}),
    {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
  host.attach(instance);instance.exports.__rt_init();instance.exports.Show();
  assert.equal(out,ansi?"\x1b[31mhi\x1b[39m abc 0007\n\x1b[34mthere\x1b[39m":
    "hi abc 0007\nthere");
  const heap=host.state.heapPtr,stack=instance.exports.__sp.value;
  for (let i=0;i<1000;i++) instance.exports.Show();
  assert.equal(host.state.heapPtr,heap);assert.equal(instance.exports.__sp.value,stack);
}
assert.throws(()=>compileHolyC('"hello";',{noPrelude:true,lenient:false}),/Print requires/);
const explicit=compileHolyC('import U0 Print(U8 *fmt,...); "%d",7;',
  {noPrelude:true,lenient:false});
let fn,seen;
const host=createHost(),{instance}=await WebAssembly.instantiate(explicit.bytes,
  {env:{...host.env,Print:(format,args)=>{
    const memory=new BigInt64Array(fn.memory.buffer),p=Number(args)/8;
    seen=[memory[p],memory[p+1]];
  }}});
fn=instance.exports;host.attach(instance);fn.__main();
assert.deepEqual(seen,[1n,7n]);
console.log("Print shortcuts share native formatting, preserve terminal colors and release 1,000 repeated outputs; explicit no-prelude imports work.");
