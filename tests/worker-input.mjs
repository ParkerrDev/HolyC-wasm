import assert from "node:assert/strict";
import {Worker,isMainThread,parentPort,workerData} from "node:worker_threads";
import {CTRL,makeControlSAB} from "../src/runtime/protocol.js";

if (!isMainThread) {
  const ctrl=new Int32Array(workerData.controlSAB);
  let waits=0;
  //Inject complete clicks between HolyC input polls without wall-clock races.
  Atomics.wait=()=>{
    if (++waits===1) Atomics.or(ctrl,CTRL.MS_PRESSED,1);
    if (waits===3) {
      ctrl[CTRL.MS_LB]=ctrl[CTRL.MS_RB]=1;
      Atomics.or(ctrl,CTRL.MS_PRESSED,3);
    }
    if (waits===4) ctrl[CTRL.MS_LB]=0;
    if (waits===5) ctrl[CTRL.MS_RB]=0;
    if (waits===6) {
      ctrl[CTRL.MS_PRESSED]=0;
      Atomics.add(ctrl,CTRL.INPUT_RESET,1);
    }
    return "ok";
  };
  globalThis.self=globalThis;
  globalThis.postMessage=message=>parentPort.postMessage(message);
  await import("../src/runtime/worker.js");
  await self.onmessage({data:workerData});
} else {
  const controlSAB=makeControlSAB(),messages=[];
  const worker=new Worker(new URL(import.meta.url),{workerData:{
    type:"run",nativeGame:true,filename:"ClickProbe.HC",controlSAB,
    fbSAB:new SharedArrayBuffer(640*480),
    source:'I64 i;for(i=0;i<7;i++){Sleep(16);"%d %d\\n",ms.lb,ms.rb;}\n',
  }});
  let timeout;
  try {
    await new Promise((resolve,reject)=>{
      timeout=setTimeout(()=>reject(Error("HolyC worker did not finish")),10000);
      worker.on("message",message=>messages.push(message));
      worker.on("error",reject);
      worker.on("exit",code=>code?reject(Error("Worker exit "+code)):resolve());
    });
    assert.equal(messages.find(message=>message.type==="error"),undefined);
    assert.deepEqual(messages.filter(message=>message.type==="text").map(message=>message.text.trim()),
      ["1 0","0 0","1 1","0 1","0 0","0 0","0 0"]);
    assert(messages.some(message=>message.type==="done"));
    assert.equal(Atomics.load(new Int32Array(controlSAB),CTRL.DONE),1);
  } finally {
    clearTimeout(timeout);
    await worker.terminate();
  }
  console.log("HolyC worker module: short clicks, button chords, independent releases and input reset passed.");
}
