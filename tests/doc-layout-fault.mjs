import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read} from './doc-layout/cases.mjs';
const source=read('Common.HC')+read('LayoutFault.HC')+'\nRaw(OFF);\n';
const r=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports:['LayoutFault']});assert.deepEqual(r.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();
let armed=false,calls=0,failAt=0,before,after,owner,owners=[];
const state=nodes=>({nodes,live:live.size,heap:host.state.heapPtr,stack:instance.exports.__sp.value,owners:host.state.tasks.map(t=>[t.ptr,t.allocations])});
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(armed && ++calls===failAt)return 0n;
    const p=alloc(...args);if(p>0n)live.add(p);
    if(armed && p>0n)owners.push({name,owner:args[1]});
    return p;
  };
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
host.env.LayoutFaultMark=(phase,ptr,nodes,error)=>{
  if(!phase){owner=ptr;before=state(nodes);calls=0;owners=[];armed=true;}
  else{armed=false;after={...state(nodes),error};}
};
const instance=new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env});host.attach(instance);
let count=0;
try {
  await host.run();const baseline=live.size;
  for(const foreign of [0n,1n])for(let mode=0n;mode<5n;mode++) {
    failAt=0;await host.run('LayoutFault',mode,foreign);await host.run('LayoutFault',mode,foreign);
    const sites=calls,settledHeap=host.state.heapPtr;assert(sites>0);assert.equal(live.size,baseline);
    for(let sweep=0;sweep<2;sweep++)for(let n=1;n<=sites;n++) {
      failAt=n;assert.equal(await host.run('LayoutFault',mode,foreign),0x6D654D74754Fn);failAt=0;
      assert.equal(after.error,0x6D654D74754Fn);assert.equal(after.stack,before.stack);if(mode!==3n)assert.equal(after.heap,before.heap,'unpublished failure '+mode+':'+foreign+':'+n);
      const removed=Number(before.nodes-after.nodes);assert(removed>=0);
      if(mode!==3n)assert.equal(removed,0);
      assert.equal(after.live,before.live-2*removed);
      for(const [ptr,size] of after.owners)
        assert.equal(size,before.owners.find(t=>t[0]===ptr)[1]-(ptr===owner?2*removed:0));
      for(const allocation of owners){assert.equal(allocation.name,foreign?'__malloc_for':'__malloc');if(foreign)assert.equal(allocation.owner,owner);}
      assert.equal(live.size,baseline);assert.equal(host.state.heapPtr,settledHeap);assert.equal(host.state.tasks.length,1);count++;
    }
  }
} finally {armed=false;await host.dispose();}
assert.equal(live.size,0);
console.log(count,'actual allocation failures preserve split input, owned link copies and per-join wrap cleanup; current/foreign task ownership, immediate retry and disposal pass.');
