import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fixture,recorded,hash} from './doc-clear/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const args=process.argv.slice(2),record=args.includes('--record');
if(args.some(arg=>arg.startsWith('--') && arg!=='--record'))throw new Error('Use --record to refresh native proof.');
const names=args.filter(arg=>!arg.startsWith('--'));
const tests=(names.length?names:['Clear','Break','Owner','Reject']).map(record?fixture:recorded);
const native=await QemuRun(tests.flatMap(test=>test.inputs),{timeout:240});
console.log(native.backend,native.evidence);
let offset=0;
for(const test of tests){
  const results=native.results.slice(offset,offset+test.inputs.length);offset+=test.inputs.length;
  assert.equal(results.length,test.inputs.length);
  for(const r of results){assert.equal(r.except,'',test.name);assert.equal(r.out,results[0].out,test.name);}
  if(record){
    writeFileSync(new URL('doc-clear/'+test.name+'.out',import.meta.url),results[0].out,'latin1');
    writeFileSync(new URL('doc-clear/'+test.name+'.native.json',import.meta.url),JSON.stringify({manifest,
      backend:native.backend,evidence:native.evidence,...test.identity,results,
      outputSha256:hash(Buffer.from(results[0].out,'latin1'))},null,2)+'\n');
  }else assert.equal(results[0].out,test.output,test.name);
  console.log(results[0].out.trim(),test.name==='Reject'?'staged rejection preserves native state/heap':'stock, copied and staged clear agree');
}
