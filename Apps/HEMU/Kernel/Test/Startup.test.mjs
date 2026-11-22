import assert from "node:assert/strict";
import {HemuBoot,ReadyWait,FramesWait,TextRow} from "./WorkerHost.mjs";

function Text(frame)
{
  return Array.from({length:60},(_,row)=>TextRow(frame.buf,640,row)).join("\n");
}

for (const cores of [1,4]) {
  const h=await HemuBoot({smp:cores===4?4:0,keep_buf:true});
  try {
    const ready=await ReadyWait(h,20000);
    assert.equal(ready.ok,true);
    assert(!ready.probe.tasks.some(t=>t.name==="Welcome"));
    if (!h.frames.length) await FramesWait(h,1,10000);
    const first=Text(h.frames[0]);
    assert.match(first,/Take Tour\(y or n\)\?/);
    assert.doesNotMatch(first,/God on Tap!|Trivial Solutions/);
    h.Post({cmd:"input",x:8,y:470,b:0});
    await FramesWait(h,3,5000);
    assert.match(Text(h.last),/Take Tour\(y or n\)\?/);
    assert.doesNotMatch(Text(h.last),/God on Tap!|Trivial Solutions/);
    assert.ok(!h.msgs.some(m=>m.cmd==="guestPatch" || m.cmd==="error"));
    console.log(cores+" cores: native tour question without the added Welcome task; no startup corrections.");
  } finally {await h.Stop();}
}
