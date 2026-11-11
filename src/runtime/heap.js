import {HEAP_BASE} from "../abi.js";

export const HOST_HEAP_ABI=1;
const MAGIC=0x48435031,CONTROL=32,HEADER=32,ALIGN=16,LIMIT=2**32;

//Full snapshots embed the old module, whose allocations have no block headers.
export class LegacyHeap
{
  constructor(memory) {this.memory=memory;this.cursor=HEAP_BASE;}

  malloc(size) {
    const at=(this.cursor+15)&~15,memory=this.memory();
    this.cursor=at+Number(size);
    if (this.cursor>memory.buffer.byteLength)
      try {memory.grow(Math.ceil((this.cursor-memory.buffer.byteLength)/65536));}
      catch {return 0n;}
    return BigInt(at);
  }

  free() {}

  size(ptr) {
    if (ptr===0n) return 0n;
    throw new Error("Allocation sizes are unavailable in legacy bump-heap snapshots");
  }
}

export class Heap
{
  constructor(memory) {this.memory=memory;}

  view() {
    const memory=this.memory();
    if (!memory) throw new Error("HolyC heap has no attached memory");
    this.mem=memory;
    this.data=new DataView(memory.buffer);
    this.lock=new Int32Array(memory.buffer,HEAP_BASE+4,1);
    this.shared=typeof SharedArrayBuffer!=="undefined" && memory.buffer instanceof SharedArrayBuffer;
  }

  read(at) {return Number(this.data.getBigUint64(at,true));}
  write(at,value) {this.data.setBigUint64(at,BigInt(value),true);}
  span(at) {return Math.floor(this.read(at)/ALIGN)*ALIGN;}
  used(at) {return this.read(at)%2===1;}

  get cursor() {
    this.view();
    return this.data.getUint32(HEAP_BASE,true)===MAGIC?this.read(HEAP_BASE+8):HEAP_BASE;
  }

  set cursor(value) {
    if (this.cursor!==value)
      throw new Error("Heap cursor does not match restored linear memory");
  }

  enter() {
    this.view();
    if (this.shared)
      while (Atomics.compareExchange(this.lock,0,0,1)!==0) {}
    this.view(); //Another worker may have grown memory while we waited.
    if (this.data.getUint32(HEAP_BASE,true)!==MAGIC) {
      this.write(HEAP_BASE+8,HEAP_BASE+CONTROL);
      this.write(HEAP_BASE+16,0);
      this.write(HEAP_BASE+24,0);
      this.data.setUint32(HEAP_BASE,MAGIC,true);
    }
  }

  leave() {if (this.shared) Atomics.store(this.lock,0,0);}

  remove(at) {
    const next=this.read(at+16),prev=this.read(at+24);
    if (prev) this.write(prev+16,next);
    else this.write(HEAP_BASE+16,next);
    if (next) this.write(next+24,prev);
  }

  insert(at) {
    const next=this.read(HEAP_BASE+16);
    this.write(at+16,next);
    this.write(at+24,0);
    if (next) this.write(next+24,at);
    this.write(HEAP_BASE+16,at);
  }

  malloc(size) {
    size=Number(size);
    if (!Number.isSafeInteger(size) || size<0 || size>LIMIT-HEADER) return 0n;
    const need=HEADER+Math.ceil(Math.max(1,size)/ALIGN)*ALIGN;
    this.enter();
    try {
      const end=this.read(HEAP_BASE+8);
      let at=this.read(HEAP_BASE+16);
      while (at) {
        const span=this.span(at);
        if (span>=need) {
          this.remove(at);
          if (span-need>=HEADER+ALIGN) {
            const tail=at+need;
            this.write(at,need+1);
            this.write(tail,span-need);
            this.write(tail+8,need);
            if (at+span<end) this.write(at+span+8,span-need);
            else this.write(HEAP_BASE+24,tail);
            this.insert(tail);
          } else this.write(at,span+1);
          return BigInt(at+HEADER);
        }
        at=this.read(at+16);
      }
      if (end+need>LIMIT) return 0n;
      if (end+need>this.mem.buffer.byteLength) {
        try {this.mem.grow(Math.ceil((end+need-this.mem.buffer.byteLength)/65536));}
        catch {return 0n;}
        this.view();
      }
      const last=this.read(HEAP_BASE+24);
      this.write(end,need+1);
      this.write(end+8,last?this.span(last):0);
      this.write(HEAP_BASE+8,end+need);
      this.write(HEAP_BASE+24,end);
      return BigInt(end+HEADER);
    } finally {this.leave();}
  }

  size(ptr) {
    ptr=Number(ptr);
    if (ptr===0) return 0n;
    this.enter();
    try {
      return BigInt(this.allocation(ptr).span-HEADER);
    } finally {this.leave();}
  }

  allocation(ptr) {
    const at=ptr-HEADER,end=this.read(HEAP_BASE+8);
    let span;
    if (!Number.isSafeInteger(at) || at%ALIGN || at<HEAP_BASE+CONTROL ||
        at+HEADER>end || !this.used(at) || (span=this.span(at))<HEADER+ALIGN || at+span>end)
      throw new Error("Invalid or already freed HolyC allocation");
    return {at,span,end};
  }

  free(ptr) {
    ptr=Number(ptr);
    if (ptr===0) return;
    this.enter();
    try {
      let {at,span,end}=this.allocation(ptr);
      let previous=this.read(at+8);
      this.write(at,span);
      if (previous && !this.used(at-previous)) {
        at-=previous;
        this.remove(at);
        span+=previous;
        previous=this.read(at+8);
      }
      const next=at+span;
      if (next<end && !this.used(next)) {
        this.remove(next);
        span+=this.span(next);
      }
      if (at+span===end) {
        this.write(HEAP_BASE+8,at);
        this.write(HEAP_BASE+24,previous?at-previous:0);
      } else {
        this.write(at,span);
        this.write(at+span+8,span);
        this.insert(at);
      }
    } finally {this.leave();}
  }
}
