import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {recordedReject} from './doc-life/cases.mjs';
const test=recordedReject(),r=compileHolyC(test.source,{lenient:false,runtimeProfile:'keydev'});assert.deepEqual(r.warnings,[]);
let armed=false,calls=0,output='';const live=new Set();
const host=createTaskHost({gfx:new Framebuffer(null),onText:s=>output+=s,ansi:false});
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
 const alloc=host.env[name];host.env[name]=(...args)=>{if(armed)calls++;const p=alloc(...args);if(p>0n)live.add(p);return p;};
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};host.env.RecalcRejectMark=phase=>{armed=!phase;};
host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
try{await host.run();assert.equal(output,'LifeReject:168\n');assert.equal(calls,0);}finally{await host.dispose();}assert.equal(live.size,0);
console.log('168 Top/Bottom/reset rejections preserve cursor, document, locks and exception chains before allocation or destruction.');
