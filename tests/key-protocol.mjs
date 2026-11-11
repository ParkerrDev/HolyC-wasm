import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {CTRL,KB_BASE,SND_BASE,KEY_STATE_BASE,KEY_PACKET,makeControlSAB,keyPacketPush,keyPacketReset,keyPacketRead} from '../src/runtime/protocol.js';
const packet=i=>[i&255,i>>>8&255,i>>>16&255,i>>>24&255,0xE0,0x37,0xE1,0xFF];
if(!isMainThread) {
  const ctrl=new Int32Array(workerData);
  for(let i=0;i<10000;i++) {
    while(((Atomics.load(ctrl,KEY_PACKET.HEAD)-Atomics.load(ctrl,KEY_PACKET.TAIL))>>>0)>=KEY_PACKET.CAPACITY)
      Atomics.wait(ctrl,KEY_PACKET.WAKE,Atomics.load(ctrl,KEY_PACKET.WAKE),1);
    assert(keyPacketPush(ctrl,packet(i)));
  }
  parentPort.postMessage('done');
} else {
  assert.deepEqual([CTRL.HEADER_LEN,KB_BASE,SND_BASE,KEY_STATE_BASE],[20,20,276,1300]);
  const ctrl=new Int32Array(makeControlSAB());
  const reserved=ctrl.subarray(0,KEY_STATE_BASE+128);reserved.fill(0x12345678);
  for(const bytes of [[],[1,256],[1,-1],[1,0.5],Array(9).fill(1)]) assert.throws(()=>keyPacketPush(ctrl,bytes),RangeError);
  assert.equal(Atomics.load(ctrl,KEY_PACKET.HEAD),0);
  assert.throws(()=>keyPacketPush(new Int32Array(1500),[1]),/shared control/);
  for(let i=0;i<KEY_PACKET.CAPACITY;i++) assert(keyPacketPush(ctrl,packet(i)));
  assert.equal(keyPacketPush(ctrl,[0x9E]),false,'overflow never overwrites unread packets');
  assert.equal(keyPacketPush(ctrl,[0x1E]),false,'wait for reset acknowledgement');
  assert.deepEqual(keyPacketRead(ctrl),{reset:true,packets:[],overflow:1});
  assert(keyPacketPush(ctrl,[0xE0,0x4B]));
  assert.deepEqual(keyPacketRead(ctrl),{reset:false,packets:[[0xE0,0x4B]],overflow:1});
  keyPacketReset(ctrl);keyPacketReset(ctrl);
  assert.equal(keyPacketRead(ctrl).reset,true);assert.equal(keyPacketRead(ctrl).reset,false);
  Atomics.store(ctrl,KEY_PACKET.HEAD,-16);Atomics.store(ctrl,KEY_PACKET.TAIL,-16);
  for(let i=0;i<32;i++) assert(keyPacketPush(ctrl,packet(i)));
  assert.deepEqual(keyPacketRead(ctrl).packets,Array.from({length:32},(_,i)=>packet(i)),'unsigned index wrap');
  assert(reserved.every(value=>value===0x12345678),'legacy regions remain untouched');
  assert(keyPacketPush(ctrl,[1]));ctrl[KEY_PACKET.BASE+(16%KEY_PACKET.CAPACITY)*KEY_PACKET.STRIDE]=9;
  assert.throws(()=>keyPacketRead(ctrl),/packet length/);keyPacketReset(ctrl);keyPacketRead(ctrl);
  const shared=makeControlSAB(),concurrent=new Int32Array(shared);
  const worker=new Worker(new URL(import.meta.url),{workerData:shared});
  const done=new Promise((resolve,reject)=>{worker.on('message',resolve);worker.on('error',reject);});
  let received=0;
  const deadline=setTimeout(()=>{worker.terminate();throw new Error('Packet publication stalled');},10000);
  try {
    while(received<10000) {
      const result=keyPacketRead(concurrent);
      assert.equal(result.reset,false);assert.equal(result.overflow,0);
      for(const bytes of result.packets) assert.deepEqual(bytes,packet(received++));
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    await done;
  } finally {clearTimeout(deadline);await worker.terminate();}
  console.log('Keyboard transport: bounded whole packets, reset/overflow, index wrap, legacy offsets and 10,000 concurrent publications pass.');
}
