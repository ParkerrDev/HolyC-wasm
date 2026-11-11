import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {cases,fixture,recorded,hash} from './function-bind/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record'),names=[...cases,'FunctionExports'];
const tests=names.map(record?fixture:recorded),native=await QemuRun(tests.map(test=>test.input));
console.log(native.backend,native.evidence);
for(let i=0;i<tests.length;i++) {
  const test=tests[i],result=native.results[i];assert.equal(result.except,'',test.name);
  if(record) {
    writeFileSync(new URL('function-bind/'+test.name+'.out',import.meta.url),result.out,'latin1');
    writeFileSync(new URL('function-bind/'+test.name+'.native.json',import.meta.url),JSON.stringify({
      manifest,backend:native.backend,evidence:native.evidence,...test.identity,except:result.except,
      outputSha256:hash(Buffer.from(result.out,'latin1'))},null,2)+'\n');
  } else assert.equal(result.out,test.output,test.name);
  console.log(test.name,result.out.length);
}
