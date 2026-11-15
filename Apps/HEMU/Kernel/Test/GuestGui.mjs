import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HemuPath} from "../Paths.js";
import {GuestHarness} from "./GuestHarness.mjs";
import {GuestWindows} from "../GuestWindows.js";

const legacy=GuestWindows({gx:{varFind:()=>1,memberFind:()=>-1},paused:()=>false});
await assert.rejects(legacy.Request({op:"enable"}),/Restart TempleOS.*saved window bridge/,
  "old saved structures receive explicit restart guidance before offsets are accessed");

const h=await GuestHarness(),gx=h.gx,messages=[];
const bridge=GuestWindows({gx,exec:src=>h.Exec(src),post:m=>messages.push(m),
  paused:()=>false,source:()=>readFileSync(HemuPath("Kernel/GuestWin.HC"),"latin1")});
await bridge.Request({op:"enable"});
function Scene(color)
{
  const bytes=new Uint8Array(24+32*5+128),v=new DataView(bytes.buffer);
  [bytes.length,5,160,96,15].forEach((n,i)=>v.setInt32(i*4,n,true));
  let off=24;
  function Cmd(kind,x,y,w,h,c=0,id=0,payload=new Uint8Array)
  {
    [kind,x,y,w,h,c,id,payload.length].forEach((n,i)=>v.setInt32(off+i*4,n,true));
    bytes.set(payload,off+32);off+=32+payload.length;
  }
  Cmd(1,8,8,32,16,color);
  Cmd(3,48,8,13,8,0,0,Uint8Array.from({length:128},(_,i)=>i%16<13?10+(i/16|0)%2:255));
  Cmd(4,8,32,64,16,0,2);
  Cmd(4,80,32,64,16,0,3);
  Cmd(5,0,56,160,40,0,4);
  return bytes;
}
const w=await bridge.Request({op:"host",host:"gui",title:"GUI test",cols:20,rows:12,x:160,y:128,gui:Scene(4)});
await h.Run(20);
const gr=gx.varFind("gr"),body=gx.memberFind("CDC","body"),dc2=gx.memberFind("CGrGlbls","dc2");
function Pixel(x,y)
{
  const left=gx.rd64(w.task+gx.memberFind("CTask","pix_left")),top=gx.rd64(w.task+gx.memberFind("CTask","pix_top"));
  return gx.rdBytes(gx.rd64(gx.rd64(gr+dc2)+body)+(top+y)*640+left+x,1)[0];
}
assert.equal(Pixel(16,12),4,"native GrRect uses the scene's position and palette");
assert.equal(Pixel(50,10),10,"native GrBlot draws the scene's image pixels");
assert.equal(Pixel(50,11),11,"image padding does not skew successive rows");
await bridge.Request({op:"update",...w,gui:Scene(1)});await h.Run(15);
assert.equal(Pixel(16,12),1,"scene updates redraw native pixels");
await h.Exec(`TaskMsg(${w.task},0,MSG_MS_L_DOWN,20,40,0);TaskMsg(${w.task},0,MSG_MS_L_UP,20,40,0);`);
await h.Run(15);bridge.Tick(true);
assert(messages.flatMap(m=>m.actions).some(a=>a.id==2),"native mouse hit testing returns the DOM action");
messages.length=0;
await h.Exec(`TaskMsg(${w.task},0,MSG_KEY_DOWN,'\\t',0,0);TaskMsg(${w.task},0,MSG_KEY_DOWN,'\\n',0,0);TaskMsg(${w.task},0,MSG_KEY_DOWN,0,SC_PAGE_DOWN,0);`);
await h.Run(15);bridge.Tick(true);
assert.deepEqual(messages.flatMap(m=>m.actions).map(a=>a.id),[3,0x100000+4*16+4],"keyboard focus and page scrolling keep scene IDs");
messages.length=0;
await h.Exec(`MsSet(${w.task}(CTask *)->pix_left+20,${w.task}(CTask *)->pix_top+70,ms.pos.z+1);`);
await h.Run(15);bridge.Tick(true);
assert(messages.flatMap(m=>m.actions).some(a=>a.id==0x100000+4*16+2),"native mouse wheel selects the scroll container under the pointer");
await assert.rejects(bridge.Request({op:"detach",task:w.task,num:w.num}),/needs the TempleOS desktop/,
  "GUI owners return to their DOM rather than entering arbitrary draw-callback capture");
await bridge.Request({op:"close",...w});await h.Run(15);
assert.equal(gx.taskInfo(w.task).valid,false);
await bridge.Request({op:"disable"});await h.Run(15);
console.log("PASS native GUI: native rectangle/image pixels, live scene update, real mouse and keyboard handlers, scroll actions, capture safety and cleanup");
