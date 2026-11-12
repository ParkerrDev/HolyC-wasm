import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,recorded,rename} from './doc-clear/cases.mjs';
recorded('Clear');
const body=String.raw`
import U0 ClearOriginalMark(I64 phase,I64 error,I64 locked);
U0 ClearOriginalFault()
{
  CDoc *doc=RecalcNew;
  I64 error=0;
  RecalcEntry(doc,DOCT_TEXT,"first");RecalcEntry(doc,DOCT_TEXT,"second");
  ClearOriginalMark(0,0,0);
  try DocClearOriginal(doc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  ClearOriginalMark(1,error,doc->locked_flags);
  if (doc->owning_task==Fs) DocUnlock(doc);
  RecalcDel(doc);
}
Raw(OFF);
`;
const r=compileHolyC(read('../doc-put/Common.HC')+rename(read('NativeClear.HC'),'Original')+body,
  {lenient:false,runtimeProfile:'keydev',exports:['ClearOriginalFault']});
assert.deepEqual(r.warnings,[]);
const live=new Set(),host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}});
let armed=false,calls=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(armed && ++calls===1)return 0n;
    const p=alloc(...args);if(p>0n)live.add(p);return p;
  };
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
host.env.ClearOriginalMark=(phase,error,locked)=>{
  if(!phase){armed=true;calls=0;}
  else {armed=false;assert.equal(error,0x6D654D74754Fn);assert(locked,'unhandled original Clear error retains lock');}
};
host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
try{
  await host.run();const before=live.size;await host.run('ClearOriginalFault');assert.equal(live.size,before);
}finally{armed=false;await host.dispose();}
assert.equal(live.size,0);
console.log('Original-source Clear retains its acquired lock after layout OOM; the CL-chain fault gate detects this failure.');
