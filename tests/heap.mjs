import assert from "node:assert/strict";
import {Worker,isMainThread,parentPort,workerData} from "node:worker_threads";
import {compileHolyC} from "../src/compiler.js";
import {createHost,HOST_HEAP_ABI} from "../src/runtime/host.js";
import {HEAP_BASE} from "../src/abi.js";

function attach(memory) {
  const host=createHost({onText:()=>{}});
  host.attach({exports:{memory}});
  return host;
}

function filled(memory,at,size,value) {
  assert.ok(new Uint8Array(memory.buffer,Number(at),size).every(byte=>byte===value),
    `allocation ${at} was overwritten`);
}

if (!isMainThread) {
  const {memory,gate,id}=workerData,signal=new Int32Array(gate),host=attach(memory),blocks=[];
  parentPort.postMessage({ready:true});
  Atomics.wait(signal,0,0);
  for (let i=0;i<300;i++) {
    const size=100+(i*37)%2000,ptr=host.env.__malloc(BigInt(size));
    assert.notEqual(ptr,0n);
    new Uint8Array(memory.buffer,Number(ptr),size).fill(id);
    blocks.push({ptr,size,value:id});
  }
  parentPort.postMessage({blocks});
  Atomics.wait(signal,1,0);
  for (const {ptr,size} of blocks.reverse()) {
    filled(memory,ptr,size,id);
    host.env.__free(ptr);
  }
  parentPort.postMessage({done:true});
  parentPort.close();
} else {
  const memory=new WebAssembly.Memory({initial:257,maximum:512}),host=attach(memory);
  const malloc=n=>host.env.__malloc(BigInt(n)),free=p=>host.env.__free(p);
  const a=malloc(100),b=malloc(200),c=malloc(100);
  free(b);
  const split=malloc(32),rest=malloc(100);
  assert.equal(split,b,"reuse a free block before growing");
  assert.ok(rest>split && rest<c,"split the remaining block");
  free(split);free(rest);
  assert.equal(malloc(200),b,"coalesce adjacent free pieces");
  free(b);free(a);free(c);
  const empty=host.state.heapPtr;
  assert.ok(empty>HEAP_BASE && empty<HEAP_BASE+256);

  let seed=0x38517;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const live=[];
  for (let i=0;i<4000;i++) {
    if (live.length && random()%100<55) {
      const index=random()%live.length,[block]=live.splice(index,1);
      filled(memory,block.ptr,block.size,block.value);
      free(block.ptr);
    } else {
      const size=random()%4096+1,ptr=malloc(size),value=random()&255;
      assert.notEqual(ptr,0n);
      assert.equal(ptr%16n,0n);
      for (const block of live)
        assert.ok(ptr+BigInt(size)<=block.ptr || block.ptr+BigInt(block.size)<=ptr);
      new Uint8Array(memory.buffer,Number(ptr),size).fill(value);
      live.push({ptr,size,value});
    }
  }
  for (const block of live) {
    filled(memory,block.ptr,block.size,block.value);
    free(block.ptr);
  }
  assert.equal(host.state.heapPtr,empty,"all freed allocations release the high water mark");
  const zero=malloc(0),other=malloc(0);
  assert.notEqual(zero,other);
  free(0n);free(zero);free(other);
  assert.throws(()=>free(other),/Invalid or already freed/);
  assert.throws(()=>free(BigInt(HEAP_BASE+1)),/Invalid or already freed/);
  assert.equal(malloc(-1),0n);
  assert.equal(malloc(2**32),0n);

  const first=malloc(200),hole=malloc(300),last=malloc(400);
  new Uint8Array(memory.buffer,Number(last),400).fill(91);
  free(hole);
  const snapshot=new Uint8Array(memory.buffer).slice(),cursor=host.state.heapPtr;
  const restoredMemory=new WebAssembly.Memory({initial:snapshot.length/65536,maximum:512});
  new Uint8Array(restoredMemory.buffer).set(snapshot);
  const restored=attach(restoredMemory);
  restored.state.heapPtr=cursor;
  assert.equal(restored.env.__malloc(300n),hole,"restore the free list from RAM alone");
  filled(restoredMemory,last,400,91);
  for (const ptr of [first,hole,last]) restored.env.__free(ptr);
  assert.equal(restored.state.heapPtr,empty);
  assert.throws(()=>{restored.state.heapPtr=cursor;},/does not match/);
  const legacy=attach(new WebAssembly.Memory({initial:257}));
  assert.throws(()=>{legacy.state.heapPtr=cursor;},/does not match/);
  assert.equal(HOST_HEAP_ABI,1);
  assert.equal(host.state.heapAbi,HOST_HEAP_ABI);
  const oldHost=createHost({heapAbi:0});
  oldHost.attach({exports:{memory:new WebAssembly.Memory({initial:257})}});
  oldHost.state.heapPtr=HEAP_BASE+123;
  oldHost.env.__free(BigInt(HEAP_BASE));
  assert.equal(oldHost.state.heapPtr,HEAP_BASE+123);
  assert.equal(oldHost.env.__malloc(1n),BigInt(HEAP_BASE+128));
  assert.equal(oldHost.state.heapAbi,0);
  assert.throws(()=>createHost({heapAbi:2}),/Unsupported HolyC heap ABI/);

  const limited=attach(new WebAssembly.Memory({initial:257,maximum:257}));
  const held=limited.env.__malloc(32n),before=limited.state.heapPtr;
  assert.equal(limited.env.__malloc(65536n),0n);
  assert.equal(limited.state.heapPtr,before,"failed growth must not consume heap space");
  limited.env.__free(held);
  assert.equal(limited.env.__malloc(32n),held,"failed growth leaves reuse intact");

  const source=`U8 *New(I64 size) { return CAlloc(size); }
U0 Del(U8 *ptr) { Free(ptr); }
I64 Oom()
{
  I64 res=0;
  try { MAlloc(0x100000000); } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}`;
  const result=compileHolyC(source,{lenient:false,exports:["New","Del","Oom"]});
  const runtime=createHost({onText:()=>{}});
  const {instance}=await WebAssembly.instantiate(result.bytes,{env:runtime.env});
  runtime.attach(instance);instance.exports.__rt_init();
  const stack=instance.exports.__sp.value;
  let high;
  for (let i=0;i<1000;i++) {
    const ptr=instance.exports.New(32768n);
    filled(instance.exports.memory,ptr,32768,0);
    new Uint8Array(instance.exports.memory.buffer,Number(ptr),32768).fill(255);
    instance.exports.Del(ptr);
    high??=runtime.state.heapPtr;
    assert.equal(runtime.state.heapPtr,high);
  }
  assert.equal(instance.exports.Oom(),0x6D654D74754Fn);
  assert.equal(instance.exports.__sp.value,stack);

  const shared=new WebAssembly.Memory({initial:257,maximum:512,shared:true});
  const gate=new SharedArrayBuffer(8),signal=new Int32Array(gate),workers=[];
  const ready=[],allocated=[],done=[];
  for (let id=1;id<=4;id++) {
    const worker=new Worker(new URL(import.meta.url),{workerData:{memory:shared,gate,id}});
    workers.push(worker);
    for (const [field,promises] of [["ready",ready],["blocks",allocated],["done",done]])
      promises.push(new Promise((resolve,reject)=>{
        worker.on("message",value=>{if (value[field]) resolve(value[field]);});
        worker.on("error",reject);
      }));
  }
  let expire;
  const deadline=new Promise((_,reject)=>{expire=reject;});
  const timeout=setTimeout(()=>expire(new Error("Shared allocation timed out")),15000);
  try {
    await Promise.race([Promise.all(ready),deadline]);
    Atomics.store(signal,0,1);Atomics.notify(signal,0);
    const blocks=(await Promise.race([Promise.all(allocated),deadline])).flat()
      .sort((a,b)=>Number(a.ptr-b.ptr));
    for (let i=0;i<blocks.length;i++) {
      const {ptr,size,value}=blocks[i];
      filled(shared,ptr,size,value);
      if (i) assert.ok(blocks[i-1].ptr+BigInt(blocks[i-1].size)<=ptr);
    }
    Atomics.store(signal,1,1);Atomics.notify(signal,1);
    await Promise.race([Promise.all(done),deadline]);
    assert.equal(attach(shared).state.heapPtr,empty);
  } finally {
    clearTimeout(timeout);
    await Promise.all(workers.map(worker=>worker.terminate()));
  }
  console.log("Heap: reuse/coalescing, 4,000 allocation operations, 1,000 cleared reuses, OOM, full RAM restore and four contending workers pass.");
}
