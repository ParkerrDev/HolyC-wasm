import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHost} from '../src/runtime/host.js';
import {recorded} from './integer-promotion/cases.mjs';
const mutations=[
 {name:'unsigned propagation',file:'types.js',from:'if (a.bits>b.bits) return a;',to:'return a.signed && b.signed?T.I64:T.U64;',test:'Memory'},
 {name:'lost immediate width',file:'fold.js',from:'return {value:BigInt.asIntN(64,value),unsigned,bits};',to:'return {value:BigInt.asIntN(64,value),unsigned,bits:64};',test:'Static'},
 {name:'lost comparison flags',file:'codegen.js',from:'return [0,1,2].some(phase=>isUnsigned(this.peekType(node,phase)));',to:'return isUnsigned(this.peekType(node));',test:'Optimize'},
 {name:'lost chain class',file:'codegen.js',from:'if (integerChain) chainUnsigned ||= unsigned;',to:'if (integerChain) chainUnsigned=unsigned;',test:'Chain'}
];
for(const mutation of mutations){
 const dir=mkdtempSync(join(tmpdir(),'holyc-promotion-'));
 try {
  cpSync(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});writeFileSync(join(dir,'package.json'),'{"type":"module"}');
  const path=join(dir,'src',mutation.file),original=readFileSync(path,'utf8');assert.equal(original.split(mutation.from).length,2,mutation.name);
  writeFileSync(path,original.replace(mutation.from,mutation.to));
  const {compileHolyC}=await import(pathToFileURL(join(dir,'src/compiler.js'))),test=recorded(mutation.test);
  const result=compileHolyC(test.source.toString('latin1'),{lenient:false});assert.deepEqual(result.warnings,[]);
  let output='';const host=createHost({onText:s=>output+=s}),instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);instance.exports.__main();
  const expected=test.output.split('\n'),actual=output.split('\n');assert.equal(actual.length,expected.length);
  const differences=expected.filter((line,i)=>line!==actual[i]).length;assert(differences>0,mutation.name+' must fail native proof');
  console.log('Negative control:',mutation.name,'fails',differences,'native decisions');
 }finally{rmSync(dir,{recursive:true,force:true});}
}
