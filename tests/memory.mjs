import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";

const source=`
I64 __memsize();
I64 Pages() {return __memsize;}
I64 Grow(I64 pages) {return __memgrow(pages);}
U0 Write(U8 *ptr,I64 value) {*ptr=value;}
I64 Read(U8 *ptr) {return *ptr;}
`;
for (const shared of [false,true]) {
  const result=compileHolyC(source,{noPrelude:true,lenient:false,
    memory:{imported:true,shared,initial:0,maximum:shared?3:null},
    exports:["Pages","Grow","Write","Read"]});
  const memory=new WebAssembly.Memory({initial:1,maximum:3,shared});
  const module=new WebAssembly.Module(result.bytes);
  assert.deepEqual(WebAssembly.Module.imports(module),[
    {module:"env",name:"mem",kind:"memory"}]);
  const fn=new WebAssembly.Instance(module,{env:{mem:memory}}).exports;
  assert.equal(fn.memory,memory);
  assert.equal(fn.Pages(),1n);
  fn.Write(65535n,119n);
  assert.equal(fn.Grow(1n),1n);
  assert.equal(fn.Pages(),2n);
  assert.equal(fn.Read(65535n),119n);
  assert.equal(fn.Read(65536n),0n);
  for (const size of [-1n,65537n,0x100000001n]) {
    assert.equal(fn.Grow(size),-1n);
    assert.equal(fn.Pages(),2n);
  }
  assert.equal(fn.Grow(2n),-1n);
  assert.equal(fn.Grow(1n),2n);
  assert.equal(fn.Grow(0n),3n);
  assert.equal(fn.Grow(1n),-1n);
  if (!shared) {
    const unbounded=new WebAssembly.Memory({initial:0});
    const other=new WebAssembly.Instance(module,{env:{mem:unbounded}}).exports;
    assert.equal(other.Grow(1n),0n);
    assert.equal(other.Pages(),1n);
  }
}
for (const memory of [{initial:-1},{initial:1.5},{maximum:0},
  {initial:65537},{maximum:65537},{shared:true,maximum:null}])
  assert.throws(()=>compileHolyC("",{noPrelude:true,memory}),/memory page limits/);
for (const source of ["__memgrow();","__memsize(1);","__memgrow(1,2);"])
  assert.throws(()=>compileHolyC(source,{noPrelude:true,lenient:false}),/requires/);
console.log("Memory: imported shared/unshared storage, growth, OOM, wide operands and page limits pass.");
