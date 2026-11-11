import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {cases,fixture,recorded,hash} from './hash/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const args=process.argv.slice(2),record=args.includes('--record');
if(args.some(arg=>arg.startsWith('--') && arg!=='--record'))throw new Error('Use --record to update native evidence.');
const names=args.filter(arg=>!arg.startsWith('--'));
const tests=(names.length?names:cases).map(record?fixture:recorded);
const native=await QemuRun(tests.map(test=>test.input));
console.log(native.backend,native.evidence);
for(let i=0;i<tests.length;i++) {
  const test=tests[i],result=native.results[i];
  assert.equal(result.except,'',test.name+': '+JSON.stringify(result));
  if(record) {
    writeFileSync(new URL('hash/'+test.name+'.out',import.meta.url),result.out,'latin1');
    writeFileSync(new URL('hash/'+test.name+'.native.json',import.meta.url),JSON.stringify({
      manifest,backend:native.backend,evidence:native.evidence,...test.identity,
      outputSha256:hash(Buffer.from(result.out,'latin1')),except:result.except},null,2)+'\n');
  } else assert.equal(result.out,test.output,test.name);
  console.log(result.out.trim());
}
