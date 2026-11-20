import {createHost} from './host.js';
import {ByteString} from '../encoding.js';

//V5.03 Kernel/Sched.HC passes over a task that is suspended or awaiting a message.
const SUSPENDED=4n,AWAITING_MSG=512n,KILLED=2n,ADD_TO_QUEUE=256n;
class TaskExit extends Error {}
export function taskSupport(wasm=WebAssembly) {
  return typeof wasm.Suspending==='function' && typeof wasm.promising==='function';
}

//What a program run as a user task's cmd line (createTaskHost opts.user) is
//compiled to export: TaskHostUser, which makes the root V5.03's Adam, with the
//Window Mgr and a user task (TaskHostUserCmdLine) whose cmd line is the program.
export const USER_EXPORTS=['TaskHostUser'];

export function createTaskHost(opts={}) {
  const wasm=opts.webAssembly??WebAssembly,host=createHost(opts);
  const tasks=new Map(),dying=[],heap=host.heap;
  let instance=null,current=null,root=null,timer=null,disposed=false;
  //V5.03 Kernel/Sched.HC's Yield looks for the next task from the next_task of
  //the one that gave up the CPU, round the queue TaskHostNew keeps as TaskQueIns
  //does; TaskEnd goes on from the dead task's next, and an idle CPU from Adam.
  let cursor=null,inclusive=true;
  const now=()=>performance.now();
  function required() {
    if(!taskSupport(wasm)) throw new Error('HolyC task continuations require WebAssembly JSPI (Suspending and promising); run this program in TempleOS through HEMU on this host');
    if(disposed) throw new Error('HolyC task host is disposed');
    if(host.state.heapAbi!==1) throw new Error('HolyC task ownership requires heap ABI 1');
  }
  function fn() {return instance.exports;}
  //A task's heap is a CHeapCtrl in RAM (Kernel/Heap.HH), as V5.03's: each
  //used block's header names it, its list holds them, and HolyC's MAlloc
  //allocs off Fs->data_heap. A task's death frees its list, then its heap.
  function ctrlNew() {
    const hc=heap.ctrlNew();
    if(!hc) throw new RangeError('Out of memory for a HolyC task');
    return hc;
  }
  function disown(task) {
    if(!task.owner) return;
    //Through the free import, so what wraps it sees each one go.
    for(let ptr;(ptr=heap.ctrlFirst(task.owner));) host.env.__free(ptr);
    heap.ctrlDel(task.owner);task.owner=0n;
  }
  //V5.03 TaskEnd unlinks immediately. TaskKillDying releases the task's
  //storage after DYING_JIFFIES (one fifth of a second).
  function reap(time) {
    while(dying.length && dying[0].releaseAt<=time) disown(dying.shift());
  }
  const count=task=>task.owner?heap.ctrlCount(task.owner):0;
  //What the prelude's boot in __rt_init allocates (V5.03's Adam makes it) lives
  //as long as the instance, not as long as a session's root task.
  const kernel={owner:0n};let booting=false,booted=false;
  const owner=task=>(booting && task===root?kernel:task)?.owner??0n;
  host.env.__rt_booted=()=>{
    booting=false;booted=true;kernel.heapPtr=host.state.heapPtr;
    fn().TaskHostHeap(root.ptr,root.owner);
  };
  host.env.__malloc_kernel=size=>heap.malloc(size,owner(root));
  let idleSince=null;
  function endIdle() {
    if(idleSince===null) return;
    const jiffies=Math.floor(Number(host.state.timeMs()))-idleSince;
    if(jiffies>0) fn().TaskHostIdle(BigInt(jiffies));
    idleSince=null;
  }
  function schedule(delay=0) {
    if(timer!==null || disposed) return;
    timer=setTimeout(()=>{timer=null;pump();},delay);
  }
  function enter(task) {
    current=task;
    fn().__sp.value=task.sp;
    fn().__stack_limit.value=task.limit;
    fn().__exception.value=task.exception;
    fn().TaskHostEnter(task.ptr);
  }
  function pending(task,delay=0,condition=null) {
    if(!task || task.status!=='running') throw new Error('HolyC suspension outside a running task');
    task.sp=fn().__sp.value;
    task.exception=fn().__exception.value;
    task.status='waiting';task.at=now()+Math.max(0,delay);task.condition=condition;
    current=null;
    const promise=new Promise((resolve,reject)=>{task.resume=resolve;task.reject=reject;});
    schedule();return promise;
  }
  function wait(ms=0) {
    host.state.onTick?.();
    return pending(current,Number(ms));
  }
  function mark(task) {
    if(task.status==='dead') return;
    task.killed=true;task.interrupt=task.breakWake=false;fn().TaskHostKill(task.ptr);
    schedule();
  }
  function finish(task,error) {
    //The engine has unwound this continuation. Abandoned HolyC shadow frames
    //must not constrain its end callback or the kernel's cleanup calls.
    task.sp=task.top;enter(task);
    if(error && !(error instanceof TaskExit)) task.error??=error;
    let callback=0n;
    try {callback=task===root?0n:fn().TaskHostEnd(task.ptr);}
    catch(e) {task.error??=e;}
    if(callback) {
      task.start=fn().__functions.get(Number(callback));task.args=[];
      task.status='new';task.at=0;task.killed=false;current=null;schedule();return;
    }
    task.status='finishing';
    current=null;
    for(const child of task.children) mark(child);
    schedule();
  }
  function collect(task) {
    enter(task);
    let error=task.error;
    if(task!==root) {
      //The user task's end is the run's: Adam (the root) stops serving.
      if(task===root.user) mark(root);
      if(cursor===task.ptr) {cursor=fn().TaskHostNext(task.ptr);inclusive=true;}
      try {fn().TaskHostDone(task.ptr);} catch(e) {error??=e;}
      task.releaseAt=now()+200;dying.push(task);
      tasks.delete(task.ptr);task.parent.children.delete(task);
      fn().TaskHostEnter(root.ptr); //Fs is not left on a freed task.
    }
    if(task===root) {
      reap(Infinity);heap.ctrlTrim(task.owner);heap.ctrlTrim(kernel.owner);
    }
    task.status='dead';current=null;
    if(error && !(error instanceof TaskExit)) {
      if(task===root) task.rejectDone(error);
      else {
        if(opts.onTaskError) opts.onTaskError(error,task.ptr);
        else host.state.out('HolyC task fault: '+(error.message||String(error))+'\n');
        task.resolveDone();
      }
    } else task.resolveDone(task.result);
  }
  //The tasks in the order Yield tries them: from the cursor (or the task after
  //it) round the next_task ring, the cursor's own task last. A task the ring
  //does not reach (none should) comes after, in the order it was made.
  function queue() {
    const order=[],seen=new Set();
    let ptr=cursor!==null && tasks.has(cursor)?cursor:root.ptr;
    if(!inclusive && ptr===cursor) ptr=fn().TaskHostNext(ptr);
    for(let i=0;i<=tasks.size*2 && !seen.has(ptr);i++) {
      seen.add(ptr);
      const task=tasks.get(ptr);
      if(task) order.push(task);
      ptr=fn().TaskHostNext(ptr);
    }
    for(const task of tasks.values()) if(!order.includes(task)) order.push(task);
    return order;
  }
  function pump() {
    if(current || disposed) return;
    reap(now());
    let collected;
    do {
      collected=false;
      for(const task of [...tasks.values()])
        if(task.status==='finishing' && !task.children.size) {
          collect(task);collected=true;
        }
    } while(collected);
    const list=queue().filter(task=>task.status==='new' || task.status==='waiting');
    if(!list.length) return;
    const clock=now();
    for(let i=0;i<list.length;i++) {
      const task=list[i];
      if(!task.killed && (fn().TaskHostFlags(task.ptr)&(SUSPENDED|AWAITING_MSG) || !task.breakWake && (task.at>clock || task.condition && !task.condition()))) continue;
      cursor=task.ptr;inclusive=false;
      endIdle();enter(task);task.status='running';
      let interrupted=null;
      if(task.interrupt && !task.killed) {
        task.interrupt=false;task.breakWake=false;
        const sp=fn().__sp.value;
        try {fn().Break();} catch(error) {interrupted=error;}
        finally {fn().__sp.value=sp;}
      }
      if(task.start) {
        const start=task.start;task.start=null;
        if(task.killed || interrupted) {finish(task,interrupted??new TaskExit());schedule();return;}
        entry(start,task.args).then(value=>{
          if(task===root) booting=false;
          if(!task.tail) task.result=value;
          if(task.steps?.length) {
            [task.start,task.args,task.tail]=task.steps.shift();
            task.sp=fn().__sp.value;task.status='new';current=null;schedule();
          } else finish(task);
        },error=>{if(task===root) booting=false;finish(task,error);});
      } else {
        const resolve=task.resume,reject=task.reject;
        task.resume=task.reject=null;task.condition=null;
        if(task.killed || interrupted) reject(interrupted??new TaskExit());else resolve(task.value);
      }
      return;
    }
    cursor=root.ptr;inclusive=true; //Idle: V5.03's RESTORE_SETH_TASK_IF_READY.
    idleSince??=Math.floor(Number(host.state.timeMs()));
    const due=Math.min(...list.filter(task=>task.status==='waiting' && task.at>clock).map(task=>task.at-clock));
    schedule(Math.min(10,Number.isFinite(due)?due:10));
  }
  function record(ptr,parent,start,args,sp,limit) {
    const task={ptr,parent,start,args,sp,top:sp,limit,exception:0n,status:'new',owner:0n,children:new Set(),at:0,killed:false};
    task.done=new Promise((resolve,reject)=>{task.resolveDone=resolve;task.rejectDone=reject;});
    tasks.set(ptr,task);parent?.children.add(task);return task;
  }
  //Spawn hands its data's 64 bits to the entry, as V5.03 does in a register;
  //an entry whose argument is F64 takes those bits as the double.
  function entry(start,args) {
    //V5.03 Spawn pushes its one arg; an entry with more params reads what lies
    //above it on the stack, here 0.
    args=[...args,...Array(Math.max(0,start.length-args.length)).fill(0n)];
    const run=wasm.promising(start);
    try {return run(...args);}
    catch(error) {
      if(!(error instanceof TypeError) || !args.some(arg=>typeof arg==='bigint')) throw error;
      const bits=new DataView(new ArrayBuffer(8));
      return run(...args.map(arg=>{
        if(typeof arg!=='bigint') return arg;
        bits.setBigUint64(0,BigInt.asUintN(64,arg),true);return bits.getFloat64(0,true);
      }));
    }
  }
  function spawn(address,data,name,cpu,parent,stackSize,flags) {
    if(!current) throw new Error('Spawn outside a running HolyC task');
    if(cpu!==-1n && cpu!==0n || flags!==ADD_TO_QUEUE)
      throw new Error('This cooperative backend supports the current core and JOBf_ADD_TO_QUE only');
    parent=parent||root.ptr;
    const owner=tasks.get(parent);
    if(!owner || owner.status==='dead' || owner.killed) throw new Error('Invalid HolyC parent task');
    const start=fn().__functions?.get(Number(address));
    if(typeof start!=='function') throw new Error('Invalid HolyC task entry');
    stackSize=stackSize||1048576n;
    if(stackSize<4096n || stackSize>67108864n) throw new Error('HolyC task stack must be between 4 KiB and 64 MiB');
    stackSize=(stackSize+15n)&~15n;
    const hc=ctrlNew();let ptr;
    try {ptr=fn().TaskHostNew(parent,name,stackSize);}
    catch(error) {heap.ctrlDel(hc);throw error;}
    const top=fn().TaskHostStkTop(ptr);
    const task=record(ptr,owner,start,[data],top,top-stackSize);
    task.owner=hc;heap.own(ptr,hc);heap.own(fn().TaskHostStk(ptr),hc);
    fn().TaskHostHeap(ptr,hc);
    const saved=fn().__sp.value;
    try {
      fn().DirHostTaskInit?.(ptr);
      fn().HashHostTaskInit?.(ptr);
    }
    catch(error) {
      fn().__sp.value=saved;
      fn().TaskHostDone(ptr);
      disown(task);
      tasks.delete(ptr);owner.children.delete(task);
      throw error;
    }
    schedule();return ptr;
  }
  function kill(ptr,shouldWait,justBreak) {
    const task=tasks.get(ptr);
    if(!task || task.status==='dead') return 0n;
    if(justBreak) throw new Error('Native debugger breaks require TempleOS through HEMU');
    mark(task);
    if(task===current) throw new TaskExit();
    if(!shouldWait) return 1n;
    current.value=1n;
    return pending(current,0,()=>task.status==='dead' || !(fn().TaskHostFlags(task.ptr)&KILLED));
  }
  host.env.__task_require=required;
  host.env.__task_spawn=spawn;
  host.env.__task_break=(ptr,wake)=>{
    const task=tasks.get(ptr);
    if(!task || task.status==='dead' || task.killed) return;
    task.interrupt=true;task.breakWake||=Boolean(wake);schedule();
  };
  const controlAlt=host.env.__kbd_ctrl_alt;
  host.env.__kbd_ctrl_alt=(sc,ch,inIrq)=>{
    if(ch===2n && !opts.onControlAlt) fn().TaskHostBreak(0n);
    else controlAlt(sc,ch,inIrq);
  };
  if(taskSupport(wasm)) {
    host.env.__sleep=new wasm.Suspending(wait);
    host.env.__yield=new wasm.Suspending(()=>wait());
    host.env.__task_wait=new wasm.Suspending(task=>{
      host.state.onTick?.();
      return pending(current,0,()=>Boolean(fn().TaskHostReady(task)));
    });
    host.env.__task_kill=new wasm.Suspending(kill);
    //A later program part or ExePutS text runs on the calling task, so it
    //can sleep and wait as that task (jit.js).
    host.env.__jit_rest=new wasm.Suspending(async part=>{
      const instance=host.jit.symbols().part(Number(part));
      await wasm.promising(instance.exports.__main)();
    });
    host.env.__jit_exe=new wasm.Suspending(async(text,filename,res)=>{
      const table=host.jit.symbols(),bytes=new Uint8Array(fn().memory.buffer);
      const cstr=addr=>{
        const at=Number(addr),end=bytes.indexOf(0,at);
        return ByteString(bytes.subarray(at,end<0?at:end));
      };
      const instance=table.text(cstr(text),filename?cstr(filename):'<exe>');
      if(!instance) return 0n;
      const value=await wasm.promising(instance.exports.__main)();
      if(res) new DataView(fn().memory.buffer).setBigInt64(Number(res),value,true);
      return 1n;
    });
    //So does a statement LexStmt2Bin compiles that only declares (host.js).
    host.env.__jit_stmt=new wasm.Suspending(async type=>{
      const tokens=host.jit.tokens;
      host.jit.tokens=[];
      let code;
      try {code=host.jit.symbols().statement(tokens);}
      catch(error) {
        host.state.out(error.message+'\n');
        return 0n;
      }
      if(type) new DataView(fn().memory.buffer).setBigInt64(Number(type),BigInt(code.type),true);
      if(code.address!==null) return BigInt(code.address);
      await wasm.promising(code.main)();
      return 0x7FFFFFFFFFFFFFFFn; //INVALID_PTR
    });
    //A user run's two halves: Adam names its user task, and that task runs
    //the program's entry (Kernel/RuntimeC.HC TaskHostUser).
    host.env.__task_user=new wasm.Suspending(async ptr=>{
      if(ptr) {root.user=tasks.get(ptr);return;}
      const run=root.entry;
      if(current!==root.user || !run) throw new Error('Only the user task runs the program');
      root.entry=null;
      try {root.result=await entry(...run);}
      catch(error) {
        if(error instanceof TaskExit) throw error;
        root.error??=error;
      }
    });
    //CallExtStr's function runs on the calling task too.
    host.env.__call_ext=new wasm.Suspending(async(name,argc,argv)=>{
      if(!opts.jit) return 0n;
      const bytes=new Uint8Array(fn().memory.buffer),at=Number(name),end=bytes.indexOf(0,at);
      const call=host.jit.symbols().external(ByteString(bytes.subarray(at,end<0?at:end)));
      if(!call) return 0n;
      if(call.start) await wasm.promising(call.start)();
      const args=call.args(argc,argv);
      return call.result(args,await wasm.promising(call.fn)(...args));
    });
    host.env.__play_note=new wasm.Suspending(async(freq,ms)=>{
      if(host.state.snd?.note && !host.state.snd?.tone)
        throw new Error('Cooperative sound requires a nonblocking tone adapter');
      host.state.snd?.tone(freq);
      try {await wait(ms);}
      finally {host.state.snd?.tone(0);}
    });
  }
  host.env.__task_exit=()=>{mark(current);throw new TaskExit();};
  const attach=host.attach;
  host.attach=inst=>{
    required();
    if(root || kernel.owner) throw new Error('Cannot replace an active HolyC task instance');
    if(typeof SharedArrayBuffer!=='undefined' && inst.exports.memory.buffer instanceof SharedArrayBuffer)
      throw new Error('Cooperative HolyC tasks require a single, unshared instance');
    for(const name of ['TaskHostRoot','TaskHostEnter','TaskHostNew'])
      if(typeof inst.exports[name]!=='function') throw new Error('Module has no HolyC task runtime interface');
    instance=inst;
    return attach(inst);
  };
  host.run=(entry='__main',...args)=>{
    required();
    if(!instance) throw new Error('Attach the HolyC instance before running tasks');
    if(typeof fn()[entry]!=='function') throw new Error('Unknown HolyC task entry: '+entry);
    if(opts.user && USER_EXPORTS.some(name=>typeof fn()[name]!=='function'))
      throw new Error('A user task run needs the program compiled with exports '+USER_EXPORTS.join(', '));
    if(root && root.status!=='dead') throw new Error('HolyC task session is already running');
    const previous=root;
    root=record(fn().TaskHostRoot(),null,fn()[entry],args,fn().__sp.value,fn().__stack_limit.value);
    //__main boots itself. Another entry, or a program run as a user task's cmd
    //line (opts.user), boots first. A user run's root is Adam (TaskHostUser),
    //and the entry runs on its user task (__task_user); the run keeps its
    //result and its error.
    const steps=[];
    if(entry!=='__main' || opts.user) steps.push([fn().__rt_init,[]]);
    if(opts.user) {
      steps.push([fn().TaskHostUser,[],true]);
      root.entry=[fn()[entry],args];
    } else steps.push([fn()[entry],args]);
    [root.start,root.args]=steps.shift();root.steps=steps;
    kernel.owner||=ctrlNew();
    if(previous) {root.owner=previous.owner;previous.owner=0n;}
    else root.owner=ctrlNew();
    //__rt_init runs once an instance, on the first root, before its entry.
    booting=!booted;fn().TaskHostHeap(root.ptr,owner(root));pump();return root.done;
  };
  host.postMessage=(code,arg1=0n,arg2=0n,target=root?.ptr)=>{
    if(!root || root.status==='dead') return false;
    const task=tasks.get(BigInt(target));if(!task || task.killed) return false;
    return device(()=>fn().TaskHostMsg(task.ptr,BigInt(code),BigInt(arg1),BigInt(arg2)));
  };
  function device(action) {
    if(!root || root.status==='dead') return false;
    if(current) {action();schedule();return true;}
    const saved=fn().__sp.value,stack=root.sp;
    enter(root);
    try {action();}
    finally {root.sp=stack;fn().__sp.value=saved;current=null;}
    schedule();return true;
  }
  host.keyBytes=bytes=>{
    bytes=Array.from(bytes);
    if(!bytes.length || bytes.length>8 || bytes.some(byte=>!Number.isInteger(byte) || byte<0 || byte>255))
      throw new RangeError('A keyboard packet contains one to eight set-1 bytes');
    return device(()=>{for(const byte of bytes)fn().KbdHostByte(BigInt(byte));});
  };
  host.resetInput=()=>device(()=>fn().KbdHostReset());
  const mouse=host.mouse;
  host.mouse=(...args)=>instance && typeof fn().MsHardSet==='function' && device(()=>mouse(...args));
  host.breakTask=(target=0n)=>{
    target=BigInt(target);
    if(target && (!tasks.has(target) || tasks.get(target).status==='dead')) return false;
    let accepted=false;
    return device(()=>{accepted=Boolean(fn().TaskHostBreak(target));}) && accepted;
  };
  host.stop=()=>{if(root && root.status!=='dead') mark(root);return root?.done??Promise.resolve();};
  const files=host.files;
  host.files=()=>{
    if(disposed) throw new Error('HolyC task host is disposed');
    if(!root || root.status==='dead') return files();
    let result;device(()=>{result=files();});return result;
  };
  host.snapshot=()=>{throw new Error('Suspended JSPI continuations cannot be serialized; use a HEMU full-machine snapshot for portable TempleOS state');};
  host.dispose=async()=>{
    try {await host.stop();}
    finally {
      for(const task of [...tasks.values(),kernel]) disown(task);
      disposed=true;if(timer!==null) clearTimeout(timer);timer=null;
    }
  };
  //The heap and allocations the instance keeps from its boot on.
  Object.defineProperty(host.state,'boot',{get:()=>({heapPtr:kernel.heapPtr??null,allocations:count(kernel)})});
  Object.defineProperty(host.state,'tasks',{get:()=>[...tasks.values()].map(task=>({ptr:task.ptr,status:task.status,allocations:count(task)}))});
  return host;
}
