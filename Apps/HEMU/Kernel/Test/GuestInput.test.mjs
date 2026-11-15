import assert from "node:assert/strict";
import {createGuestInput} from "../GuestInput.js";

let state={x:320,y:240,updates:100,capture:false,game:false},hints=[],
    input=createGuestInput({guest:()=>({inputState:()=>state}),onState:v=>hints.push(v)});
function Frame(updates=state.updates)
{
  state.updates=updates;
  input.beforeFrame();
  return [Number(input.x()),Number(input.y()),Number(input.buttons())];
}
input.accept({x:100,y:80,b:1});
input.accept({x:102,y:82,b:0});
input.accept({x:200,y:160,b:2});
input.accept({x:202,y:162,b:0});
input.accept({x:300,y:240,b:0});
assert.deepEqual(Frame(),[100,80,1]);
for (let i=0;i<80;i++) assert.deepEqual(Frame(),[100,80,1],"CPU budgets do not acknowledge a guest poll");
assert.deepEqual(Frame(101),[100,80,1],"the native control pass after WinMgrSleep still needs the press");
assert.deepEqual(Frame(102),[102,82,0]);
assert.deepEqual(Frame(104),[200,160,2]);
assert.deepEqual(Frame(106),[202,162,0]);
assert.deepEqual(Frame(108),[300,240,0]);
assert.equal(hints.length,1);
state.capture=true;Frame();assert.equal(hints.at(-1).capture,true);

input.accept({x:10,y:20,b:1});
input.accept({x:30,y:40,b:0});
assert.deepEqual(Frame(),[10,20,1]);
const saved=input.save();
input.accept({reset:true,b:0});
assert.deepEqual(Frame(),[30,40,0],"reset discards pending down/up and releases immediately");
input.restore(saved);
assert.deepEqual(Frame(110),[30,40,0],"restoring a saved machine preserves the pending release");
input.accept({reset:true,b:0});Frame();
assert.equal(saved.edges.length,2,"saved queue is independent of subsequent input");
input.restore({x:21,y:22,b:2,wheel:4,dx:0,dy:0,relative:false,reset:false,frameX:21,frameY:22});
assert.deepEqual(Frame(),[21,22,2],"older pointer snapshots have no pending transitions");
assert.equal(input.wheel(),4n);

input.accept({reset:true,b:0,relative:true});
Frame();
input.accept({b:1,relative:true,dx:9,dy:-7});
input.accept({b:0,relative:true,dx:3,dy:2});
assert.deepEqual(Frame(),[329,233,1]);
state.x=320;state.y=240;
assert.deepEqual(Frame(111),[320,240,1],"a held edge does not reapply a relative delta after MsSet");
assert.deepEqual(Frame(112),[323,242,0]);
state.x=317;state.y=245;
assert.deepEqual(Frame(114),[317,245,0],"relative movement continues from the guest's cursor");
input.accept({relative:true,b:0,dx:5,dy:6});
assert.deepEqual(Frame(),[322,251,0]);

state.x=170;state.y=95;
input.accept({reset:true,b:0,relative:false});Frame();
input.accept({relative:true,b:0,dx:0,dy:0});
assert.deepEqual(Frame(),[170,95,0],"pointer lock starts at the native canvas center without a jump");

input=createGuestInput({guest:()=>null});
input.accept({x:60,y:90,b:1});input.accept({x:60,y:90,b:0});
input.beforeFrame();assert.equal(input.buttons(),1n,"pre-probe events remain queued until the guest can acknowledge them");
console.log("PASS guest pointer: short clicks, guest-cycle acknowledgment, coordinates, relative recentering, reset and saved queues");
