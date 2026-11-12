import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fixture,recorded,hash} from './doc-put/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const args=process.argv.slice(2),record=args.includes('--record');
if(args.some(arg=>arg.startsWith('--') && arg!=='--record'))throw new Error('Use --record to refresh native proof.');
const names=args.filter(arg=>!arg.startsWith('--'));
const tests=(names.length?names:['Put','Owner','Break','FormatOwned','Reject','RejectOwned']).map(record?fixture:recorded);
const native=await QemuRun(tests.flatMap(test=>test.inputs),{timeout:240});
console.log(native.backend,native.evidence);
let offset=0;
for(const test of tests){
  const results=native.results.slice(offset,offset+test.inputs.length);offset+=test.inputs.length;
  assert.equal(results.length,test.inputs.length);
  const special=test.name==='FormatOwned';
  for(let j=0;j<results.length;j++){
    assert.equal(results[j].except,'',test.name);
    assert.equal(results[j].out,special?`PutFormatOwned:${j===2?0:1}\n`:results[0].out,test.name);
  }
  if(test.name==='Reject')assert.equal(results[0].out,'PutReject:32:0\n');
  if(test.name==='RejectOwned')assert.equal(results[0].out,'PutRejectOwned:32:0\n');
  if(record){
    if(!special)writeFileSync(new URL('doc-put/'+test.name+'.out',import.meta.url),results[0].out,'latin1');
    writeFileSync(new URL('doc-put/'+test.name+'.native.json',import.meta.url),JSON.stringify({manifest,
      backend:native.backend,evidence:native.evidence,...test.identity,results,
      outputSha256:special?results.map(r=>hash(Buffer.from(r.out,'latin1'))):hash(Buffer.from(results[0].out,'latin1'))},null,2)+'\n');
  }else if(!special)assert.equal(results[0].out,test.output,test.name);
  console.log(test.name,results.map(r=>r.out.trim()));
}
