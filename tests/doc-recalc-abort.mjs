import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read} from './doc-recalc/cases.mjs';
const r=compileHolyC(read('Common.HC')+read('RecalcAbort.HC')+'\nRaw(OFF);\n',{lenient:false,runtimeProfile:'keydev',exports:['RecalcAbort']});assert.deepEqual(r.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();let armed=false,accepted=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
 const alloc=host.env[name];host.env[name]=(...args)=>{
  if(armed){armed=false;assert(host.breakTask());accepted++;return 0n;}
  const p=alloc(...args);if(p>0n)live.add(p);return p;
 };
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
host.env.RecalcAbortMark=phase=>{armed=!phase;};
host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
try{
 await host.run();const base=live.size;
 for(let i=0;i<5;i++){await host.run('RecalcAbort');assert.equal(live.size,base);assert.equal(host.state.tasks.length,1);}
}finally{await host.dispose();}assert.equal(live.size,0);assert.equal(accepted,5);
console.log('Five real pending-Break/allocation-failure collisions release the document lock, restore prior bookkeeping and exception chain, and permit immediate retry.');
