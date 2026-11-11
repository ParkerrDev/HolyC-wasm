import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHost} from '../src/runtime/host.js';
import {recorded} from './local-storage/cases.mjs';
const mutations=[
 {name:'discard unused expression references',file:'local-storage.js',from:'if (n.kind==="Sizeof" || n.kind==="Offset") return;',to:'if (n.kind==="Sizeof" || n.kind==="Offset" || n.kind==="ExprStmt" && n.expr.kind!=="Call") return;',test:'Optimizer'},
 {name:'narrow every local',file:'codegen.js',from:'d.nativeReg=reg>=0 && reg<16;',to:'d.nativeReg=false;',test:'Basic'},
 {name:'keep spilled locals wide',file:'local-storage.js',from:'return entries;',to:'return entries.map(e=>e.reg===REG_UNDEF?{...e,reg:6}:e);',test:'Basic'},
 {name:'stable tie ordering',file:'local-storage.js',from:'scoreSort(eligible);',to:'eligible.sort((a,b)=>a.score>b.score?-1:a.score<b.score?1:0);',test:'Anon'},
 {name:'forget try/catch spills',file:'local-storage.js',from:'if (n.kind==="TryCatch") disabled=true;',to:'if (n.kind==="TryCatch") disabled=false;',test:'Control'},
 {name:'return truncated compound value',file:'codegen.js',from:'const wide=isInt(t) && ["*","<<"].includes(base);',to:'const wide=false;',test:'Ops'},
 {name:'read spilled casts as register bits',file:'codegen.js',from:'narrowCasts.has(name)',to:'false',test:'Cast',replaceAll:true},
 {name:'omit unnamed parameters',file:'local-storage.js',from:'...fn.params.map(p=>',to:'...fn.params.filter(p=>p.name).map(p=>',test:'Anon'}
];
for(const mutation of mutations){
 const dir=mkdtempSync(join(tmpdir(),'holyc-storage-'));
 try{
  cpSync(new URL('../src',import.meta.url),join(dir,'src'),{recursive:true});
  writeFileSync(join(dir,'package.json'),'{"type":"module"}');
  const path=join(dir,'src',mutation.file),original=readFileSync(path,'utf8');
  assert.equal(original.split(mutation.from).length,mutation.replaceAll?3:2,mutation.name);
  writeFileSync(path,original.replaceAll(mutation.from,mutation.to));
  const {compileHolyC}=await import(pathToFileURL(join(dir,'src/compiler.js'))),test=recorded(mutation.test);
  const result=compileHolyC(test.source.toString('latin1'),{lenient:false});assert.deepEqual(result.warnings,[]);
  let output='';const host=createHost({onText:s=>output+=s}),instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
  host.attach(instance);instance.exports.__main();
  const actual=output.trimEnd().split('\n');assert.equal(actual.length,test.values.length);
  const differences=test.values.filter((line,i)=>line!==actual[i]).length;
  assert(differences>0,mutation.name+' must fail native observable values');
  console.log('Negative control:',mutation.name,'fails',differences,'native values');
 }finally{rmSync(dir,{recursive:true,force:true});}
}
