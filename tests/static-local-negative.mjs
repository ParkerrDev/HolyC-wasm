import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createTaskHost} from '../src/runtime/tasks.js';
import {recorded} from './static-local/cases.mjs';
const dir=mkdtempSync(join(tmpdir(),'holyc-static-'));
try {
 cpSync(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 writeFileSync(join(dir,'package.json'),'{"type":"module"}');
 const file=join(dir,'src/codegen.js'),source=readFileSync(file,'utf8'),needle='    this.collectStatics();';
 //The program and the parts compiled while it runs (runSegment) both collect statics.
 assert.equal(source.split(needle).length,3);
 writeFileSync(file,source.replaceAll(needle,''));
 const {compileHolyC}=await import(pathToFileURL(join(dir,'src/compiler.js')));
 for(const name of ['Lifetime','Failure']) {
  const test=recorded(name),result=compileHolyC(test.source,{lenient:false});
  let out='';const host=createTaskHost({onText:s=>out+=s,jit:result.jit}); //It prints, so it is a task.
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  await host.run();await host.dispose();assert.notEqual(out,test.proof.out);
  if(name==='Failure')assert.equal(out,'BEFORE\nAFTER\n');
  console.log('Negative control: call-frame static storage fails',name,'native output');
 }
} finally {rmSync(dir,{recursive:true,force:true});}
