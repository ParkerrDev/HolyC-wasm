import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const root=new URL("../",import.meta.url).pathname,
  web=resolve(process.env.TEMPLEOS_WEB||"../TempleOS-Web"),
  {chromium}=await import(pathToFileURL(web+"/node_modules/playwright-core/index.mjs")),
  server=createServer(async(request,response)=>{
    response.setHeader("Cross-Origin-Opener-Policy","same-origin");
    response.setHeader("Cross-Origin-Embedder-Policy","require-corp");
    try {
      const path=new URL(request.url,"http://localhost").pathname;
      response.setHeader("Content-Type",path==="/"?"text/html":"text/javascript");
      if(path==="/")response.end("<!doctype html><title>HolyC clock check</title>");
      else {
        const file=resolve(root,"."+path);
        if(!file.startsWith(root+"src/"))throw Error("Unserved path");
        response.end(await readFile(file));
      }
    }catch{response.writeHead(404);response.end();}
  });
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",headless:true,args:["--no-sandbox"]});
try {
  const page=await browser.newPage(),cdp=await browser.newBrowserCDPSession();
  await page.goto("http://127.0.0.1:"+server.address().port);
  assert.equal(await page.evaluate(async()=>{
    const {ClockStart}=await import("/src/runtime/clock.js"),original=globalThis.SharedArrayBuffer;
    try{globalThis.SharedArrayBuffer=undefined;return await ClockStart();}
    finally{globalThis.SharedArrayBuffer=original;}
  }),null,"Missing shared memory retains the generic fresh-clock provider");
  await page.evaluate(async()=>{
    const {makeControlSAB,keyPacketPush}=await import("/src/runtime/protocol.js");
    window.start=function(source){
      window.messages=[];window.control=new Int32Array(makeControlSAB());
      window.work=new Worker("/src/runtime/worker.js",{type:"module"});
      work.onmessage=event=>messages.push(event.data);
      work.postMessage({type:"run",source,controlSAB:control.buffer,
        fbSAB:new SharedArrayBuffer(640*480),paletteSAB:new SharedArrayBuffer(256*4)});
    };
    //Every program is a task, so a key is a set-1 packet: Space down and up.
    window.finish=function(){for(const bytes of [[0x39],[0xB9]])keyPacketPush(control,bytes);work.postMessage({type:"input"});};
  });
  async function clocks(expected){
    const end=Date.now()+5000;
    let urls=[];
    do {
      urls=(await cdp.send("Target.getTargets")).targetInfos.map(item=>item.url).filter(url=>url.endsWith("/clock-worker.js"));
      if(urls.length===expected)return;
      await new Promise(resolve=>setTimeout(resolve,30));
    }while(Date.now()<end);
    assert.equal(urls.length,expected,"Live clock workers: "+urls);
  }
  async function start(source){await page.evaluate(source=>start(source),source);}
  async function message(type){
    await page.waitForFunction(type=>messages.some(item=>item.type===type),type,{timeout:10000});
    return page.evaluate(type=>messages.find(item=>item.type===type),type);
  }
  async function done(){await message("done");await clocks(0);await page.evaluate(()=>work.terminate());}
  //V5.03 is non-preemptive (Doc/Welcome.DD) and a key reaches a task through
  //WinMgr (WinMgr.HC:309), so a program waiting for one yields.
  const wait='"READY\\n";while(!ScanChar) Yield;';
  const clockRequests=[];
  page.on("request",request=>{
    if(request.url().endsWith("/clock-worker.js"))clockRequests.push(request.url());
  });
  //A program using only wall time has no TSC sampler. An active keyboard
  //uses GetTSC itself when dispatching scan codes.
  await start('__puts("READY\\n");F64 end=tS+0.2;while(tS<end) {}');
  await message("text");await done();
  assert.equal(clockRequests.length,0,"Wall time alone must not start a clock worker");

  await start(`I64 a=GetTSC,last=a,b,n=0,back=0; F64 end=tS+0.06;
    while(tS<end) {b=GetTSC;if(b<last)back++;if(b!=last)n++;last=b;}
    "%d %d\\n",n,back;while(!ScanChar) Yield;`);
  const text=(await message("text")).text.trim().split(" ").map(Number);
  assert(text[0]>1,"Sampled time advances while WASM does not yield the worker event loop");
  assert.equal(text[1],0,"Sampled time is monotonic");await clocks(1);
  await page.evaluate(()=>finish());await done();

  await start('GetTSC;'+wait);await message("text");await clocks(1);
  await page.evaluate(()=>work.terminate());await clocks(0);
  await start('GetTSC; I64 zero=0; I64 value=1/zero; "%d",value;');
  await message("error");await clocks(0);await page.evaluate(()=>work.terminate());

  for(const failure of ["error","timeout"]){
    await page.route("**/clock-worker.js",route=>failure==="error"?route.abort():route.fulfill({body:"",contentType:"text/javascript"}));
    await start('I64 a=GetTSC;while(GetTSC==a) {} "FRESH\\n";');
    assert.equal((await message("text")).text,"FRESH\n");await done();
    await page.unroute("**/clock-worker.js");
  }
  const wrap=await page.evaluate(async()=>{
    const words=new BigInt64Array(new SharedArrayBuffer(8)),worker=new Worker("/src/runtime/clock-worker.js",{type:"module"});
    try {
      await new Promise((resolve,reject)=>{worker.onmessage=resolve;worker.onerror=reject;
        worker.postMessage({buffer:words.buffer,origin:performance.timeOrigin-2**32});});
      const first=Atomics.load(words,0);await new Promise(resolve=>setTimeout(resolve,30));
      return {first,last:Atomics.load(words,0)};
    }finally{worker.terminate();}
  });
  assert(wrap.first>4294967296000000n);assert(wrap.last>wrap.first);await clocks(0);
  console.log("Browser TSC: unused-clock elimination, busy-loop progress, monotonic 64-bit wrap, finish/error/Stop cleanup, startup failure/timeout fallback pass.");
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
