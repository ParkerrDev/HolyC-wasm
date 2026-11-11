import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {hash} from './local-storage/cases.mjs';
const native=process.argv.includes('--native');
if(process.argv.slice(2).some(arg=>arg!=='--native'))throw new Error('Use optional --native to repeat original evidence.');
const values=out=>out.split('\n').filter(line=>/^(VAL|Static):/.test(line));
const tests=['StaticLocalLifetime','LocalReturnWidth'].map(name=>{
 const source=readFileSync(new URL(`probes/${name}.HC`,import.meta.url)),wrapper=readFileSync(new URL(`probes/${name}Inspect.HC`,import.meta.url));
 const proof=JSON.parse(readFileSync(new URL(`probes/${name}.native.json`,import.meta.url)));
 assert.equal(proof.sourceSha256,hash(source));assert.equal(proof.wrapperSha256,hash(wrapper));
 assert.equal(proof.captureSha256,hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url))));
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.except,'');
 assert.equal(proof.outputSha256,hash(Buffer.from(proof.out,'latin1')));
 return {name,source,wrapper,proof};
});
if(native){
 const {QemuRun}=await import('./oracle/Qemu.mjs');
 const result=await QemuRun(tests.map(test=>Buffer.concat([test.source,test.wrapper])));
 console.log(result.backend,result.evidence);
 tests.forEach((test,i)=>{assert.equal(result.results[i].except,'');assert.deepEqual(values(result.results[i].out),values(test.proof.out),test.name);});
}
for(const test of tests){
 const result=compileHolyC(test.source.toString('latin1'),{lenient:false});assert.deepEqual(result.warnings,[]);
 let output='';const host=createHost({onText:s=>output+=s}),instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
 host.attach(instance);instance.exports.__main();
 const expected=values(test.proof.out),actual=values(output);assert.equal(actual.length,expected.length);
 const differences=expected.flatMap((line,i)=>line===actual[i]?[]:[{native:line,wasm:actual[i]}]);
 console.log(test.name,differences.length?'known mismatch':'matched',differences);
 if(differences.length)process.exitCode=1;
}
