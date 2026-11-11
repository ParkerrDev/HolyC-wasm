import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHost} from '../src/runtime/host.js';
import {recorded} from './return-width/cases.mjs';
const dir=mkdtempSync(join(tmpdir(),'holyc-return-'));
try {
 cpSync(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
 writeFileSync(join(dir,'package.json'),'{"type":"module"}');
 const file=join(dir,'src/codegen.js'),source=readFileSync(file,'utf8');
 const needle='this.genExprCoerce(s.expr,isInt(this.fn.retType)?T.I64:this.fn.retType);';
 assert.equal(source.split(needle).length,2);
 writeFileSync(file,source.replace(needle,'this.genExprCoerce(s.expr,this.fn.retType);'));
 const {compileHolyC}=await import(pathToFileURL(join(dir,'src/compiler.js'))),test=recorded();
 const result=compileHolyC(test.source,{lenient:false});let out='';
 const host=createHost({onText:s=>out+=s});
 const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);instance.exports.__main();
 const expected=test.output.split('\n').filter(line=>line.startsWith('VAL:')),actual=out.trimEnd().split('\n');
 assert.equal(actual.length,expected.length);
 const count=expected.filter((line,i)=>line!==actual[i]).length;
 assert(count>0);console.log('Negative control: truncating every return fails',count,'native values.');
} finally {rmSync(dir,{recursive:true,force:true});}
