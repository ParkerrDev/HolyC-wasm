import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

const extra=Array.from({length:200},(_,i)=>String(i+1)).join(",");
const source=`import I64 Join(I64 base=7,...);
I64 (*join)(I64 base=7,...)=&Join;
I64 Sum(I64 base=0,...)
{
  I64 i;
  for (i=0;i<argc;i++) base+=argv[i];
  return base;
}
I64 Fail(...)
{
  U8 buffer[13];
  buffer[0]=argv[0];
  throw(buffer[0]);
}
I64 (*fail)(...)=&Fail;
I64 Recover(I64 n)
{
  I64 res=0;
  try {
    Sum(8,3,fail(n,2.5,1));
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return Sum(0,res,Sum(1,2,3));
}
I64 Call()
{
  return join(,3,4)+Join(1,2,3)+Sum(0,${extra});
}`;
const result=compileHolyC(source,{lenient:false,exports:["Call","Recover"]});
let fn;
const host=createHost({onText:()=>{}});
host.env.Join=(base,args)=>{
  const memory=new BigInt64Array(fn.memory.buffer),p=Number(args)/8,
    count=Number(memory[p]);
  return memory.slice(p+1,p+1+count).reduce((sum,value)=>sum+value,base);
};
const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
fn=instance.exports;host.attach(instance);fn.__main();
const stack=fn.__sp.value;
assert.equal(fn.Call(),20120n);
assert.equal(fn.__sp.value,stack,"ordinary variadic returns must restore the stack");
for (let i=0;i<10000;i++) {
  assert.equal(fn.Recover(BigInt(i%127)),BigInt(i%127+6));
  assert.equal(fn.__sp.value,stack,"variadic exceptions must restore abandoned argument blocks");
}
assert.throws(()=>compileHolyC("I64 F(...) {return argc;} F(1,,3);",{lenient:false}),
  /Missing variable argument/);
console.log("Variadic calls: imported callbacks/defaults, 200 arguments and 10,000 throws preserve values and the shadow stack.");
