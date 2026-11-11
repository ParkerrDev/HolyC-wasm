import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

const source=`U8 text[3001];
I64 format_error=0;
U8 *Build()
{
  I64 i;
  U8 *res=NULL;
  for (i=0;i<3000;i++) text[i]=i%2+'a';
  text[3000]=0;
  format_error=0;
  try res=MStrPrint("%Q|%q|%s|%04d",text,text,text,123);
  catch {
    format_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}
I64 Error() {return format_error;}
I64 Unsupported(U8 *fmt)
{
  I64 res=0;
  try {
    U8 *s=MStrPrint(fmt,0);
    Free(s);
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}
U0 Transform(CDC *dc,I64 *x,I64 *y,I64 *z)
{
  throw('DrawFail');
}
I64 DrawFail()
{
  I64 res=0;
  gr.dc->flags|=DCF_TRANSFORMATION;
  gr.dc->transform=&Transform;
  try GrPrint3(gr.dc,0,0,0,"%s",text);
  catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}`;
const compiled=compileHolyC(source,{lenient:false,
  exports:["Build","Error","Unsupported","DrawFail","Free","MAlloc","MSize","StrLen"]});
let calls=0,failAt=0;
const host=createHost({onText:()=>{}}),malloc=host.env.__malloc;
host.env.__malloc=size=>++calls===failAt?0n:malloc(size);
const {instance}=await WebAssembly.instantiate(compiled.bytes,{env:host.env});
const fn=instance.exports;host.attach(instance);fn.__rt_init();
let ptr=fn.Build();assert.notEqual(ptr,0n);assert.equal(fn.StrLen(ptr),9007n);
const allocations=calls;fn.Free(ptr);
const heap=host.state.heapPtr,stack=fn.__sp.value;
assert.ok(allocations>4,"exercise temporary growth, quoted strings and final copy");
for (let i=1;i<=allocations;i++) {
  calls=0;failAt=i;
  assert.equal(fn.Build(),0n,`allocation ${i} should fail`);
  assert.equal(fn.Error(),0x6D654D74754Fn);
  assert.equal(host.state.heapPtr,heap,`allocation ${i} must release every owned buffer`);
  assert.equal(fn.__sp.value,stack);
  failAt=0;ptr=fn.Build();assert.notEqual(ptr,0n);fn.Free(ptr);
  assert.equal(host.state.heapPtr,heap,"a retry must succeed without leaking");
}
assert.equal(fn.DrawFail(),0x6C69614677617244n);
assert.equal(host.state.heapPtr,heap,"failed drawing must free its formatted text");
assert.equal(fn.__sp.value,stack);
for (const format of ["%F","%D","%T","%S","%Z","%p","%P"]) {
  ptr=fn.MAlloc(8n,0n);
  new Uint8Array(fn.memory.buffer,Number(ptr),3).set([37,format.charCodeAt(1),0]);
  assert.equal(fn.Unsupported(ptr),0x74736F48746D46n,`${format} must report missing OS services`);
  fn.Free(ptr);assert.equal(host.state.heapPtr,heap);
}
assert.equal(fn.MSize(0n),0n);
for (const size of [0,1,15,16,17,257,65539]) {
  ptr=fn.MAlloc(BigInt(size),0n);
  assert.ok(fn.MSize(ptr)>=BigInt(size));
  fn.Free(ptr);
  assert.throws(()=>fn.MSize(ptr),/Invalid or already freed/);
}
console.log(`Native formatting: all ${allocations} allocation failure positions clean up and recover; draw failures, OS-format errors and allocation sizes pass.`);
