import { compileHolyC } from "../compiler.js";
import { compileProject } from "../project.js";
import { createMouseButtons } from "./mouse-buttons.js";
import { createHost } from "./host.js";
import {createTaskHost,USER_EXPORTS} from "./tasks.js";
import { Framebuffer } from "./graphics.js";
import {ClockStart} from "./clock.js";
import { CTRL, SND_BASE, SND_RING, SND_TONE, SND_NOTE, KEY_STATE_BASE, keyPacketRead } from "./protocol.js";

let ctrl = null;
let fb = null;
let pixels=null,palette=null;
let lastFlip = 0;
let wakeInput=null;

const nowMs=performance.now.bind(performance);

function sleep(ms) {
  if (Atomics.load(ctrl, CTRL.RUNNING) !== 1) return;
  if (ms <= 0) { presentMaybe(true); return; }
  presentMaybe(true);
  let remain = ms;
  const step = 50;
  while (remain > 0 && Atomics.load(ctrl, CTRL.RUNNING) === 1) {
    Atomics.wait(ctrl, CTRL.SLEEP_FUTEX, 0, Math.min(step, remain));
    remain -= step;
  }
}

function pushSnd(type, arg) {
  const head = Atomics.load(ctrl, CTRL.SND_HEAD);
  const slot = SND_BASE + (head % SND_RING) * 2;
  Atomics.store(ctrl, slot, type);
  Atomics.store(ctrl, slot + 1, Math.round(arg));
  Atomics.store(ctrl, CTRL.SND_HEAD, head + 1);
}

function presentMaybe(force) {
  const t = nowMs();
  if (force || t - lastFlip > 16) {
    lastFlip = t;
    Atomics.add(ctrl, CTRL.FRAME, 1);
    pixels.set(fb.indices);
    palette?.set(fb.pal32);
    Atomics.add(ctrl, CTRL.FRAME, 1);
    return true;
  }
}

function Failure(error,tag)
{//How a run's failure reads: a HolyC throw as V5.03's PutExcept prints it.
  if(!tag || !(error instanceof WebAssembly.Exception) || !error.is(tag))
    return String(error.stack||error);
  let ch=BigInt.asUintN(64,error.getArg(tag,0)),res="";
  for(;ch&255n;ch>>=8n)res+=String.fromCharCode(Number(ch&255n));
  return "Except:"+res+":";
}

