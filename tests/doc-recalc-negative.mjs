import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {DOC_RECALC_SRC} from '../src/doc-recalc.js';
import {read} from './doc-recalc/cases.mjs';
const start=DOC_RECALC_SRC.indexOf('public Bool DocRecalc'),prefix=DOC_RECALC_SRC.slice(0,start);
const cleanup='  } catch {\n    if (unlock) DocHostRecalcUnlock(doc,marker);\n  }';
assert(DOC_RECALC_SRC.includes(cleanup));
const broken=(prefix+DOC_RECALC_SRC.slice(start).replace('  try {','  {').replace(cleanup,'  }')).replace(/\bDocRecalc\b/g,'DocRecalcUnprotected');
const source=broken+read('Common.HC')+read('RecalcFault.HC').replace(/\bDocRecalc\b/g,'DocRecalcUnprotected')+'\nRaw(OFF);\n';
const result=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports:['RecalcFault']});
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}});let armed=false;
const alloc=host.env.__malloc;host.env.__malloc=(...args)=>{if(armed){armed=false;return 0n;}return alloc(...args);};
host.env.RecalcFaultMark=phase=>{armed=!phase;};
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
let failure;
try{
 await host.run();
 await assert.rejects(()=>host.run('RecalcFault',0n,0n,0n),error=>{
  failure=error;
  return error instanceof WebAssembly.Exception && error.is(instance.exports.__exception_tag) &&
   error.getArg(instance.exports.__exception_tag,0)===Buffer.from('RecalcLk').readBigInt64LE();
 });
}finally{
 if(failure)await assert.rejects(()=>host.dispose(),error=>error===failure);
 else await host.dispose();
}
console.log('Negative control: removing cleanup from the same normal pass leaves its document/break lock held after an actual allocation failure; the ownership gate rejects it.');
