import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HemuPath} from "../Paths.js";
import {GuestHarness} from "./GuestHarness.mjs";
import {GuestWindows} from "../GuestWindows.js";

const h=await GuestHarness(),gx=h.gx,messages=[],
  bridge=GuestWindows({gx,exec:src=>h.Exec(src),post:m=>messages.push(m),paused:()=>false,
    source:()=>readFileSync(HemuPath("Kernel/GuestWin.HC"),"latin1")});
await bridge.Request({op:"enable"});
function Scene(value="abcd",limit=100,epoch=1)
{
  const fields=[{id:2,kind:1,title:"Single",value,limit,submit:1},
    {id:3,kind:2,title:"Program",value:"first\nsecond",limit:100},
    {id:4,kind:3,title:"Choice",value:"0",options:["1Alpha","0Disabled","1Omega"]}],
    data=new Uint8Array(4096),view=new DataView(data.buffer);
  let off=24,cnt=0;
  function Cmd(kind,x,y,w,h,id,color=0,bytes=new Uint8Array)
  {
    const size=(bytes.length+7)&~7;
    [kind,x,y,w,h,color,id,size].forEach((n,i)=>view.setInt32(off+i*4,n,true));
    data.set(bytes,off+32);off+=32+size;cnt++;
  }
  fields.forEach(function (field,i) {
    Cmd(4,8,8+i*24,144,16,field.id);
    Cmd(6,field.kind,field.limit || 100,field.submit || 0,epoch,field.id,0,
      new TextEncoder().encode([field.title,field.value,...field.options || [],"",""].join("\0")));
    if (field.kind!=3)
      Cmd(9,8,8+i*24,144,16,field.id,0xF1);
  });
  [off,cnt,160,96,15].forEach((n,i)=>view.setInt32(i*4,n,true));
  return data.slice(0,off);
}
const w=await bridge.Request({op:"host",host:"fields",title:"Native fields",cols:20,rows:12,x:160,y:128,gui:Scene()}),
  focus=gx.varFind("sys_focus_task"),base=gx.varFind("web_wins"),
  stride=gx.memberFind("CWebWin","gui_center_y")+8,
  docOffset=gx.memberFind("CWebWin","gui_doc"),editOffset=gx.memberFind("CWebWin","gui_edit");
