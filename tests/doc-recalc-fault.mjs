import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read} from './doc-recalc/cases.mjs';
const r=compileHolyC(read('Common.HC')+read('RecalcFault.HC')+'\nRaw(OFF);\n',{lenient:false,runtimeProfile:'keydev',exports:['RecalcFault']});
assert.deepEqual(r.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();
let armed=false,calls=0,failAt=0,before,after,owner,owners=[];
const state=nodes=>({nodes,live:live.size,stack:instance.exports.__sp.value,owners:host.state.tasks.map(t=>[t.ptr,t.allocations])});
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
 const alloc=host.env[name];host.env[name]=(...args)=>{
  if(armed && ++calls===failAt)return 0n;
  const p=alloc(...args);if(p>0n)live.add(p);
  if(armed && p>0n)owners.push({name,owner:args[1]});return p;
 };
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
host.env.RecalcFaultMark=(phase,ptr,nodes,error)=>{
 if(!phase){owner=ptr;before=state(nodes);calls=0;owners=[];armed=true;}
 else{armed=false;after={...state(nodes),error};}
};
const instance=new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env});host.attach(instance);
let count=0;
try {
 await host.run();const baseline=live.size;
 for(const foreign of [0n,1n])for(const inherited of [0n,1n])for(let mode=0n;mode<3n;mode++){
  failAt=0;await host.run('RecalcFault',mode,foreign,inherited);await host.run('RecalcFault',mode,foreign,inherited);
  const sites=calls,heap=host.state.heapPtr;assert(sites>0);assert.equal(live.size,baseline);
  for(let sweep=0;sweep<2;sweep++)for(let n=1;n<=sites;n++){
   failAt=n;assert.equal(await host.run('RecalcFault',mode,foreign,inherited),0x6D654D74754Fn);failAt=0;
   assert.equal(after.stack,before.stack);
   const nodeDelta=Number(after.nodes-before.nodes);
   //Each completed wrap adds a soft newline plus a tagged text node; joins remove a tagged node.
   const allocDelta=mode?nodeDelta*3/2:nodeDelta*2;
   assert.equal(after.live,before.live+allocDelta,`${mode}:${foreign}:${inherited}:${n}`);
   for(const [ptr,size] of after.owners)assert.equal(size,before.owners.find(t=>t[0]===ptr)[1]+(ptr===owner?allocDelta:0));
   for(const a of owners){assert.equal(a.name,foreign?'__malloc_for':'__malloc');if(foreign)assert.equal(a.owner,owner);}
   assert.equal(live.size,baseline);assert.equal(host.state.heapPtr,heap);assert.equal(host.state.tasks.length,1);count++;
  }
 }
} finally {armed=false;await host.dispose();}
assert.equal(live.size,0);console.log(count,'actual normal-layout allocation failures preserve text, valid queues, inherited locks, exception chains and task ownership; immediate retries and disposal pass.');
