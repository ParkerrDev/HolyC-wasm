import {HemuPath} from "../Paths.js";
import assert from "node:assert/strict";
import {gzipSync} from "node:zlib";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {SnapshotInspect,SnapshotOpen,SnapshotChunks} from "../Snapshot.js";
import {makeRaw} from "../QCow2.js";
import {SnapshotInspect as OldInspect} from "./Fixtures/SnapshotV1.mjs";

//Unmodified Kernel/Snapshot.js from Web b0d51bf, before mandatory protocol versions.
assert.equal(createHash("sha256").update(readFileSync(new URL("./Fixtures/SnapshotV1.mjs",import.meta.url))).digest("hex"),
  "62bfef1344ab78bcbe0a376a5c84578829c409fbc74c39fa8ce23c9a79c81c76");

const wasm=readFileSync(HemuPath("build/hemu.wasm"));
const meta={version:1,cores:1,memoryBytes:436666368,wasmBytes:wasm.length,
  diskBytes:268435456,heapPtr:436645904,base:16777216,sp:16777216,ipiAddr:0,
  paused:true,rate:120,actualRate:120,repeat:false,budget:12000000,
  engineHash:Buffer.from(await crypto.subtle.digest("SHA-256",wasm)).toString("hex"),
  keyboard:{queue:[0xE0],held:[0x14D],prefix:256,pause:0},
  pointer:{x:320,y:240,b:0,wheel:0,dx:0,dy:0,relative:false,reset:false,frameX:320,frameY:240},launch:null};
function Pack(m=meta,engine=wasm) {
  const json=Buffer.from(JSON.stringify(m)),prefix=Buffer.alloc(12);
  prefix.write("HEMUSNP1");prefix.writeUInt32LE(json.length,8);
  return gzipSync(Buffer.concat([prefix,json,engine]));
}
assert.equal(await SnapshotInspect(gzipSync(Buffer.alloc(32))),null,"legacy RAM uses its original loader");
const head=await SnapshotInspect(Pack());
assert.equal((await SnapshotInspect(Pack({...meta,heapAbi:1}))).meta.heapAbi,1);
for (const fast of [false,true])
  assert.equal((await SnapshotInspect(Pack({...meta,fast}))).meta.fast,fast);
assert.deepEqual(head.meta,{...meta,heapAbi:0,guestPatches:[]});
assert.deepEqual((await SnapshotInspect(Pack({...meta,guestPatches:["doc-sprite-clip-v1","ac-dbl-buf-v1"]}))).meta.guestPatches,
  ["doc-sprite-clip-v1","ac-dbl-buf-v1"],"both TempleOS corrections are known");assert.deepEqual(Buffer.from(head.wasm),wasm);
for (const change of [{guestPatches:["unknown"]},{guestPatches:["doc-sprite-clip-v1","doc-sprite-clip-v1"]},{guestPatches:["ac-dbl-buf-v1","ac-dbl-buf-v1"]},{guestPatches:null},{version:2},{heapAbi:2},{heapAbi:null},{cores:2},{memoryBytes:2**40},{memoryBytes:436666369},
  {wasmBytes:3e6},{diskBytes:-1},{heapPtr:2**40},{base:436666368},{sp:-1},
  {engineHash:"f".repeat(64)},{launch:{name:"bad",slot:80,task:10}},
  {keyboard:{...meta.keyboard,queue:[256]}},{pointer:{...meta.pointer,x:null}},
  {rate:47},{actualRate:47},{paused:1},{budget:0},{fast:0},{fast:null},{fast:"true"}])
  await assert.rejects(()=>SnapshotInspect(Pack({...meta,...change})),/Invalid HEMU snapshot/);
await assert.rejects(()=>SnapshotInspect(Pack(meta,wasm.subarray(0,200))),/truncated/);
const open=await SnapshotOpen(Pack());
try {
  await assert.rejects(()=>open.Restore(new WebAssembly.Memory({initial:512,maximum:8192})),/truncated/);
} finally {await open.Close();}
const corrupt=Pack();corrupt[corrupt.length-5]^=1;
await assert.rejects(()=>SnapshotInspect(corrupt));
const coordinated=readFileSync(HemuPath("build/hemu-smp.wasm")),
  v2={...meta,version:2,requiredBusProtocol:1,cores:4,wasmBytes:coordinated.length,
    engineHash:Buffer.from(await crypto.subtle.digest("SHA-256",coordinated)).toString("hex")},
  packed=Pack(v2,coordinated),saved=await SnapshotOpen(packed,{busProtocol:1});
assert.equal(saved.meta.requiredBusProtocol,1);
await assert.rejects(()=>OldInspect(packed),/unsupported version/,"the actual old decoder rejects before loading the embedded engine");
await assert.rejects(()=>SnapshotOpen(packed,{busProtocol:0}),/requires shared RAM protocol/);
await assert.rejects(()=>SnapshotInspect(packed),/requires shared RAM protocol/);
try {
  const memory=new WebAssembly.Memory({initial:512,maximum:8192}),first=new Uint8Array(memory.buffer);
  first[0]=0xA5;
  await assert.rejects(()=>saved.Restore(memory),/requires shared RAM protocol/);
  assert.equal(memory.buffer.byteLength,32*1024*1024,"refusal precedes memory growth");
  assert.equal(first[0],0xA5,"refusal precedes RAM mutation");
} finally {await saved.Close();}
await assert.rejects(()=>SnapshotInspect(Pack({...meta,version:1,requiredBusProtocol:1})),/ownership requirement/);
await assert.rejects(()=>SnapshotInspect(Pack({...v2,requiredBusProtocol:2},coordinated)),/ownership requirement/);
console.log("Snapshot format: legacy detection, engine hash/module, bounded metadata, unsupported versions, corruption and truncation rejected.");

const memory={buffer:new ArrayBuffer(meta.memoryBytes)},live=new Uint8Array(memory.buffer),
  disk=await makeRaw(new Uint8Array(2048));
live[17]=42;live[live.length-1]=99;
disk.writeInto(1,1,new Uint8Array(512).fill(7),0);
const captured=SnapshotChunks({meta,wasm,memory,disk});
live.fill(0);live[200000]=11;
disk.writeInto(1,1,new Uint8Array(512).fill(8),0);
disk.writeInto(2,1,new Uint8Array(512).fill(9),0);
const {chunks}=await captured;
chunks.next();chunks.next();
let offset=0,nonzero=[];
for (let next=chunks.next();!next.done;next=chunks.next()) {
  const bytes=next.value;
  if (offset<meta.memoryBytes) {
    for (let i=0;i<bytes.length;i++) if (bytes[i]) nonzero.push([offset+i,bytes[i]]);
  } else {
    assert(bytes.subarray(512,1024).every(v=>v===7),"captured sector retains the old bytes");
    assert(bytes.subarray(1024,1536).every(v=>v===0),"later sectors never enter the captured disk");
  }
  offset+=bytes.length;
}
assert.deepEqual(nonzero,[[17,42],[meta.memoryBytes-1,99]],"all RAM, including previously zero chunks, is frozen before the first await");
assert.equal(offset,meta.memoryBytes+2048);
console.log("Snapshot capture is immutable while live RAM and disk continue changing.");
