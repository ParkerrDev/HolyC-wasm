import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {cases,fixture,recorded,hash} from './que-vector/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const args=process.argv.slice(2),record=args.includes('--record');
if(args.some(arg=>arg.startsWith('--') && arg!=='--record'))throw new Error('Use --record to update native evidence.');
const names=args.filter(arg=>!arg.startsWith('--'));
const tests=(names.length?names:cases).map(record?fixture:recorded);
const native=await QemuRun(tests.flatMap(test=>test.inputs));
console.log(native.backend,native.evidence);
for(let i=0;i<tests.length;i++) {
  const test=tests[i],results=native.results.slice(i*2,i*2+2);
  assert.equal(results.length,2);
  for(const result of results){assert.equal(result.except,'',test.name);assert.equal(result.out,results[0].out,test.name);}
  if(record) {
    writeFileSync(new URL('que-vector/'+test.name+'.out',import.meta.url),results[0].out,'latin1');
    writeFileSync(new URL('que-vector/'+test.name+'.native.json',import.meta.url),JSON.stringify({
      manifest,backend:native.backend,evidence:native.evidence,...test.identity,results,
      outputSha256:hash(Buffer.from(results[0].out,'latin1'))},null,2)+'\n');
  } else assert.equal(results[0].out,test.output,test.name);
  console.log(results[0].out.trim(),'stock and ported native agree');
}
