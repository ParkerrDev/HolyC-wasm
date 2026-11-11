// protocol.js - shared layout for the SharedArrayBuffer control block used to
// coordinate the worker (running WASM) and the main thread (input + audio).
//
// Control SAB (Int32Array): synchronous Sleep/Yield + input ring + sound ring.
export const CTRL = {
  // --- control / handshake ---
  RUNNING: 0,        // 1 while a program runs (main sets 0 to request stop)
  SLEEP_FUTEX: 1,    // worker Atomics.wait()s on this for Sleep()
  // --- keyboard ring (chars) ---
  KB_HEAD: 2,        // write index (main thread)
  KB_TAIL: 3,        // read index (worker)
  // --- mouse ---
  MS_X: 4, MS_Y: 5, MS_Z: 6, MS_LB: 7, MS_RB: 8,
  // --- sound ring ---
  SND_HEAD: 9,       // write index (worker)
  SND_TAIL: 10,      // read index (main thread)
  // --- stats / status ---
  FRAME: 11,         // incremented by worker on each flip
  DONE: 12,          // worker sets 1 when program returns
  MS_DX: 13, MS_DY: 14, // relative movement accumulated by the captured canvas
  MS_PRESSED: 15,    // pending left/right presses, including clicks between polls
  INPUT_RESET: 16,   // clears worker-side click latches when focus/capture changes
  HEADER_LEN: 20,    // ints reserved for header
};

export const KB_RING = 256;   // keyboard ring capacity (ints)
export const SND_RING = 512;  // sound ring capacity (entries of 2 ints: type,arg)

// Offsets (in Int32 units) of the ring regions after the header.
export const KB_BASE = CTRL.HEADER_LEN;
export const SND_BASE = KB_BASE + KB_RING;
export const KEY_STATE_BASE = SND_BASE + SND_RING * 2;
// Append-only: legacy character, sound and held-key offsets remain unchanged.
export const KEY_PACKET = Object.freeze({
  HEAD: KEY_STATE_BASE+128,
  TAIL: KEY_STATE_BASE+129,
  RESET: KEY_STATE_BASE+130,
  ACK: KEY_STATE_BASE+131,
  OVERFLOW: KEY_STATE_BASE+132,
  WAKE: KEY_STATE_BASE+133,
  BASE: KEY_STATE_BASE+136,
  CAPACITY: 256,
  STRIDE: 3,
});
export const TOTAL_INTS = KEY_PACKET.BASE+KEY_PACKET.CAPACITY*KEY_PACKET.STRIDE;

// sound command types
export const SND_TONE = 1;   // arg = freq (Hz), 0=off
export const SND_NOTE = 2;   // arg = freq; followed by duration handled via Sleep

export function makeControlSAB() {
  const sab = new SharedArrayBuffer(TOTAL_INTS * 4);
  return sab;
}

function packetControl(ctrl) {
  if (!(ctrl instanceof Int32Array) || ctrl.length<TOTAL_INTS ||
      typeof SharedArrayBuffer==='undefined' || !(ctrl.buffer instanceof SharedArrayBuffer))
    throw new TypeError('Native keyboard transport requires the current shared control block');
}
function packetWake(ctrl) {
  Atomics.add(ctrl,KEY_PACKET.WAKE,1);
  Atomics.notify(ctrl,KEY_PACKET.WAKE);
}

// One producer publishes whole PC set-1 sequences, including PrintScreen/Pause.
export function keyPacketPush(ctrl,bytes) {
  packetControl(ctrl);
  bytes=Array.from(bytes);
  if (!bytes.length || bytes.length>8 || bytes.some(byte=>!Number.isInteger(byte) || byte<0 || byte>255))
    throw new RangeError('A keyboard packet contains one to eight set-1 bytes');
  if (Atomics.load(ctrl,KEY_PACKET.RESET)!==Atomics.load(ctrl,KEY_PACKET.ACK)) return false;
  const head=Atomics.load(ctrl,KEY_PACKET.HEAD)>>>0,tail=Atomics.load(ctrl,KEY_PACKET.TAIL)>>>0;
  if (((head-tail)>>>0)>=KEY_PACKET.CAPACITY) {
    Atomics.add(ctrl,KEY_PACKET.OVERFLOW,1);
    keyPacketReset(ctrl);
    return false;
  }
  const base=KEY_PACKET.BASE+(head%KEY_PACKET.CAPACITY)*KEY_PACKET.STRIDE;
  ctrl[base]=bytes.length;
  for (let word=0;word<2;word++) {
    let value=0;
    for(let byte=0;byte<4;byte++) value|=(bytes[word*4+byte]??0)<<(byte*8);
    ctrl[base+1+word]=value;
  }
  Atomics.store(ctrl,KEY_PACKET.HEAD,(head+1)|0);
  packetWake(ctrl);
  return true;
}

// Producer requests a release/reset on focus loss or overflow. Until acknowledged,
// new packets are refused; callers must clear their local held-key sources too.
export function keyPacketReset(ctrl) {
  packetControl(ctrl);
  Atomics.add(ctrl,KEY_PACKET.RESET,1);
  packetWake(ctrl);
}

// One consumer copies packets before releasing slots. A reset drops pending raw
// bytes and requires host.resetInput() before delivering any later packets.
export function keyPacketRead(ctrl) {
  packetControl(ctrl);
  const reset=()=>{
    const epoch=Atomics.load(ctrl,KEY_PACKET.RESET);
    if(epoch===Atomics.load(ctrl,KEY_PACKET.ACK)) return false;
    Atomics.store(ctrl,KEY_PACKET.TAIL,Atomics.load(ctrl,KEY_PACKET.HEAD));
    Atomics.store(ctrl,KEY_PACKET.ACK,epoch);
    return true;
  };
  if(reset()) return {reset:true,packets:[],overflow:Atomics.load(ctrl,KEY_PACKET.OVERFLOW)>>>0};
  const head=Atomics.load(ctrl,KEY_PACKET.HEAD)>>>0,tail=Atomics.load(ctrl,KEY_PACKET.TAIL)>>>0;
  const count=(head-tail)>>>0,packets=[];
  if(count>KEY_PACKET.CAPACITY) throw new RangeError('Invalid native keyboard ring indices');
  for(let i=0;i<count;i++) {
    const base=KEY_PACKET.BASE+((tail+i)%KEY_PACKET.CAPACITY)*KEY_PACKET.STRIDE;
    const size=ctrl[base];
    if(size<1 || size>8) throw new RangeError('Invalid native keyboard packet length');
    const packet=[];
    for(let byte=0;byte<size;byte++) packet.push((ctrl[base+1+(byte>>2)]>>>((byte&3)*8))&255);
    packets.push(packet);
  }
  if(reset()) return {reset:true,packets:[],overflow:Atomics.load(ctrl,KEY_PACKET.OVERFLOW)>>>0};
  Atomics.store(ctrl,KEY_PACKET.TAIL,head);
  return {reset:false,packets,overflow:Atomics.load(ctrl,KEY_PACKET.OVERFLOW)>>>0};
}
