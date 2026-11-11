import {createHost} from './host.js';

const SUSPENDED=4n,KILLED=2n,ADD_TO_QUEUE=256n;
class TaskExit extends Error {}
export function taskSupport(wasm=WebAssembly) {
  return typeof wasm.Suspending==='function' && typeof wasm.promising==='function';
}

export function createTaskHost(opts={}) {
  const wasm=opts.webAssembly??WebAssembly,host=createHost(opts);
  const tasks=new Map(),owners=new Map();
  const malloc=host.env.__malloc,free=host.env.__free;
  let instance=null,current=null,root=null,timer=null,disposed=false,round=0;
  const now=()=>performance.now();
  function required() {
    if(!taskSupport(wasm)) throw new Error('HolyC task continuations require WebAssembly JSPI (Suspending and promising); run this program in TempleOS through HEMU on this host');
    if(disposed) throw new Error('HolyC task host is disposed');
    if(host.state.heapAbi!==1) throw new Error('HolyC task ownership requires heap ABI 1');
  }
  function fn() {return instance.exports;}
  function own(ptr,task) {
    if(!ptr) return;
    owners.get(ptr)?.alloc.delete(ptr);
    if(task) {task.alloc.add(ptr);owners.set(ptr,task);}
    else owners.delete(ptr);
  }
  host.env.__malloc=size=>{const ptr=malloc(size);own(ptr,current);return ptr;};
  host.env.__malloc_kernel=size=>{const ptr=malloc(size);own(ptr,root);return ptr;};
  host.env.__malloc_for=(size,owner)=>{
    const task=tasks.get(owner);
    if(!task || task.status==='dead' || task.killed) return -1n;
    const ptr=malloc(size);own(ptr,task);return ptr;
  };
  host.env.__free=ptr=>{free(ptr);own(ptr,null);};
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
      try {fn().TaskHostDone(task.ptr);} catch(e) {error??=e;}
      for(const ptr of [...task.alloc]) host.env.__free(ptr);
      tasks.delete(task.ptr);task.parent.children.delete(task);
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
  function pump() {
    if(current || disposed) return;
    let collected;
    do {
      collected=false;
      for(const task of [...tasks.values()])
        if(task.status==='finishing' && !task.children.size) {
          collect(task);collected=true;
        }
    } while(collected);
    const list=[...tasks.values()].filter(task=>task.status==='new' || task.status==='waiting');
    if(!list.length) return;
    const clock=now();
    for(let i=0;i<list.length;i++) {
      const task=list[(round+i)%list.length];
      if(!task.killed && (fn().TaskHostFlags(task.ptr)&SUSPENDED || !task.breakWake && (task.at>clock || task.condition && !task.condition()))) continue;
      round=(round+i+1)%list.length;
      enter(task);task.status='running';
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
        wasm.promising(start)(...task.args).then(value=>{
          if(task.next) {
            task.start=task.next;task.next=null;task.args=task.nextArgs;
            task.sp=fn().__sp.value;task.status='new';current=null;schedule();
          } else {task.result=value;finish(task);}
        },error=>finish(task,error));
      } else {
        const resolve=task.resume,reject=task.reject;
        task.resume=task.reject=null;task.condition=null;
        if(task.killed || interrupted) reject(interrupted??new TaskExit());else resolve(task.value);
      }
      return;
    }
    const due=Math.min(...list.filter(task=>task.status==='waiting' && task.at>clock).map(task=>task.at-clock));
    schedule(Math.min(10,Number.isFinite(due)?due:10));
  }
  function record(ptr,parent,start,args,sp,limit) {
    const task={ptr,parent,start,args,sp,top:sp,limit,exception:0n,status:'new',alloc:new Set(),children:new Set(),at:0,killed:false};
    task.done=new Promise((resolve,reject)=>{task.resolveDone=resolve;task.rejectDone=reject;});
    tasks.set(ptr,task);parent?.children.add(task);return task;
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
    const ptr=fn().TaskHostNew(parent,name,stackSize);
    const top=fn().TaskHostStkTop(ptr);
    const task=record(ptr,owner,start,[data],top,top-stackSize);
    own(ptr,task);own(fn().TaskHostStk(ptr),task);
    const saved=fn().__sp.value;
    try {
      fn().DirHostTaskInit?.(ptr);
      fn().HashHostTaskInit?.(ptr);
    }
    catch(error) {
      fn().__sp.value=saved;
      fn().TaskHostDone(ptr);
      for(const allocation of [...task.alloc]) host.env.__free(allocation);
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
  const legacyInput=()=>{throw new Error('Legacy character adapters cannot run in a HolyC task session; use native GetKey/GetChar and set-1 packets');};
  host.env.__scan_char=host.env.__get_char=legacyInput;
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
    if(root || owners.size) throw new Error('Cannot replace an active HolyC task instance');
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
    if(root && root.status!=='dead') throw new Error('HolyC task session is already running');
    const previous=root;
    root=record(fn().TaskHostRoot(),null,fn()[entry],args,fn().__sp.value,fn().__stack_limit.value);
    if(entry!=='__main') {
      root.start=fn().__rt_init;root.next=fn()[entry];root.nextArgs=args;root.args=[];
    }
    if(previous) for(const ptr of [...previous.alloc]) own(ptr,root);
    pump();return root.done;
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
      for(const ptr of [...owners.keys()]) host.env.__free(ptr);
      disposed=true;if(timer!==null) clearTimeout(timer);timer=null;
    }
  };
  Object.defineProperty(host.state,'tasks',{get:()=>[...tasks.values()].map(task=>({ptr:task.ptr,status:task.status,allocations:task.alloc.size}))});
  return host;
}
