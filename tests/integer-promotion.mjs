import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {cases,recorded} from './integer-promotion/cases.mjs';
let count=0;
for(const name of Object.keys(cases)){
 const test=recorded(name),result=compileHolyC(test.source.toString('latin1'),{lenient:false});
 assert.deepEqual(result.warnings,[]);let output='';
 const host=createHost({ansi:false,onText:s=>output+=s}),instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
 host.attach(instance);instance.exports.__main();
 const expected=test.output.split('\n'),actual=output.split('\n');assert.equal(actual.length,expected.length,name);
 for(let i=0;i<expected.length;i++)assert.equal(actual[i],expected[i],`${name} decision ${i}`);
 count+=expected.length-1;console.log(name,expected.length-1,'native decisions matched');
}
console.log(count,'source-bound integer promotion decisions matched');
