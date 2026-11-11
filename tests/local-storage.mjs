import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {cases,recorded} from './local-storage/cases.mjs';
let values=0,registers=0;
for(const name of Object.keys(cases)){
 const test=recorded(name),result=compileHolyC(test.source.toString('latin1'),{lenient:false,traceLocals:true});
 assert.deepEqual(result.diagnostics,[]);assert.deepEqual(result.warnings,[]);
 if(name==='Basic'){
  const plain=compileHolyC(test.source.toString('latin1'),{lenient:false});
  assert.deepEqual(plain.bytes,result.bytes,'allocation trace must not change generated code');
  assert(!Object.hasOwn(plain,'localRegisters'));
 }
 let output='';const host=createHost({onText:text=>output+=text}),instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
 host.attach(instance);instance.exports.__main();
 assert.deepEqual(output.trimEnd().split('\n'),test.values,name+' values');
 for(const fun of test.names){
  const expected=test.registers.filter(row=>row.fun===fun).map(({name,reg})=>({name,reg}));
  assert(expected.length>0,fun+' must have native inspection');
  assert.deepEqual(result.localRegisters.get(fun),expected,fun+' registers');
 }
 values+=test.values.length;registers+=test.registers.length;
 console.log(name,test.values.length,'values and',test.registers.length,'native register assignments');
}
console.log(values,'native values and',registers,'register assignments matched');
