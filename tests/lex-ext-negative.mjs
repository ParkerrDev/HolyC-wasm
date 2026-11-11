import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,rename,recorded,recordedLeak} from './lex-ext/cases.mjs';
recorded();recordedLeak();
const source=rename(read('NativeExt.HC')+read('ExtFault.HC'),'Original');
const result=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports:['ExtFaultSetup','ExtFaultCase','ExtFaultDone']});assert.deepEqual(result.warnings,[]);
for(const [allocation,echo,leaks,error] of [[0,1n,1,0x6F68634578654Cn],[3,0n,2,0x6D654D74754Fn]]){
 const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();let armed=false,calls=0;
 for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
  const alloc=host.env[name];host.env[name]=(...args)=>{if(armed && ++calls===allocation)return 0n;const p=alloc(...args);if(p>0n)live.add(p);return p;};
 }
 const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};host.env.ExtFaultMark=phase=>{armed=!phase;if(armed)calls=0;};
 host.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}));
 try{await host.run('ExtFaultSetup');const count=live.size;assert.equal(await host.run('ExtFaultCase',0n,echo,0n),error);assert.equal(live.size-count,leaks);await host.run('ExtFaultDone');}
 finally{armed=false;await host.dispose();}assert.equal(live.size,0);
}
console.log('Original-source negative controls lose one detached string on echo failure and two strings on failed concatenation; the ownership gate catches both.');
