import { format, readCStr, bytesToLatin1, docText } from "./console.js";
import {fileBridge} from "./files.js";
import {lexDiagnostics} from "./lex.js";
import {Heap,LegacyHeap,HOST_HEAP_ABI} from "./heap.js";
import {JitToken,Jit} from "../jit.js";
import {ByteString} from "../encoding.js";
export {HOST_HEAP_ABI} from "./heap.js";

export function createHost(opts = {}) {
  const state = {
    mem: null,            // WebAssembly.Memory (set after instantiate)
    out: opts.onText || ((s) => process.stdout.write(s)),
    ansi: opts.ansi !== false,
    gfx: opts.gfx || null,
    snd: opts.snd || null,        // {tone(freq), note(freq,ms)}
    sleep: opts.sleep || null,    // (ms) => void  (may block via Atomics)
    yield: opts.yield || null,    // () => void
    timeMs: opts.timeMs || (() => Date.now()),
    dateMs: opts.dateMs || (() => Date.now()),
    clockError:null,
    timerError:null,
    onFlip: opts.onFlip || null,
    onTick: opts.onTick || null,           // called before scan/sleep/yield (e.g. mouse mirror)
  };

  let native=null;
  const files=fileBridge(opts.files,()=>native);
  Object.defineProperty(state,"filesystemError",{get:()=>files.error});
  const lex=lexDiagnostics(()=>state.mem,opts.onLexError);
  Object.defineProperties(state,{
    lexError:{get:()=>lex.last},
    lexDiagnosticError:{get:()=>lex.error},
  });

  const heapAbi=opts.heapAbi??HOST_HEAP_ABI;
  if (heapAbi!==0 && heapAbi!==HOST_HEAP_ABI)
    throw new Error("Unsupported HolyC heap ABI: "+heapAbi);
  const heap=heapAbi===0?new LegacyHeap(()=>state.mem):new Heap(()=>state.mem);
  Object.defineProperty(state,"heapAbi",{enumerable:true,value:heapAbi});
  Object.defineProperty(state,"heapPtr",{enumerable:true,
    get:()=>heap.cursor,set:value=>{heap.cursor=value;}});

  function mem() { return state.mem; }
  function u8() { return new Uint8Array(state.mem.buffer); }
  function taskRequired() {
    throw new Error("This HolyC program requires a task continuation backend; use createTaskHost with JSPI or run it in TempleOS through HEMU");
  }

  const imports = {
    __rt_init_failed() {throw new Error("HolyC runtime initialization failed or reentered; create a fresh module instance before running it");},
    __lex_error:lex.report,
    __puts:addr=>state.out(docText(readCStr(mem(),Number(addr)),{ansi:state.ansi})),
    __printf(fmtAddr, nargs) {
      const fb = readCStr(mem(), Number(fmtAddr));
      state.out(format(fb, mem(), Number(nargs), { ansi: state.ansi }));
    },
    __print_bytes(addr, n) {
      const a = Number(addr), len = Number(n);
      const bytes = u8().subarray(a, a + len);
      let end = 0; while (end < bytes.length && bytes[end] !== 0) end++;
      state.out(bytesToLatin1(bytes.subarray(0, end)));
    },
    __putc(ch) { state.out(String.fromCharCode(Number(ch) & 0xff)); },

    __gr_plot(x, y, c) { state.gfx?.plot(Number(x), Number(y), Number(c)); },
    __gr_flip() { state.gfx?.flip(); state.onFlip?.(); },
    __gr_width() { return BigInt(state.gfx?.width ?? 640); },
    __gr_height() { return BigInt(state.gfx?.height ?? 480); },
    __gr_update(addr,stride,x,y,width,height) {
      const gfx=state.gfx;
      if (!gfx) return;
      if (!(gfx.indices instanceof Uint8Array))
        throw new TypeError("HolyC graphics output requires indexed pixel storage");
      addr=Number(addr);stride=Number(stride);
      x=Number(x);y=Number(y);width=Number(width);height=Number(height);
      const left=Math.max(0,x),top=Math.max(0,y);
      const right=Math.min(gfx.width??640,x+width),bottom=Math.min(gfx.height??480,y+height);
      if (left>=right || top>=bottom) return;
      const bytes=u8();
      for (let row=top;row<bottom;row++) {
        const pixels=bytes.subarray(addr+stride*row+left,addr+stride*row+right);
        gfx.indices.set(pixels,row*gfx.width+left);
      }
    },

    __snd(freq) { state.snd?.tone(freq); },
    __play_note(freq, ms) {
      if (state.snd?.note) state.snd.note(freq, Number(ms));
      else { state.snd?.tone(freq); state.sleep?.(Number(ms)); state.snd?.tone(0); }
    },

    __sleep(ms) { if (state.onTick) state.onTick(); if (state.sleep) state.sleep(Number(ms)); },
    __yield() { if (state.onTick) state.onTick(); if (state.yield) state.yield(); },
    __ms_set(x,y,z,left,right) {opts.setMouse?.(Number(x),Number(y),Number(z),Boolean(left),Boolean(right));},
    __time_ms() { return state.timeMs(); },
    __tsc() {return -1n;},
    __time_ms_checked() {
      try {
        const value=state.timeMs();
        if(!Number.isFinite(value)) throw new RangeError('HolyC timer requires finite milliseconds');
        state.timerError=null;return value;
      } catch(cause) {state.timerError=cause;return NaN;}
    },
    __date_utc() {
      try {
        const date=new Date(state.dateMs()),year=date.getUTCFullYear();
        if(!Number.isFinite(year) || year<0 || year>65535)
          throw new RangeError('HolyC UTC clock requires a valid year from 0 through 65535');
        const value=BigInt(date.getUTCSeconds()) | BigInt(date.getUTCMinutes())<<8n |
          BigInt(date.getUTCHours())<<16n | BigInt(date.getUTCDay())<<24n |
          BigInt(date.getUTCDate())<<32n | BigInt(date.getUTCMonth()+1)<<40n |
          BigInt(year)<<48n;
        state.clockError=null;return value;
      } catch(cause) {state.clockError=cause;return -1n;}
    },
    __task_require:taskRequired,
    __rt_booted() {},
    __task_spawn:taskRequired,
    __task_kill:taskRequired,
    __task_wait:taskRequired,
    __task_break:taskRequired,
    __task_exit:taskRequired,
    __task_user:taskRequired,
    __task_stack_fail() {throw new RangeError("HolyC task shadow stack overflow");},
    __kbd_ctrl_alt(sc,ch,inIrq) {
      if(!opts.onControlAlt) throw new Error("TempleOS Ctrl-Alt system actions require a keyboard device adapter");
      opts.onControlAlt(sc,Number(ch),Boolean(inIrq));
    },
    __kbd_leds:sc=>opts.onKeyboardLeds?.(sc),

    __malloc:size=>heap.malloc(size),
    __malloc_kernel:size=>heap.malloc(size),
    __malloc_for:()=>-1n,
    __free:ptr=>heap.free(ptr),
    __msize:ptr=>heap.size(ptr),
    __msize2:ptr=>heap.size(ptr,true),

    __sin: (x) => Math.sin(x), __cos: (x) => Math.cos(x), __tan: (x) => Math.tan(x),
    __asin: (x) => Math.asin(x), __acos: (x) => Math.acos(x), __atan: (x) => Math.atan(x),
    __atan2: (y, x) => Math.atan2(y, x), __pow: (x, y) => Math.pow(x, y),
    __log: (x) => Math.log(x), __log10: (x) => Math.log10(x), __exp: (x) => Math.exp(x),
    __fmod: (x,y) => x%y,
  };

  // Code compiled while the program runs (jit.js): opts.jit is the
  // compile's symbol table. Later program parts (__jit_rest) and text
  // (__jit_exe) run directly here; the task host runs them as continuations.
  const jit={tokens:[],code:[null],table:null};
  const cstr=addr=>{
    const bytes=u8(),at=Number(addr),end=bytes.indexOf(0,at);
    return ByteString(bytes.subarray(at,end<0?at:end));
  };
  const symbols=()=>{
    if(!opts.jit) throw new Error("Code compiled at run time needs the program's compile (createHost opts.jit)");
    if(!jit.table){
      jit.table=new Jit(opts.jit,{env:imports,mem:()=>state.mem,out:text=>state.out(text),
        alloc:size=>Number(imports.__malloc_kernel(BigInt(size)))});
      jit.table.attach(native);
    }
    return jit.table;
  };
  jit.symbols=symbols;
  imports.__jit_tok=(token,i64,f64,str,len)=>{
    token=Number(token);
    const bytes=token===0x100 || token===0x101?u8().slice(Number(str),Number(str)+Number(len)):null;
    jit.tokens.push(JitToken(token,i64,f64,bytes));
  };
  imports.__jit_expr=type=>{
    const tokens=jit.tokens;
    jit.tokens=[];
    let code;
    try{code=symbols().tokens(tokens);}
    catch(error){
      state.out(error.message+"\n");
      return 0n;
    }
    if(type) new DataView(state.mem.buffer).setBigInt64(Number(type),BigInt(code.type),true);
    jit.code.push(code.run);
    return BigInt(jit.code.length-1);
  };
  imports.__jit_call=handle=>{
    const run=jit.code[Number(handle)];
    if(!run) throw new Error("LexExpression2Bin code was freed or never made");
    return run();
  };
  imports.__jit_del=handle=>{if(handle) jit.code[Number(handle)]=null;else jit.tokens=[];};
  //LexStmt2Bin's statement (Compiler/CMain.HC): one that only declares runs here.
  imports.__jit_stmt=type=>{
    const tokens=jit.tokens;
    jit.tokens=[];
    let code;
    try{code=symbols().statement(tokens);}
    catch(error){
      state.out(error.message+"\n");
      return 0n;
    }
    if(type) new DataView(state.mem.buffer).setBigInt64(Number(type),BigInt(code.type),true);
    if(code.address!==null) return BigInt(code.address);
    code.main();
    return 0x7FFFFFFFFFFFFFFFn; //INVALID_PTR
  };
  //Without a symbol table nothing compiles later, so a define needs no copy.
  imports.__jit_define=(name,text)=>{if(opts.jit) symbols().define(cstr(name),cstr(text));};
  imports.__jit_rest=part=>{symbols().part(Number(part)).exports.__main();};
  imports.__call_ext=(name,argc,argv)=>{
    const call=opts.jit?symbols().external(cstr(name)):null;
    if(!call) return 0n;
    call.start?.();
    const args=call.args(argc,argv);
    return call.result(args,call.fn(...args));
  };
  imports.__jit_exe=(text,filename,res)=>{
    const instance=symbols().text(cstr(text),filename?cstr(filename):"<exe>");
    if(!instance) return 0n;
    const value=instance.exports.__main();
    if(res) new DataView(state.mem.buffer).setBigInt64(Number(res),value,true);
    return 1n;
  };

  if(heapAbi===HOST_HEAP_ABI) imports.__fs_seed=files.seed;
  if(typeof state.gfx?.palette==='function')
    imports.__gr_palette=(index,bgr48)=>state.gfx.palette(Number(index),bgr48);
  // Raw text reaches every program through PutKey; with no screen it shows
  // nowhere, as __gr_plot draws nowhere.
  imports.__gr_update_mono=(...args)=>{
      const [addr,stride,x,y,width,height]=args.map(Number),gfx=state.gfx;
      if(!(gfx?.indices instanceof Uint8Array))return;
      if(args.length!==6 || ![addr,stride,x,y,width,height,gfx.width,gfx.height].every(Number.isSafeInteger) ||
          addr<0 || stride<=0 || width<0 || height<0 || gfx.width<=0 || gfx.height<=0 ||
          !Number.isSafeInteger(x+width) || !Number.isSafeInteger(y+height) ||
          !Number.isSafeInteger(gfx.width*gfx.height) || gfx.indices.length<gfx.width*gfx.height)
        throw new RangeError('Invalid packed graphics update');
      const left=Math.max(0,x),top=Math.max(0,y),
        right=Math.min(gfx.width,x+width),bottom=Math.min(gfx.height,y+height);
      if(left>=right || top>=bottom)return;
      const bytes=u8(),end=addr+(bottom-1)*stride+Math.ceil(right/8);
      if(Math.ceil(right/8)>stride || !Number.isSafeInteger(end) || end>bytes.length)
        throw new RangeError('Packed graphics update exceeds source memory');
      for(let row=top;row<bottom;row++){
        const src=addr+row*stride,dst=row*gfx.width;
        for(let col=left;col<right;col++)
          gfx.indices[dst+col]=bytes[src+Math.floor(col/8)]&(128>>(col%8))?15:0;
      }
    };

  return {
    env: imports,
    heap,
    jit,
    files:files.entries,
    attach(instance) {
      native=instance.exports;
      state.mem = instance.exports.memory;
      return state;
    },
    // The pointer is the mouse hardware: V5.03 MsHardSet lands its absolute
    // state in ms_hard and WinMsUpdate carries it to ms, as the window manager does.
    mouse(x,y,z,left,right) {
      if(typeof native?.MsHardSet!=='function')return false;
      native.MsHardSet(BigInt(x),BigInt(y),BigInt(z),left?1n:0n,right?1n:0n);
      native.WinMsUpdate();
      return true;
    },
    state,
  };
}
