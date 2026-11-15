import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HemuPath} from "../Paths.js";
import {GuestHarness} from "./GuestHarness.mjs";
import {GuestWindows} from "../GuestWindows.js";
import {GuestRequests} from "../GuestRqsts.js";
import {createGuestInput} from "../GuestInput.js";

let gx;
const input=createGuestInput({guest:()=>gx}),h=await GuestHarness({input});
gx=h.gx;
const messages=[],bridge=GuestWindows({gx,exec:src=>h.Exec(src),post:m=>messages.push(m),
  paused:()=>false,source:()=>readFileSync(HemuPath("Kernel/GuestWin.HC"),"latin1")});
const requests=GuestRequests(async m=>requests.Receive({cmd:"fileResult",id:m.id,...await bridge.Request(m)}));
requests.Receive({cmd:"guestReady",ok:true});
await bridge.Request({op:"enable"});
function Scene(canvas=true,rect=[8,8,160,96])
{
  const bytes=new Uint8Array(24+32*3),v=new DataView(bytes.buffer);
  [bytes.length,3,200,128,15].forEach((n,i)=>v.setInt32(i*4,n,true));
  [[4,8,8,160,96,0,2,0],[canvas?7:8,...rect,0,2,0],[4,176,8,16,16,0,3,0]].forEach((cmd,j)=>
    cmd.forEach((n,i)=>v.setInt32(24+j*32+i*4,n,true)));
  return bytes;
}
const w=await bridge.Request({op:"host",host:"capture",title:"Native game",cols:25,rows:16,x:160,y:128,gui:Scene()}),
  ms=gx.varFind("ms"),show=ms+gx.memberFind("CMsStateGlbls","show"),pos=ms+gx.memberFind("CMsStateGlbls","pos"),
  focus=gx.varFind("sys_focus_task"),wins=gx.varFind("web_wins"),
  stride=gx.memberFind("CWebWin","gui_center_y")+8,
  capture=wins+w.slot*stride+gx.memberFind("CWebWin","gui_capture");
function Events()
{
  bridge.Tick(true);
  return messages.flatMap(m=>m.actions);
}
async function Run(n=15)
{
  for (let i=0;i<n;i++) {await h.Run();bridge.Tick(true);}
}
async function Capture()
{
  input.accept({relative:true,b:0,reset:true});
  const res=await requests.Request({cmd:"windows",op:"capture",...w,control:2,on:true});
  assert.equal(res.capture,2);
  await Run();
}
await assert.rejects(bridge.Request({op:"capture",...w,control:999,on:true}),/native game canvas/);
for (const rect of [[-200,8,160,96],[8,-120,160,96],[8,8,0,96],[8,8,160,0],
  [201,8,160,96],[8,129,160,96],[8,8,641,96],[8,8,160,481]]) {
  await bridge.Request({op:"update",...w,gui:Scene(true,rect)});
  await assert.rejects(bridge.Request({op:"capture",...w,control:2,on:true}),/native game canvas/,
    "invalid canvas bounds cannot hide or capture the pointer");
  assert.equal(gx.rd8(show),1);
}
await bridge.Request({op:"update",...w,gui:Scene()});
await h.Exec(`TaskMsg(${w.task},0,MSG_MS_L_DOWN,180,12,0);TaskMsg(${w.task},0,MSG_MS_L_UP,180,12,0);`);
await Run();
assert.equal(gx.rd64(wins+w.slot*stride+gx.memberFind("CWebWin","gui_focus")),3,
  "the native capture button can own control focus before requesting canvas capture");
await Capture();
assert.equal(gx.rd64(wins+w.slot*stride+gx.memberFind("CWebWin","gui_focus")),2,
  "capture moves native control focus from its button to its canvas");
assert.equal(gx.rd8(show),0,"native capture hides the TempleOS pointer");
assert.equal(gx.rd64(capture),2);
assert(!Events().some(e=>e.kind==12),"entering relative mode creates no movement");
const center=[gx.rd64(pos),gx.rd64(pos+8)];
assert.deepEqual(center,[256,192],"TempleOS centers inside the canvas, not at the desktop center");
messages.length=0;
input.accept({relative:true,b:0,dx:17,dy:-9});
await Run();
assert.deepEqual(Events().filter(e=>e.kind==12).map(e=>[e.id,e.x,e.y,e.arg1,e.arg2]),[[2,17,-9,160,96]],
  "guest motion is emitted once with signed deltas and native canvas dimensions");
