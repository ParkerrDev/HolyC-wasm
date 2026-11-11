import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,rename,recordedOwnership} from './doc-life/cases.mjs';
recordedOwnership();
const source=rename(read('NativeLife.HC')+read('../doc-recalc/Common.HC')+read('Common.HC')+read('LifeOwned.HC'),'Original')+'\nRaw(OFF);\n';
const r=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports:['LifeOwned']});assert.deepEqual(r.warnings,[]);
for(const [del,pending,leaks] of [[0n,0n,2],[1n,1n,3]]){
 const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();
 for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
  const alloc=host.env[name];host.env[name]=(...args)=>{const p=alloc(...args);if(p>0n)live.add(p);return p;};
 }
 const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
 let start,after;
 host.env.LifeOwnedMark=(phase,owner,retained)=>{if(phase<0n)start=live.size;else if(phase===1n)after={live:live.size,retained:Number(retained)};};
 host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
 try{await host.run();const before=live.size;await host.run('LifeOwned',del,0n,0n,pending);assert.equal(live.size-before,leaks);assert.equal(after.live-start,after.retained+leaks);}finally{await host.dispose();}assert.equal(live.size,0);
}
console.log('Negative controls: original reset loses two orphan tags; original pending-Break deletion additionally loses the CDoc. The port ownership gate detects both.');
