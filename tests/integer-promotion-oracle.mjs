import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {cases,fixture,recorded,hash} from './integer-promotion/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record');
const names=process.argv.slice(2).filter(arg=>arg!=='--record');
if(names.some(name=>!Object.hasOwn(cases,name)))throw new Error('Use --record and optional fixture names.');
const tests=(names.length?names:Object.keys(cases)).map(name=>({name,...(record?fixture(name):recorded(name))}));
const native=await QemuRun(tests.map(t=>t.source),{timeout:180});
console.log(native.backend,native.evidence);assert.equal(native.results.length,tests.length);
for(let i=0;i<tests.length;i++){
 const test=tests[i],result=native.results[i];assert.equal(result.except,'',test.name);
 assert.match(result.out,/^0:[0-9A-F]{16}\n/);assert(!/Warning|Compiler|Unused|Using 64-bit/.test(result.out));
 if(record){
  writeFileSync(new URL(`integer-promotion/${test.name}.out`,import.meta.url),result.out,'latin1');
  writeFileSync(new URL(`integer-promotion/${test.name}.native.json`,import.meta.url),JSON.stringify({manifest,backend:native.backend,evidence:native.evidence,...test.identity,except:result.except,outputSha256:hash(Buffer.from(result.out,'latin1'))},null,2)+'\n');
 }else assert.equal(result.out,test.output,test.name);
 console.log(test.name,result.out.trimEnd().split('\n').length,'native decisions');
}
