import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

const builder=readFileSync(new URL("v503/Sprite.HC",import.meta.url),"latin1").replace(/Sprite;\s*$/,"");
const source=builder+`
CDC *dc;
I32 *depth;
U8 *data;
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
  depth=DCDepthBufAlloc(dc);
}
U0 Prepare(I64 type)
{
  data=SpriteData(type);
}
U64 State()
{
  return (dc->flags*65599+dc->color)*65599+dc->thick+
    dc->x*7+dc->y*11+dc->z*13+dc->r+dc->r_norm+
    SpriteHash(&dc->sym,sizeof(CGrSym));
}
I64 Draw(I64 mode,I64 fail)
{
  I64 res=0;
  U64 before;
  failure=fail;
  SpriteInit(dc,depth,13);
  DCMat4x4Set(dc,dc->r);
  dc->transform=&Transform;dc->lighting=&Light;
  before=State;
  try {
    switch (mode) {
      case 0: Sprite3(dc,11,13,3,data);break;
      case 1: Sprite3B(dc,11,13,3,data);break;
      case 2: Sprite3ZB(dc,11,13,3,data,0.25);break;
    }
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (res && State!=before) throw('BadState');
  return res;
}
I64 Create(I64 mode)
{
  CDC *copy=NULL;
  I64 res=0;
  try {
    if (mode==0) copy=DCNew(16,16);
    if (mode==1) copy=DCAlias(dc);
    if (mode==2) copy=Sprite2DC(data);
    if (mode==3) {copy=DCAlias(dc);DCDepthBufAlloc(copy);}
    DCDel(copy);
  } catch {
    DCDel(copy);
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}
U0 Corrupt() {*data=31;}
U0 Release() {Free(data);data=NULL;}
CD3I32 curve_points[4];
Bool CurvePlot(U8 *aux,I64 x,I64 y,I64 z)
{
  if (failure) throw('DrawFail');
  return FALSE;
}
I64 CurveCancel(I64 order,I64 fail)
{
  I64 res=0;
  failure=fail;
  try {
    if (order==2) res=BSpline2(NULL,curve_points,4,&CurvePlot);
    else res=BSpline3(NULL,curve_points,4,&CurvePlot);
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}
U0 Done() {DCDel(dc);}`;
const result=compileHolyC(source,{lenient:false,exports:["Init","Prepare","Draw","Create","Release","Done","CurveCancel","Corrupt"]});
let calls=0,failAt=0;
const host=createHost(),malloc=host.env.__malloc;
host.env.__malloc=size=>++calls===failAt?0n:malloc(size);
const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
const fn=instance.exports;host.attach(instance);fn.__rt_init();
fn.Init();fn.Done();const empty=host.state.heapPtr;
fn.Init();const heap=host.state.heapPtr,stack=fn.__sp.value;
let total=0;
function fails(run,label) {
  calls=0;assert.equal(run(),0n,label);
  const count=calls,baseline=host.state.heapPtr;total+=count;
  for(let i=1;i<=count;i++) {
    calls=0;failAt=i;
    assert.equal(run(),0x6D654D74754Fn,`${label}, allocation ${i}`);
    assert.equal(host.state.heapPtr,baseline,`${label}, allocation ${i} must free its buffers`);
    assert.equal(fn.__sp.value,stack);
    failAt=0;assert.equal(run(),0n,`${label} retry`);
    assert.equal(host.state.heapPtr,baseline);
  }
}
for(let type=1;type<30;type++) {
  fn.Prepare(BigInt(type));
  fails(()=>fn.Draw(0n,0n),`sprite type ${type}`);
  fn.Release();assert.equal(host.state.heapPtr,heap);
}
for(const type of [13,17,18,19,20,23,24,25,29]) {
  fn.Prepare(BigInt(type));
  const prepared=host.state.heapPtr;
  for(const mode of [0n,1n,2n]) {
    assert.equal(fn.Draw(mode,1n),0x6C69614677617244n,`transform ${type}/${mode}`);
    assert.equal(host.state.heapPtr,prepared);
    assert.equal(fn.__sp.value,stack);
    assert.equal(fn.Draw(mode,0n),0n);
  }
  if(type===24 || type===25) {
    assert.equal(fn.Draw(0n,2n),0x6C69614677617244n,`lighting ${type}`);
    assert.equal(host.state.heapPtr,prepared);
  }
  fn.Release();assert.equal(host.state.heapPtr,heap);
}
fn.Prepare(8n);fn.Corrupt();
assert.equal(fn.Draw(0n,0n),Buffer.from("Graphics").readBigInt64LE());
fn.Release();assert.equal(host.state.heapPtr,heap);
fn.Prepare(23n);
for(const mode of [0n,1n,2n,3n]) fails(()=>fn.Create(mode),`context mode ${mode}`);
fn.Release();
for(let i=0;i<50;i++) for(const order of [2n,3n]) {
  assert.equal(fn.CurveCancel(order,0n),0n);
  assert.equal(fn.CurveCancel(order,1n),0x6C69614677617244n);
  assert.equal(host.state.heapPtr,heap,"cancelled/throwing spline callbacks must release scratch");
  assert.equal(fn.__sp.value,stack);
}
fn.Done();assert.equal(host.state.heapPtr,empty);
console.log(`Sprites: ${total} allocation failures, nested transform/lighting errors and retries restore context and free temporary buffers.`);
