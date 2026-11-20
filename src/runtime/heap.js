import {HEAP_BASE} from "../abi.js";
import {SHARED,UNSHARED} from "./heap-code.js";

export const HOST_HEAP_ABI=1;

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

  pool() {return 0n;}

  size(ptr) {
    if (ptr===0n) return 0n;
    throw new Error("Allocation sizes are unavailable in legacy bump-heap snapshots");
  }
}

const modules=[];

export class Heap
{
  constructor(memory) {this.memory=memory;}

  attach() {
    const memory=this.memory();
    if (!memory) throw new Error("HolyC heap has no attached memory");
    if (memory===this.mem) return;
    const shared=typeof SharedArrayBuffer!=="undefined" && memory.buffer instanceof SharedArrayBuffer;
    if (!modules[+shared]) {
      const bytes=Uint8Array.from(atob(shared?SHARED:UNSHARED),ch=>ch.charCodeAt(0));
      modules[+shared]=new WebAssembly.Module(bytes);
    }
    this.fn=new WebAssembly.Instance(modules[+shared],{env:{mem:memory}}).exports;
    this.fn.__sp.value=0n; //The companion has no shadow frames in its caller's memory.
    this.mem=memory;
  }

  call(name,...args) {
    this.attach();
    try {return this.fn[name](...args);}
    catch (error) {
      Atomics.store(new Int32Array(this.mem.buffer,HEAP_BASE+4,1),0,0);
      throw error;
    }
  }

  get cursor() {this.attach();return Number(this.fn.HeapCursor());}

  set cursor(value) {
    if (this.cursor!==value)
      throw new Error("Heap cursor does not match restored linear memory");
  }

  //hc is a heap (CHeapCtrl) the allocation goes on, or 0 for none.
  malloc(size,hc=0n) {
    size=Number(size);
    if (!Number.isSafeInteger(size) || size<0 || size>2**32-32) return 0n;
    return this.call("HeapAlloc",BigInt(size),BigInt(hc));
  }

  //A task's heap: a CHeapCtrl in RAM listing the allocations on it.
  ctrlNew() {return this.call("HeapCtrlNew");}

  //Free an emptied heap (its allocations freed first, see tasks.js).
  ctrlDel(hc) {
    if (this.call("HeapCtrlDel",hc)<0n)
      throw new Error("Invalid or already freed HolyC allocation");
  }

  own(ptr,hc=0n) {
    if (this.call("HeapOwn",BigInt(ptr),hc)<0n)
      throw new Error("Invalid or already freed HolyC allocation");
  }

  ctrlTrim(hc) {this.call("HeapCtrlTrim",hc);}

  ctrlCount(hc) {return Number(this.call("HeapCtrlCnt",hc));}

  ctrlFirst(hc) {return this.call("HeapCtrlFirst",hc);}

  //The pool (CBlkPool), V5.03's sys_code_bp.
  pool() {return this.call("HeapBP");}

  allocation(name,ptr) {
    ptr=Number(ptr);
    if (!Number.isSafeInteger(ptr) || ptr<0 || ptr>=2**32)
      throw new Error("Invalid or already freed HolyC allocation");
    if (!ptr) return 0n;
    const result=this.call(name,BigInt(ptr));
    if (result<0n) throw new Error("Invalid or already freed HolyC allocation");
    return result;
  }

  free(ptr) {this.allocation("HeapFree",ptr);}

  size(ptr,internal=false) {
    const span=this.allocation("HeapSize",ptr);
    return span && !internal?span-32n:span;
  }
}