assert.deepEqual([gx.rd64(pos),gx.rd64(pos+8)],center,"native MsSet recenters after consuming motion");
messages.length=0;await Run();
assert(!Events().some(e=>e.kind==12),"recentering is not reported as user movement");
await bridge.Request({op:"capture",...w,control:2,on:false});
assert.equal(gx.rd8(show),1,"explicit release restores the original pointer visibility");
assert.deepEqual([gx.rd64(pos),gx.rd64(pos+8)],[320,240],"release restores the pre-capture pointer position");
assert.equal(Events().filter(e=>e.kind==13).length,1,"capture loss is delivered once");

await Capture();messages.length=0;
const other=await bridge.Request({op:"host",host:"other",title:"Other window",cols:20,rows:10,x:0,y:0,doc:"Other"});await Run();
assert.equal(gx.rd64(capture),0,"native task focus loss releases capture");
assert.equal(gx.rd8(show),1);
assert(Events().some(e=>e.kind==13 && e.id==2));
await bridge.Request({op:"update",...w,gui:Scene(true,[8,8,640,480])});
await Capture();messages.length=0;
assert.deepEqual([gx.rd64(pos),gx.rd64(pos+8)],[272,204],"a partially visible canvas captures at the visible intersection center");
input.accept({relative:true,b:0,dx:11,dy:-4});await Run();
assert.deepEqual(Events().filter(e=>e.kind==12).map(e=>[e.x,e.y,e.arg1,e.arg2]),[[11,-4,640,480]],
  "partial capture retains the full canvas dimensions for backend scaling");
await bridge.Request({op:"capture",...w,control:2,on:false});
await bridge.Request({op:"update",...w,gui:Scene()});
await Capture();messages.length=0;
await bridge.Request({op:"update",...w,gui:Scene(false)});await Run();
assert.equal(gx.rd64(capture),0,"removing the canvas releases its native capture");
assert(Events().some(e=>e.kind==13));
await assert.rejects(bridge.Request({op:"capture",...w,control:2,on:true}),/native game canvas/,
  "a list cannot claim game pointer capture");
await bridge.Request({op:"update",...w,gui:Scene()});

await h.Exec(`CTask *capture_doc;
U0 CaptureDoc()
{
  CDoc *doc=DocNew;
  DocPrint(doc,"A full-size native editor");
  WinBorder(ON);
  Fs->win_inhibit=WIG_USER_TASK_DFT;
  WinFocus;
  DocEd(doc,DOF_WIN_MAX);
  DocDel(doc);
}
capture_doc=Spawn(&CaptureDoc,NULL,"Native editor",,adam_task);
while (sys_focus_task!=capture_doc || !DocPut(capture_doc)) Sleep(1);
WinVert(1,TEXT_ROWS-2,capture_doc);`);
await Run(30);
assert.equal(gx.rd64(gx.varFind("web_win_enabled")),1,"a full native DocEd window preserves passthrough while covering the desktop");
assert(messages.at(-1).enabled);
await h.Exec(`Kill(capture_doc);`);await Run();
await Capture();messages.length=0;
await bridge.Request({op:"close",...w});await Run();
assert.equal(gx.rd8(show),1,"closing a captured task restores the pointer");
assert(Events().some(e=>e.kind==13));
const again=await bridge.Request({op:"host",host:"second",title:"Second game",cols:25,rows:16,x:160,y:128,gui:Scene()});
await bridge.Request({op:"capture",...again,control:2,on:true});
await bridge.Request({op:"disable"});await Run();
assert.equal(gx.rd8(show),1,"disabling the bridge restores captured pointer state");
assert.equal(gx.rd64(gx.varFind("web_gui_capture")),0);
assert(messages.some(m=>!m.enabled && m.actions.some(e=>e.kind==13)));
await bridge.Request({op:"enable"});
await h.Exec(`U0 CaptureCustom(CTask *,CDC *dc) {dc->color=RED;GrRect(dc,0,0,640,480);}
capture_doc=Spawn(&CaptureDoc,NULL,"Native editor",,adam_task);
while (sys_focus_task!=capture_doc || !DocPut(capture_doc)) Sleep(1);
capture_doc->draw_it=&CaptureCustom;`);
await Run(30);
const custom=gx.rd64(gx.varFind("capture_doc"));
await assert.rejects(bridge.Request({op:"detach",task:custom,num:gx.rd64(custom+gx.memberFind("CTask","task_num"))}),
  /needs the TempleOS desktop/,"a custom renderer remains incompatible with private native document capture");
await h.Exec(`Kill(capture_doc);`);
console.log("PASS native capture: canvas validation, relative entry, signed motion, recentering, focus/scene/close/disable cleanup and full native DocEd");
