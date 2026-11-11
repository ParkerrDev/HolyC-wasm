import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {join} from "node:path";
import {Prepare} from "./Prepare.mjs";

export async function GuestNew()
{//Run V5.03's x86 compiler with the pinned emulator, never today's compiler.
  const cache=await Prepare();
  const load=name=>import(pathToFileURL(join(cache,"web/engine",name)));
  const [{createHemuHost},jit,{createGuestExec}]=await Promise.all([
    load("host.js"),load("jit.js"),load("guestexec.js")]);
  const ram=readFileSync(join(cache,"live.bin"));
  const disk=readFileSync(join(cache,"templeos.raw"));
  const module=await WebAssembly.compile(readFileSync(join(cache,"web/build/hemu.wasm")));
  const overlay=new Map();
  let base=0,inst,gx=null,seq=0;
  const host=createHemuHost({onText:()=>{},snd:{tone:()=>{}},present:()=>{},
    snapLoad:(addr,bytes)=>{base=addr;bytes.set(ram,addr);},
    diskRead:(lba,cnt,bytes,dst)=>{
      for (let i=0;i<cnt;i++) bytes.set(overlay.get(lba+i) ||
        disk.subarray((lba+i)*512,(lba+i+1)*512),dst+i*512);
    },
    diskWrite:(lba,cnt,bytes,src)=>{
      for (let i=0;i<cnt;i++) overlay.set(lba+i,bytes.slice(src+i*512,src+(i+1)*512));
    }});
  Object.assign(host.env,{
    __host_msx:()=>320n,__host_msy:()=>240n,__host_msb:()=>0n,
    __host_wheel:()=>0n,__host_key:()=>-1n,__host_budget:()=>12000000n,
    __host_dt:()=>16n,__host_time:()=>0n,
    __jit_state:(reg,fl,rip)=>{
      jit.jitState(reg,fl,rip,base,inst.exports.memory,
        inst.exports.RdMem,inst.exports.WrMem,inst.exports.RasterHLE);
      return 1n;
    },
    __jit_compile:rip=>BigInt(jit.jitCompile(Number(rip))),
    __jit_run:rip=>BigInt(jit.jitRun(Number(rip))),
    __jit_x87:(a,b,c)=>jit.jitX87(a,b,c),
    __jit_dispatch:b=>BigInt(jit.jitDispatch(Number(b))),
    __jit_chain:(a,b)=>jit.jitChain(a,b),
    __jit_seg:(...a)=>jit.jitSeg(...a.map(Number))
  });
  jit.jitReset();
  inst=await WebAssembly.instantiate(module,{env:host.env});
  host.attach(inst);
  inst.exports.__rt_init();

  async function Run(cnt)
  {
    for (let i=0;i<cnt;i++) {
      inst.exports.__main();
      gx?.tick();
      await new Promise(r=>setImmediate(r));
    }
  }

  async function Wait(id,frames=1500)
  {
    for (let i=0;i<frames;i+=4) {
      const st=gx.status(id);
      if (["done","failed","error"].includes(st?.state)) return st;
      await Run(4);
    }
    throw new Error(`V5.03 job timed out: ${JSON.stringify(gx.status(id))}`);
  }

  await Run(300);
  gx=createGuestExec({inst,gBase:base,log:()=>{},onEvent:()=>{}});
  const probe=gx.probe();
  if (!probe.ok) throw new Error("V5.03 probe: "+probe.errors.join("; "));
  const out=gx.scratch.data+gx.scratch.dataSize-0x20000;
  const len=out-16,except=out-8,size=0x1FF00;
  const capture=readFileSync(new URL("Capture.HC",import.meta.url),"latin1");

  return async function Oracle(bytes)
  {
    const path=`C:/Home/CompilerOracle/Test${++seq}.HC`;
    const write=await Wait(gx.writeFile({id:"write"+seq,path,bytes}),2400);
    if (write.state!=="done") throw new Error("V5.03 write: "+JSON.stringify(write));
    gx.wr64(len,-1);
    gx.wr64(except,0);
    const values={OUT:out,LEN:len,EXCEPT:except,SIZE:size};
    const header=Object.entries(values).map(([k,v])=>`#define ORACLE_${k} 0x${v.toString(16).toUpperCase()}\n`).join("")+
      `#define ORACLE_FILE ${JSON.stringify(path)}\n`;
    const run=await Wait(gx.launch({id:"run"+seq,src:header+capture,name:"CompilerOracle"}));
    const count=gx.rd64(len);
    if (count<0 || count>=size) throw new Error("V5.03 output incomplete: "+JSON.stringify(run));
    const text=Buffer.from(gx.rdBytes(out,count)).toString("latin1");
    const error=Buffer.from(gx.rdBytes(except,8)).toString("latin1").replaceAll("\0","");
    await Run(30);
    return {out:text,except:error};
  };
}
