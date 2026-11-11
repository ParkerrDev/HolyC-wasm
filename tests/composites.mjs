import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

const source=`CDC *dc;
CD3I32 points[3];
CMeshTri tri;
I64 failure=0;
U0 Transform(CDC *d,I64 *x,I64 *y,I64 *z)
{
  if (failure==1) throw('DrawFail');
  DCTransform(d,x,y,z);
}
U0 Light(CDC *d,CD3I32 *a,CD3I32 *b,CD3I32 *c,CColorROPU32 color)
{
  d->color=RED;
  if (failure==2) throw('DrawFail');
  DCLighting(d,a,b,c,color);
}
U0 Init()
{
  dc=DCNew(96,72);
  points[0].x=4;points[0].y=4;points[0].z=0;
  points[1].x=40;points[1].y=4;points[1].z=1;
  points[2].x=40;points[2].y=40;points[2].z=2;
  tri.color=RED;tri.nums[0]=0;tri.nums[1]=1;tri.nums[2]=2;
}
I64 Draw(I64 mode,I64 fail)
{
  I64 res=0;
  failure=fail;
  dc->color=YELLOW;
  dc->flags=DCF_TRANSFORMATION|DCF_SYMMETRY;
  dc->transform=&Transform;dc->lighting=&Light;
  try {
    if (mode) Gr3Mesh(dc,3,points,1,&tri);
    else GrTextDiamond3(dc,48,36,0," One \\n Two \\n Three ");
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (dc->color!=YELLOW) throw('BadColor');
  if (dc->flags!=(DCF_TRANSFORMATION|DCF_SYMMETRY)) throw('BadFlags');
  return res;
}
U0 Done() {DCDel(dc);}`;
const result=compileHolyC(source,{lenient:false,exports:["Init","Draw","Done"]});
let calls=0,failAt=0;
const host=createHost(),malloc=host.env.__malloc;
host.env.__malloc=size=>++calls===failAt?0n:malloc(size);
const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
const fn=instance.exports;host.attach(instance);fn.__rt_init();
fn.Init();fn.Done();
const empty=host.state.heapPtr;
fn.Init();const heap=host.state.heapPtr,stack=fn.__sp.value;
let total=0;
for(const mode of [0n,1n]) {
  calls=0;assert.equal(fn.Draw(mode,0n),0n);
  const allocations=calls;assert.ok(allocations>=2);
  total+=allocations;
  for(let i=1;i<=allocations;i++) {
    calls=0;failAt=i;
    assert.equal(fn.Draw(mode,0n),0x6D654D74754Fn,`mode ${mode}, allocation ${i}`);
    assert.equal(host.state.heapPtr,heap,"every temporary allocation must be released");
    assert.equal(fn.__sp.value,stack);
    failAt=0;assert.equal(fn.Draw(mode,0n),0n);
    assert.equal(host.state.heapPtr,heap,"drawing must recover after allocation failure");
  }
}
for(const failure of [1n,2n]) {
  assert.equal(fn.Draw(1n,failure),0x6C69614677617244n);
  assert.equal(host.state.heapPtr,heap,"failed transform/lighting must free mesh buffers");
  assert.equal(fn.__sp.value,stack);
  assert.equal(fn.Draw(1n,0n),0n);
}
fn.Done();assert.equal(host.state.heapPtr,empty);
console.log(`Composite drawing: ${total} allocation failures, transform/lighting exceptions and retries release temporary buffers and restore state.`);
