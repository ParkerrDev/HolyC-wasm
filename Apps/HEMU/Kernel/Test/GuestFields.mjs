import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HemuPath} from "../Paths.js";
import {GuestHarness} from "./GuestHarness.mjs";
import {GuestWindows} from "../GuestWindows.js";

const h=await GuestHarness(),gx=h.gx,messages=[],
  bridge=GuestWindows({gx,exec:src=>h.Exec(src),post:m=>messages.push(m),paused:()=>false,
    source:()=>readFileSync(HemuPath("Kernel/GuestWin.HC"),"latin1")});
await bridge.Request({op:"enable"});
function Scene(value="abcd",limit=100,title="Single")
{
  const fields=[{id:2,kind:1,title,value,limit,submit:1},
    {id:3,kind:2,title:"Program",value:"first\nsecond",limit:100},
    {id:4,kind:3,title:"Choice",value:"0",options:["1Alpha","0Disabled","1Omega"]}],
    data=new Uint8Array(4096),view=new DataView(data.buffer);
  let off=24;
  function Cmd(kind,x,y,w,h,id,bytes=new Uint8Array)
  {
    const size=(bytes.length+7)&~7;
    [kind,x,y,w,h,0,id,size].forEach((n,i)=>view.setInt32(off+i*4,n,true));
    data.set(bytes,off+32);off+=32+size;
  }
  fields.forEach(function (field,i) {
    Cmd(4,8,8+i*24,144,16,field.id);
    Cmd(6,field.kind,field.limit || 100,field.submit || 0,0,field.id,
      new TextEncoder().encode([field.title,field.value,...field.options || [],"",""].join("\0")));
  });
  [off,fields.length*2,160,96,15].forEach((n,i)=>view.setInt32(i*4,n,true));
  return data.slice(0,off);
}
const w=await bridge.Request({op:"host",host:"fields",title:"Native fields",cols:20,rows:12,x:160,y:128,gui:Scene()}),
  titleOffset=gx.memberFind("CTask","task_title"),focus=gx.varFind("sys_focus_task");
async function Until(test,why)
{
  for (let i=0;i<300;i++) {
    const result=test();
    if (result) return result;
    await h.Run();
  }
  assert.fail(why);
}
async function Open(id)
{
  messages.length=0;
  const y=16+(id-2)*24;
  await h.Exec(`TaskMsg(${w.task},0,MSG_MS_L_DOWN,20,${y},0);TaskMsg(${w.task},0,MSG_MS_L_UP,20,${y},0);`);
  const popup=await Until(function () {
    const task=gx.taskInfo(w.task).popup?.addr;
    return task && (gx.taskInfo(task).awaitingMsg || gx.taskInfo(task).popup) &&
      gx.rdStr(task+titleOffset,32)==({2:"Single",3:"Program",4:"Choice"})[id] && task;
  },"native field editor did not open");
  await h.Run(10);
  assert.notEqual(popup,w.task,"editing belongs to a real guest child task");
  return popup;
}
async function Keys(bytes)
{
  h.Key(bytes);await h.Run(15);
}
function Events()
{
  bridge.Tick(true);
  return messages.flatMap(function (m) {return m.actions;}).filter(function (a) {return a.kind==5 || a.kind==6;});
}
async function Closed()
{
  await Until(function () {return !gx.taskInfo(w.task).popup;},"native field editor did not close");
  await h.Run(10);
}

const popup=await Open(2);
assert.equal(gx.rd64(focus),popup,"the native text editor owns keyboard focus");
await bridge.Request({op:"update",...w,gui:Scene("server replacement")});
await Keys([0x0E,0x8E]);
await Keys([0x2A,0xE0,0x4B,0xE0,0xCB,0xE0,0x4B,0xE0,0xCB,0xAA]);
await Keys([0x1D,0x2D,0xAD,0x9D]);
await Keys([0x2D,0xAD]);
assert.deepEqual(Events(),[],"typing never sends unfinished text to the browser");
await Keys([0x1C,0x9C]);await Closed();
const accepted=Events();
assert.deepEqual(accepted.map(function (e) {return [e.id,e.kind,e.value];}),
  [[2,5,"ax"],[2,6,undefined]],
  "native backspace, shift-selection and cut preserve the open value across scene updates, then accept before submit");
assert.equal(gx.taskInfo(popup).valid,false,"the accepted editor task is released");

await bridge.Request({op:"update",...w,gui:Scene()});
await Open(2);await Keys([0x2D,0xAD,0x01,0x81]);await Closed();
assert.deepEqual(Events(),[],"Escape cancels a single-line edit without modifying its backend value");

await Open(3);
await Keys([0x1C,0x9C,0x2D,0xAD,0x01,0x81]);await Closed();
assert.deepEqual(Events().map(function (e) {return [e.id,e.kind,e.value];}),[[3,5,"first\nsecond\nx"]],
  "multiline DocEd keeps newlines and uses TempleOS Escape acceptance");
