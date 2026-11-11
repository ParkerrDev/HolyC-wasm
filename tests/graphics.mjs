import assert from "node:assert/strict";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";
import {Framebuffer} from "../src/runtime/graphics.js";

const source=`U0 Offscreen()
{
  CDC *dc=DCNew(13,11),*alias=DCAlias(dc);
  DCFill(dc,3);
  alias->color=RED;
  GrRect(alias,-3,2,14,4);
  GrCircle(alias,4,7,3);
  GrPutS(alias,1,2,"AB");
  DCDepthBufAlloc(dc);
  GrHLine(dc,-3,17,5,-2,9);
  GrVLine(dc,7,14,-2,5,2);
  DCDel(alias);
  DCDel(dc);
}

U8 *Screen()
{
  return gr.dc->body;
}

U0 Onscreen()
{
  CDC *img=DCNew(11,7);
  I32 *db;
  DCClear;
  DCFill(img,GREEN);
  img->color=RED;
  GrCircle(img,5,3,2);
  gr.dc->color=BLUE;
  GrRect(gr.dc,-7,-2,31,13);
  gr.dc->color=ROPF_DITHER+RED<<16+YELLOW;
  GrLine(gr.dc,-3,8,43,31);
  GrBlot(gr.dc,14,5,img);
  GrPutS(gr.dc,2,32,"AB\\tC\\nD");
  GrPlot(gr.dc,639,479);
  GrPlot(gr.dc,640,480);
  db=DCDepthBufAlloc(gr.dc);
  gr.dc->color=CYAN;
  GrHLine(gr.dc,-2,500,100,-2,9);
  GrVLine(gr.dc,150,520,100,2,20);
  GrPlot3B(gr.dc,300,200,2);
  gr.dc->thick=5;
  GrPlot3(gr.dc,620,10,3);
  GrLine3(gr.dc,-10,440,3,639,455,5);
  GrRect3(gr.dc,330,240,4,35,20);
  gr.dc->thick=1;
  gr.dc->depth_buf=NULL;
  Free(db);
  DCDel(img);
}

U0 Direct()
{
  gr.dc->body[40*GR_WIDTH+500]=PURPLE;
  Refresh;
}`;
const result=compileHolyC(source,{lenient:false,exports:["Offscreen","Screen","Onscreen","Direct"]});
const gfx=new Framebuffer(null),host=createHost({gfx,onText:()=>{}});
gfx.flip=()=>gfx.present();
const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
host.attach(instance);instance.exports.__rt_init();
gfx.indices.fill(17);
let cursor;
for (let i=0;i<1000;i++) {
  instance.exports.Offscreen();
  cursor??=host.state.heapPtr;
  assert.equal(host.state.heapPtr,cursor,"device-context deletion must release its allocations");
}
assert.ok(gfx.indices.every(value=>value===17),"offscreen operations must not touch the display");
instance.exports.Onscreen();
const screen=new Uint8Array(instance.exports.memory.buffer,Number(instance.exports.Screen()),640*480);
assert.deepEqual(gfx.indices,screen,"display updates must match native bitmap storage");
instance.exports.Direct();
assert.equal(gfx.indices[40*640+500],5,"Refresh publishes direct bitmap writes");
assert.deepEqual(gfx.indices,screen);
console.log("Graphics: 1,000 device-context lifetimes stay bounded; offscreen isolation and exact bitmap/display synchronization pass.");