self.onmessage = async (e) => {
  const msg = e.data;
  if(msg.type==="input"){wakeInput?.();return;}
  if (msg.type === "run") {
    const { source, controlSAB, fbSAB, paletteSAB } = msg;
    ctrl = new Int32Array(controlSAB);
    const buttons=createMouseButtons(ctrl);
    pixels=new Uint8Array(fbSAB);
    palette=paletteSAB?new Uint32Array(paletteSAB):null;
    fb = new Framebuffer(null);

    let outBuf = "";
    const flush = () => { if (outBuf) { self.postMessage({ type: "text", text: outBuf }); outBuf = ""; } };

    let host,clock,clockStart,useTasks=false,nativeActive=false,failure=null,taskError=null,drawPending=false,tag=null;
    try {
      //msg.user: the program is a user task's cmd line, as V5.03 runs every program;
      //it links USER_EXPORTS, which make this task one (tasks.js host.run).
      const exports=msg.user?USER_EXPORTS:undefined;
      const { bytes, warnings, globals, requiredCapabilities, jit } = msg.nativeGame
        ? compileProject({source,filename:msg.filename,files:msg.files,exports})
        : compileHolyC(source, { filename: "program.HC", lenient: false, resilient: false, exports });
      self.postMessage({ type: "compiled", size: bytes.length, warnings });

      useTasks=requiredCapabilities.includes("task-continuations");
      const mod=await WebAssembly.compile(bytes);
      host = (useTasks?createTaskHost:createHost)({
        onTaskError:error=>{taskError??=error;host.stop();},
        ansi: false,jit,user:!!msg.user,
        // A game's project files, seeded into the file store as they sit on its disk.
        files:(msg.seed??[]).map(file=>({path:file.path,bytes:new Uint8Array(file.bytes)})),
        onText: (s) => { outBuf += s; if (outBuf.length > 256 || s.includes("\n")) flush(); },
        gfx: {
          width: 640, height: 480,
          indices: fb.indices,
          palette:(index,bgr48)=>{fb.palette(index,bgr48);drawPending=true;},
          plot: (x, y, c) => fb.plot(x, y, c),
          flip: () => {drawPending=false;presentMaybe(true);},
        },
        snd: useTasks?{tone:f=>pushSnd(SND_TONE,f)}:{
          tone: (f) => pushSnd(SND_TONE, f),
          note: (f, ms) => { pushSnd(SND_NOTE, f); sleep(ms); pushSnd(SND_TONE, 0); },
        },
        sleep: (ms) => {sleep(ms);buttons.advance();host.state.onTick();},
        yield: () => {if(presentMaybe(false)){buttons.advance();host.state.onTick();}},
        timeMs:nowMs,
        setMouse:(x,y,z,left,right)=>{
          for(const [index,value] of [[CTRL.MS_X,x],[CTRL.MS_Y,y],[CTRL.MS_Z,z],
              [CTRL.MS_LB,Number(left)],[CTRL.MS_RB,Number(right)]])
            Atomics.store(ctrl,index,value);
        },
      });
      host.env.__time_ms=nowMs;
      //The clock worker starts on the program's first GetTSC, not at load: a
      //task's Seed links GetTSC into every task program, few of which read it.
      //Until the worker is ready the time is read fresh; it never goes back.
      if(WebAssembly.Module.imports(mod).some(item=>item.name==="__tsc")){
        let last=0n;
        host.env.__tsc=()=>{
          clockStart??=ClockStart().then(started=>clock=started);
          const now=clock?Atomics.load(clock.words,0):BigInt(Math.floor(nowMs()*1000000));
          if(now>last)last=now;
          return last;
        };
      }

      if(useTasks){
        const update=host.env.__gr_update;
        host.env.__gr_update=(...args)=>{update(...args);drawPending=true;};
      }
      if(host.env.__gr_update_mono){
        const update=host.env.__gr_update_mono;
        //Raw diagnostics may never yield; publish without admitting another task.
        host.env.__gr_update_mono=(...args)=>{
          update(...args);drawPending=false;presentMaybe(true);
        };
      }
      const inst = await WebAssembly.instantiate(mod, { env: host.env });
      tag=inst.exports.__exception_tag;
      host.attach(inst);

      const capture=globals.get('BrowserMouseCapture'), dx=globals.get('BrowserMouseDX'), dy=globals.get('BrowserMouseDY'), keys=globals.get('BrowserKeys');
      let wasCapture=false,mouseLast=[],mouseLive=false;
      const drainInput=()=>{
        if(!nativeActive)return;
        const input=keyPacketRead(ctrl);
        if(input.reset)host.resetInput();
        for(const packet of input.packets)host.keyBytes(packet);
      };
      if(useTasks)wakeInput=()=>{
        try{host.state.onTick();}
        catch(error){taskError??=error;host.stop();}
      };
      host.state.onTick = () => {
        if(useTasks){
          if(nativeActive && drawPending){drawPending=false;presentMaybe(true);}
          buttons.advance();drainInput();
        }
        const dv = new DataView(inst.exports.memory.buffer);
        const wanted=!!(capture && dv.getBigInt64(Number(capture.addr),true));
        const motion=[Atomics.exchange(ctrl,CTRL.MS_DX,0),Atomics.exchange(ctrl,CTRL.MS_DY,0)];
        if(useTasks && wanted){
          Atomics.store(ctrl,CTRL.MS_X,Math.max(0,Math.min(639,Atomics.load(ctrl,CTRL.MS_X)+motion[0])));
          Atomics.store(ctrl,CTRL.MS_Y,Math.max(0,Math.min(479,Atomics.load(ctrl,CTRL.MS_Y)+motion[1])));
        }
        const mouseButtons=buttons.sample(),
          device=[Atomics.load(ctrl,CTRL.MS_X),Atomics.load(ctrl,CTRL.MS_Y),
            Atomics.load(ctrl,CTRL.MS_Z),mouseButtons&1,mouseButtons&2];
        if(mouseLive && device.some((value,i)=>value!==mouseLast[i])){mouseLast=device;host.mouse(...device);}
        if(keys)for(let sc=0;sc<128;sc++)dv.setUint8(Number(keys.addr)+sc,Atomics.load(ctrl,KEY_STATE_BASE+sc));
        for(const [variable,index] of [[dx,0],[dy,1]])if(variable){
          const addr=Number(variable.addr);dv.setBigInt64(addr,dv.getBigInt64(addr,true)+BigInt(motion[index]),true);
        }
        if(wanted!==wasCapture){wasCapture=wanted;self.postMessage({type:'inputMode',capture:wanted});}
      };

      Atomics.store(ctrl, CTRL.RUNNING, 1);
      host.state.onTick();
      mouseLive=true; //After __rt_init's MsHostInit, at the program's first tick.
      self.postMessage({type:"keyboardMode",native:useTasks});
      if(useTasks){nativeActive=true;await host.run();}
      else inst.exports.__main();
      if(taskError)throw taskError;
    } catch(err) {
      failure=err;
    } finally {
      nativeActive=false;wakeInput=null;
      if(useTasks && host){
        try{await host.dispose();}catch(error){failure??=error;}
      }
      clockStart?.then(()=>clock?.worker.terminate());
      flush();
      presentMaybe(true);
      Atomics.store(ctrl,CTRL.DONE,1);
      if(failure)self.postMessage({type:"error",error:Failure(failure,tag),nativeGame:!!msg.nativeGame});
      else self.postMessage({type:"done"});
    }
  }
};
