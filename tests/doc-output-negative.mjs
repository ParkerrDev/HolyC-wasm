import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {DOC_OUTPUT_SRC} from '../src/doc-output.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {rename,recordedSpecial} from './doc-output/cases.mjs';
recordedSpecial('Ownership');
const body=String.raw`
U0 ParseNegative(I64 mode)
{
  CDoc *doc=CAlloc(sizeof(CDoc));
  CDocEntry *entry;
  U8 *st="TX,\"owned\",A=";
  if (mode) st="TX,\"owned\",A='123456789'";
  doc->mem_task=Fs;
  QueInit(doc);
  entry=PrsDollarCmd(doc,st);
  if (entry->type_u8!=DOCT_ERROR) throw('PrsError');
  QueIns(entry,doc);
  DocEntryDel(doc,entry);
  Free(doc);
}
Raw(OFF);
`;
const lostTag=DOC_OUTPUT_SRC.replace('      DocParseOwnedFree(doc_e);\n      doc_e->type=DOCT_ERROR;',
  '      doc_e->type=DOCT_ERROR;');
const lostControl=DOC_OUTPUT_SRC.replace('    if (cc) CmpCtrlDel(cc);','');
assert.notEqual(lostTag,DOC_OUTPUT_SRC);assert.notEqual(lostControl,DOC_OUTPUT_SRC);
for(const [library,mode,name] of [[lostTag,0n,'discarded error-entry string ownership'],[lostControl,1n,'discarded compiler-control ownership']]){
  const r=compileHolyC(rename(library+body,'Bad'),{lenient:false,runtimeProfile:'keydev',exports:['ParseNegative']});
  assert.deepEqual(r.warnings,[]);
  const live=new Set(),host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}});
  for(const allocName of ['__malloc','__malloc_for','__malloc_kernel']){
    const alloc=host.env[allocName];host.env[allocName]=(...args)=>{const p=alloc(...args);if(p>0n)live.add(p);return p;};
  }
  const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
  host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
  try{
    await host.run();const before=live.size;
    await host.run('ParseNegative',mode);const delta=live.size-before;
    assert(delta>0,name);if(!mode)assert.equal(delta,1);
    console.log('Negative control detects',delta,'leaked blocks from',name);
  }finally{await host.dispose();}
  assert.equal(live.size,0);
}
