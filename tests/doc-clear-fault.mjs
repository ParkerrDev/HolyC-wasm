import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read} from './doc-clear/cases.mjs';
const r=compileHolyC(read('../doc-put/Common.HC')+read('Fault.HC'),{lenient:false,runtimeProfile:'keydev',exports:['ClearFault','ClearFaultBreak']});
assert.deepEqual(r.warnings,[]);
const live=new Map(),host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}});
let armed=false,calls=0,failAt=0,persistent=false,failed=0,abort=false,lockedCalls=0;
let before,after,oldPtrs,newPtrs,ptrs,oldStack;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(armed){
      calls++;
      if(abort && instance.exports.ClearFaultBreak(0n) && ++lockedCalls===3){
        instance.exports.ClearFaultBreak(1n);failed++;return 0n;
      }
      if(failAt && (calls===failAt || persistent && calls>failAt)){failed++;return 0n;}
    }
    const p=alloc(...args);
    if(p>0n)live.set(p,name==='__malloc_for'?args[1]:name==='__malloc_kernel'?
      (host.state.tasks[0]?.ptr??0n):(host.state.tasks.find(t=>t.status==='running')?.ptr??0n));
    return p;
  };
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
const sorted=m=>[...m].sort((a,b)=>a[0]<b[0]?-1:1);
host.env.ClearFaultMark=phase=>{
  if(phase===0n)ptrs=oldPtrs=new Map();
  else if(phase===1n){before=new Map(live);oldStack=instance.exports.__sp.value;armed=true;calls=0;failed=0;lockedCalls=0;}
  else if(phase===2n){armed=false;after=new Map(live);ptrs=newPtrs=new Map();assert.equal(instance.exports.__sp.value,oldStack);}
  else{
    for(const p of oldPtrs.keys())before.delete(p);
    for(const [p,owner] of newPtrs)before.set(p,owner);
    assert.deepEqual(sorted(after),sorted(before),'only published document ownership remains after clear/failure');
  }
};
host.env.ClearFaultPtr=(ptr,owner)=>{if(ptr){assert.equal(live.get(ptr),owner);ptrs.set(ptr,owner);}};
const instance=new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env});host.attach(instance);
const state=()=>({live:sorted(live),heap:host.state.heapPtr,stack:instance.exports.__sp.value,
  owners:host.state.tasks.map(t=>[t.ptr,t.allocations])});
const OutMem=0x6D654D74754Fn,DocCaps=0x73706143636F44n;
let count=0;
try{
  await host.run();
  for(const foreign of [0n,1n])for(const inherited of [0n,1n])for(const holds of [0n,1n])for(let mode=0n;mode<4n;mode++){
    failAt=0;assert.equal(await host.run('ClearFault',mode,foreign,inherited,holds),0n);
    const sites=calls;assert(sites>0);const baseline=state();
    for(persistent of [false,true])for(let n=1;n<=sites;n++){
      failAt=n;const error=await host.run('ClearFault',mode,foreign,inherited,holds);assert(failed>0);
      assert(error===OutMem || error===DocCaps || error===0n,`mode ${mode}, site ${n}, error ${error}`);
      assert.deepEqual(state(),baseline);count++;
      failAt=0;assert.equal(await host.run('ClearFault',mode,foreign,inherited,holds),0n);assert.deepEqual(state(),baseline);
    }
  }
  failAt=0;abort=true;
  for(const foreign of [0n,1n])for(const holds of [0n,1n]){
    const baseline=state();
    assert.equal(await host.run('ClearFault',1n,foreign,0n,holds),0x6B61657242n);
    assert.equal(failed,1);assert.deepEqual(state(),baseline);
  }
  abort=false;
}finally{armed=false;await host.dispose();}
assert.equal(live.size,0);
console.log(count,'one-shot/persistent CL-chain failures plus four pending-Break/OOM collisions preserve reachable queues, current/foreign owners, inherited/new locks and exception chains; cleanup, error-entry removal/retry and disposal pass.');
