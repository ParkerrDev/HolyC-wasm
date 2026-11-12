import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,recorded} from './doc-put/cases.mjs';
recorded('FormatOwned');
const original=read('NativePut.HC');
const print=original.slice(original.indexOf('public CDocEntry *DocPrint(')).replaceAll('DocPrint','DocPrintBad');
const put=original.slice(0,original.indexOf('public CDocEntry *DocPrint(')).replaceAll('DocPutS','DocPutSBad');
const fault=String.raw`
import U0 PutOriginalMark(I64 phase,I64 error,I64 locked,I64 len);
U0 PutOriginalFault()
{
  CDoc *doc=RecalcNew;
  U8 *st=StrNew("one\ttwo");
  I64 error=0;
  PutOriginalMark(0,0,0,0);
  try DocPutSBad(doc,st);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  PutOriginalMark(1,error,doc->locked_flags,StrLen(st));
  if (doc->owning_task==Fs) DocUnlock(doc);
  RecalcDel(doc);Free(st);
}
`;
const breakBody=read('Break.HC').replace(/\nPutBreak;\s*$/,'\n').replaceAll('DocPrint','DocPrintBad');
for(const [entry,source] of [['PutOriginalFault',put+fault],['PutBreak',print+breakBody]]){
  const r=compileHolyC(read('Common.HC')+source+'\nRaw(OFF);\n',{
    lenient:false,runtimeProfile:'keydev',exports:[entry]});
  assert.deepEqual(r.warnings,[]);
  const live=new Set(),host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}});
  let armed=false,calls=0;
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
    const alloc=host.env[name];host.env[name]=(...args)=>{
      if(armed && ++calls===2)return 0n;
      const p=alloc(...args);if(p>0n)live.add(p);return p;
    };
  }
  const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
  host.env.PutOriginalMark=(phase,error,locked,len)=>{
    if(!phase){armed=true;calls=0;}
    else {armed=false;assert.equal(error,0x6D654D74754Fn);assert(locked);assert.equal(len,3n);}
  };
  host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
  try{
    await host.run();const before=live.size;await host.run(entry);
    assert.equal(live.size-before,1,entry+' leaks one original-source allocation');
  }finally{armed=false;await host.dispose();}
  assert.equal(live.size,0);
}
console.log('Original-source controls retain a text entry/lock/modified delimiter on tag OOM and a format buffer on pending Break; staged output/failure gates detect both.');
