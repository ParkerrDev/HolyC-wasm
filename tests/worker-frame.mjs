import assert from "node:assert/strict";
import {Worker,isMainThread,parentPort,workerData} from "node:worker_threads";
import {CTRL,KB_BASE,makeControlSAB} from "../src/runtime/protocol.js";
import {Framebuffer} from "../src/runtime/graphics.js";

if (!isMainThread) {
  globalThis.self=globalThis;
  globalThis.postMessage=message=>parentPort.postMessage(message);
  await import("../src/runtime/worker.js");
  await self.onmessage({data:workerData});
} else {
  const controlSAB=makeControlSAB(),ctrl=new Int32Array(controlSAB),
    fbSAB=new SharedArrayBuffer(640*480),pixels=new Uint8Array(fbSAB),
    paletteSAB=new SharedArrayBuffer(256*4),palette=new Uint32Array(paletteSAB);
  const worker=new Worker(new URL(import.meta.url),{workerData:{
    type:"run",nativeGame:true,filename:"Frame.HC",controlSAB,fbSAB,paletteSAB,
    source:`gr.dc->color=RED;GrRect(gr.dc,0,0,640,480);Refresh;
      gr.dc->color=BLUE;GrRect(gr.dc,0,0,640,240);
      GrPaletteColorSet(RED,0xFFFF00000000);
      "HALF\\n";while (!ScanChar) {}
      GrRect(gr.dc,0,240,640,240);`,
  }});
  let timeout,observed=false;
  try {
    await new Promise((resolve,reject)=>{
      timeout=setTimeout(()=>reject(Error("Frame worker did not finish")),10000);
      worker.on("error",reject);
      worker.on("message",message=>{
        try {
          if(message.type==="error")throw Error(message.error);
          if(message.type==="text" && message.text==="HALF\n"){
            assert(pixels.every(color=>color===4),"Drawing the next frame must not overwrite the published one");
            assert.equal(palette[4],0xff0000aa,"Palette changes publish with their pixels");
            assert.equal(Atomics.load(ctrl,CTRL.FRAME)&1,0);
            observed=true;ctrl[KB_BASE]=32;Atomics.store(ctrl,CTRL.KB_HEAD,1);
          }
        }catch(error){reject(error);}
      });
      worker.on("exit",code=>code?reject(Error("Worker exit "+code)):resolve());
    });
    assert(observed);assert(pixels.every(color=>color===1),"A finite program publishes its final frame without Refresh");
    assert.equal(palette[4],0xff0000ff);
    assert.equal(Atomics.load(ctrl,CTRL.FRAME)&1,0);
  }finally{clearTimeout(timeout);await worker.terminate();}

  const sequence=new Int32Array(new SharedArrayBuffer(4)),shown=[],
    context={createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4)}),
      putImageData:image=>shown.push(image.data.slice())},fb=new Framebuffer(context,8,1);
  fb.indices.fill(4);sequence[0]=1;
  assert.equal(fb.present(sequence),false);assert.equal(shown.length,0);
  const original=fb.indices;let changed=false;
  fb.indices=new Proxy(original,{get(target,key){
    if(key==='4'&&!changed){changed=true;target.fill(1);Atomics.add(sequence,0,2);}
    return Reflect.get(target,key,target);
  }});
  sequence[0]=2;
  assert.equal(fb.present(sequence),false,"Concurrent publication discards the converted frame");
  assert.equal(shown.length,0);fb.indices=original;
  assert.equal(fb.present(sequence),true);
  for(let i=0;i<8;i++)assert.deepEqual([...shown[0].subarray(i*4,i*4+4)],[0,0,170,255]);
  console.log("Frame publication: incomplete pixels/palette stay private, finite final frames publish, concurrent reads never reach Canvas.");
}
