import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read} from './doc-put/cases.mjs';
const r=compileHolyC(read('Common.HC')+read('Fault.HC'),{lenient:false,runtimeProfile:'keydev',exports:['PutFault','PutFaultBreak']});
assert.deepEqual(r.warnings,[]);
const live=new Map(),host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}});
let armed=false,calls=0,failAt=0,persistent=false,failed=0,abort=false,lockedCalls=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(armed){
      calls++;
      if(abort && instance.exports.PutFaultBreak(0n) && ++lockedCalls===3){
        instance.exports.PutFaultBreak(1n);failed++;return 0n;
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
host.env.PutFaultMark=phase=>{if(!phase){armed=true;calls=0;failed=0;lockedCalls=0;}else armed=false;};
host.env.PutFaultPtr=(ptr,owner)=>{if(ptr)assert.equal(live.get(ptr),owner,'document entry/string owner');};
const instance=new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env});host.attach(instance);
const state=()=>({live:[...live].sort((a,b)=>a[0]<b[0]?-1:1),heap:host.state.heapPtr,stack:instance.exports.__sp.value,
  owners:host.state.tasks.map(t=>[t.ptr,t.allocations])});
const OutMem=0x6D654D74754Fn,DocCaps=0x73706143636F44n,LexCaps=0x7370614378654Cn;
let count=0;
try{
  await host.run();const baseline=state();
  for(const foreign of [0n,1n])for(const inherited of [0n,1n])for(const fmt of [0n,1n])for(let mode=0n;mode<6n;mode++){
    failAt=0;const expected=mode===4n?DocCaps:mode===5n?LexCaps:0n;
    assert.equal(await host.run('PutFault',mode,foreign,inherited,fmt),expected);
    const sites=calls;assert(sites>0);assert.deepEqual(state(),baseline);
    for(persistent of [false,true])for(let n=1;n<=sites;n++){
      failAt=n;const error=await host.run('PutFault',mode,foreign,inherited,fmt);assert(failed>0);
      assert(error===OutMem || error===0n || error===expected,`mode ${mode}, site ${n}, error ${error}`);
      assert.deepEqual(state(),baseline);count++;
      failAt=0;assert.equal(await host.run('PutFault',mode,foreign,inherited,fmt),expected);assert.deepEqual(state(),baseline);
    }
  }
  failAt=0;abort=true;
  for(const foreign of [0n,1n])for(const fmt of [0n,1n]){
    assert.equal(await host.run('PutFault',0n,foreign,0n,fmt),0x6B61657242n);
    assert.equal(failed,1);assert.deepEqual(state(),baseline);
  }
  abort=false;
}finally{armed=false;await host.dispose();}
assert.equal(live.size,0);
console.log(count,'one-shot/persistent output and format-buffer allocation failures plus four pending-Break/OOM collisions restore document/input on thrown errors, preserve inherited/new locks, current/foreign owners, heap/stack and retry; native parser error-entry fallback remains explicit.');
