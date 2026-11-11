import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {recorded} from './return-width/cases.mjs';
for(const name of ['Returns','Context']) {
const test=recorded(name),result=compileHolyC(test.source,{lenient:false});assert.deepEqual(result.warnings,[]);
let out='';const host=createHost({onText:s=>out+=s});
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);instance.exports.__main();
const expected=test.output.split('\n').filter(line=>/^(VAL|CTX):/.test(line)),actual=out.trimEnd().split('\n');
assert.equal(actual.length,expected.length);
const differences=expected.flatMap((line,i)=>line===actual[i]?[]:[{native:line,wasm:actual[i]}]);
assert.equal(differences.length,0,JSON.stringify(differences.slice(0,10),null,2));
assert.equal(instance.exports.__sp.value,16777216n);
console.log(name,expected.length,'native values match.');
}