await Open(3);await Keys([0x2D,0xAD,0x2A,0x01,0x81,0xAA]);await Closed();
assert.deepEqual(Events(),[],"Shift-Escape aborts native multiline editing");

const select=await Open(4);
await Until(function () {return gx.taskInfo(select).popup?.addr;},"native select menu did not open");
await Keys([0x0F,0x8F,0x39,0xB9]);await Closed();
assert.deepEqual(Events().map(function (e) {return [e.id,e.kind,e.value];}),[[4,5,"2"]],
  "the native menu skips disabled options and returns the selected option index");
await Open(4);await Keys([0x1C,0x9C]);await Closed();
assert.equal(Events().find(function (e) {return e.kind==5;}).value,"0","Enter accepts the native menu selection");
await Open(4);await Keys([0x2A,0x01,0x81,0xAA]);await Closed();
assert.deepEqual(Events(),[],"canceling the native list preserves its existing backend value");

await bridge.Request({op:"update",...w,gui:Scene("price $5; 100%")});
await Open(2);await Keys([0x1C,0x9C]);await Closed();
assert.equal(Events().find(function (e) {return e.kind==5;}).value,"price $5; 100%",
  "plain text fields preserve dollar signs and percent signs literally");

await bridge.Request({op:"update",...w,gui:Scene("abcdef",3)});
const overflow=await Open(2);
await Keys([0x1C,0x9C]);
await Until(function () {return gx.taskInfo(overflow).popup;},"oversized text did not show a native warning");
assert.deepEqual(Events(),[],"oversized text is never silently truncated or sent to the backend");
await Keys([0x39,0xB9]);
await Until(function () {return !gx.taskInfo(overflow).popup && gx.rd64(focus)==overflow;},"overflow warning did not return to the original editor");
await Keys([0x0E,0x8E,0x0E,0x8E,0x0E,0x8E,0x1C,0x9C]);await Closed();
assert.equal(Events().find(function (e) {return e.kind==5;}).value,"abc",
  "overflow rejection retains the complete native document for correction");

for (const corrupt of [function (view) {view.setInt32(60,9,true);},
  function (view) {view.setInt32(64,0,true);},
  function (view,bytes) {bytes[88+view.getInt32(84,true)-1]=65;},
  function (view,bytes) {bytes.fill(65,88,88+view.getInt32(84,true)-2);}]) {
  const bytes=Scene();corrupt(new DataView(bytes.buffer),bytes);
  await bridge.Request({op:"update",...w,gui:bytes});
  messages.length=0;
  await h.Exec(`TaskMsg(${w.task},0,MSG_MS_L_DOWN,20,16,0);TaskMsg(${w.task},0,MSG_MS_L_UP,20,16,0);`);
  await h.Run(20);
  assert.equal(gx.taskInfo(w.task).popup,null,"malformed field descriptors cannot launch a native editor");
  assert.deepEqual(Events(),[],"malformed fields cannot return values or submit");
  assert(gx.taskInfo(w.task).valid,"invalid field metadata leaves its native owner alive");
}

await bridge.Request({op:"update",...w,gui:Scene("value",100,"X".repeat(300))});
messages.length=0;
await h.Exec(`TaskMsg(${w.task},0,MSG_MS_L_DOWN,20,16,0);TaskMsg(${w.task},0,MSG_MS_L_UP,20,16,0);`);
await h.Run(20);
assert.equal(gx.taskInfo(w.task).popup,null,"an overlong title cannot overwrite native task memory");
assert.deepEqual(Events(),[]);
assert(gx.taskInfo(w.task).valid);

messages.length=0;
await h.Exec(`U0 FieldTestProducer(I64 slot) { I64 i; U8 *st; for (i=0;i<72;i++) { st=MStrPrint("value-%d",i); WebWinAction(slot,2,5,0,0,0,0,st); Free(st); } }
Spawn(&FieldTestProducer,${w.slot},"Field values",,adam_task);`);
const head=gx.varFind("web_action_head"),tail=gx.varFind("web_action_tail");
await Until(function () {return gx.rd64(head)-gx.rd64(tail)==64;},"value event queue did not reach capacity");
const first=Events();
assert.equal(first.length,64,"native producers wait while the action ring is full");
await h.Run(30);
const all=Events();
assert.deepEqual(all.map(function (event) {return event.value;}),Array.from({length:72},function (_,i) {return "value-"+i;}),
  "every accepted value survives source frees and action-ring reuse in order");
assert.equal(accepted[0].value,"ax","already delivered values stay independent of guest ring storage");
await bridge.Request({op:"close",...w});await h.Run(15);
await bridge.Request({op:"disable"});await h.Run(15);
assert(gx.rdBytes(gx.varFind("web_action_text"),64*8).every(function (byte) {return !byte;}),
  "stopping the bridge releases retained native event values");
console.log("PASS native fields: guest editing, selection, accept/cancel, multiline, native lists, length limits and queued value lifetime");