function Doc()
{
  return gx.rd64(base+w.slot*stride+docOffset);
}
async function Until(test,why)
{
  for (let i=0;i<300;i++) {
    const result=test();
    if (result) return result;
    await h.Run();
  }
  assert.fail(why);
}
async function Click(id,x=128)
{
  const y=16+(id-2)*24;
  await h.Exec(`TaskMsg(${w.task},0,MSG_MS_L_DOWN,${x},${y},0);TaskMsg(${w.task},0,MSG_MS_L_UP,${x},${y},0);`);
  await h.Run(10);
  if (id!=4) {
    assert.equal(gx.taskInfo(w.task).popup,null,"text editing creates no child window");
    assert.equal(gx.rd64(focus),w.task,"the existing window owns keyboard focus");
    assert(Doc(),"a native DolDoc owns the field text");
    assert.equal(gx.rd64(base+w.slot*stride+editOffset),id);
  }
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
function LastValue(id=2)
{
  return Events().filter(e=>e.id==id && e.kind==5).at(-1)?.value;
}
async function Replace(value,epoch,limit=100)
{
  await bridge.Request({op:"update",...w,gui:Scene(value,limit,epoch)});
  await h.Run(10);Events();messages.length=0;
}

await Click(2);
const originalDoc=Doc(),bounds=["win_left","win_right","win_top","win_bottom"].map(name=>gx.rd64(w.task+gx.memberFind("CTask",name)));
await Keys([0x0E,0x8E]);
assert.equal(LastValue(),"abc","native backspace publishes text without a popup");
await Replace("stale server echo",1);
await Keys([0x2A,0xE0,0x4B,0xE0,0xCB,0xE0,0x4B,0xE0,0xCB,0xAA]);
await Keys([0x1D,0x2D,0xAD,0x9D]);
await Keys([0x2D,0xAD]);
assert.equal(LastValue(),"ax","same-epoch scenes preserve selection and live native edits");
await Keys([0x1C,0x9C]);
assert.equal(Events().at(-1).kind,6,"single-line Enter submits");
assert.equal(Events().at(-1).x,1,"submit carries the field epoch");
assert.equal(Doc(),originalDoc,"Enter keeps the native document alive");
assert.equal(gx.rd64(focus),w.task,"Enter keeps keyboard focus in the same window");
await Replace("",2);
await Keys([0x15,0x95]);
assert.equal(LastValue(),"y","backend clear permits typing another message without another click");
assert.equal(Events().at(-1).x,2,"text carries the new field epoch");
assert.deepEqual(["win_left","win_right","win_top","win_bottom"].map(name=>gx.rd64(w.task+gx.memberFind("CTask",name))),bounds,
  "drawing and editing never change the owner's window bounds");

await Replace("C:/",3);
await Keys([0xE0,0x47,0xE0,0xC7,0x2A,0xE0,0x4F,0xE0,0xCF,0xAA]);
await Keys([0x1D,0x2D,0xAD,0x9D]);
assert.equal(LastValue(),"","Home, Shift-End and native cut replace an existing path");
await Replace("abcd",4);
await Click(2,16);
await Keys([0x2D,0xAD]);
assert.equal(LastValue(),"axbcd","click positioning edits the existing field inline");
await h.Exec(`WebGuiDocMouse(&web_wins[${w.slot}],8,8);WebGuiDocMouse(&web_wins[${w.slot}],32,8,TRUE);`);
await Keys([0x1D,0x2D,0xAD,0x9D]);
assert.equal(LastValue(),"cd","mouse selection uses native editor selection and cut");
await Keys([0x1D,0x30,0xB0,0x9D]);
assert(gx.taskInfo(w.task).valid,"window-only shortcuts cannot mutate the inline viewport");
await Keys([0x0F,0x8F]);
assert.equal(gx.rd64(base+w.slot*stride+editOffset),3,"Tab focuses the next inline field");
await Keys([0x4F,0xCF,0x1C,0x9C,0x2D,0xAD]);
assert.equal(LastValue(3),"first\nsecond\nx","multiline editing keeps newlines in its native window");
assert.equal(gx.taskInfo(w.task).popup,null);

await Replace("price $5; 100%",5);
await Click(2);
await Keys([0x2D,0xAD]);
assert.equal(LastValue(),"price $5; 100%x","plain fields preserve dollar and percent signs literally");
await Replace("abc",6,3);
await Keys([0x2D,0xAD]);
assert.equal(LastValue(),undefined,"the native character limit rejects growth without sending truncated text");
await Keys([0x0E,0x8E]);
assert.equal(LastValue(),"ab","a full field can still be shortened");

await Replace("abcd",7);
await Click(4);
await Until(function () {return gx.taskInfo(w.task).popup?.addr;} ,"native select menu did not open");
await h.Run(15);await Keys([0x0F,0x8F,0x39,0xB9]);
await Until(function () {return !gx.taskInfo(w.task).popup;} ,"native select menu did not close");
assert.equal(LastValue(4),"2","the native menu skips disabled options");
assert.equal(Events().filter(e=>e.id==4).at(-1).x,7,"native select carries its epoch");

messages.length=0;
await h.Exec(`U0 FieldTestProducer(I64 slot) { I64 i; U8 *st; for (i=0;i<72;i++) { st=MStrPrint("value-%d",i); WebWinAction(slot,2,5,0,0,0,0,st); Free(st); } }
Spawn(&FieldTestProducer,${w.slot},"Field values",,adam_task);`);
const head=gx.varFind("web_action_head"),tail=gx.varFind("web_action_tail");
await Until(function () {return gx.rd64(head)-gx.rd64(tail)==64;} ,"value event queue did not reach capacity");
assert.equal(Events().length,64,"native producers wait while the action ring is full");
await h.Run(30);
assert.deepEqual(Events().map(function (event) {return event.value;}),Array.from({length:72},function (_,i) {return "value-"+i;}),
  "accepted values survive source frees and ring reuse in order");
await Click(2);
assert(Doc());
await h.Exec(`DocLock(web_wins[${w.slot}].gui_doc);`,w.task);
assert.equal(gx.rd64(Doc()+gx.memberFind("CDoc","owning_task")),w.task,
  "the owner can be killed while holding its shared document lock");
await bridge.Request({op:"close",...w});await h.Run(15);
assert.equal(gx.rd64(base+w.slot*stride+docOffset),0,"forced task death releases its locked document");
const locked=await bridge.Request({op:"host",host:"locked",title:"Locked editor",cols:20,rows:12,x:160,y:128,gui:Scene()});
await h.Exec(`WebGuiEdit(${locked.slot},2);`);
await h.Exec(`DocLock(web_wins[${locked.slot}].gui_doc);`,locked.task);
await bridge.Request({op:"disable"});await h.Run(30);
assert(gx.rdBytes(gx.varFind("web_action_text"),64*8).every(function (byte) {return !byte;}),
  "stopping the bridge releases retained native event values");
assert.equal(gx.rd64(base+w.slot*stride+docOffset),0,"closing an edited window releases its retained native document");
console.log("PASS native inline fields: focus, epochs, selection, cursor, submit, multiline, limits, native lists and lifetime");
