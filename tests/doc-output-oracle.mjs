import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fixture,recorded,special,recordedSpecial,hash} from './doc-output/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const args=process.argv.slice(2),record=args.includes('--record');
if(args.some(arg=>arg.startsWith('--') && arg!=='--record'))throw new Error('Use --record to refresh native proof.');
const names=args.filter(arg=>!arg.startsWith('--'));
const tests=(names.length?names:['Parse','Owner','Ownership','Reject']).map(name=>
  ['Ownership','Reject'].includes(name)?(record?special:recordedSpecial)(name):(record?fixture:recorded)(name));
const native=await QemuRun(tests.flatMap(test=>test.inputs),{timeout:180});
console.log(native.backend,native.evidence);
let offset=0;
for(const test of tests){
  const results=native.results.slice(offset,offset+test.inputs.length);offset+=test.inputs.length;
  assert.equal(results.length,test.inputs.length);
  const specialCase=['Ownership','Reject'].includes(test.name);
  const outputs=test.name==='Ownership'?['ErrorOwned:1:1\n','ErrorOwned:0:0\n']:
    test.name==='Reject'?['ParseReject:34:0\n']:results.map(()=>results[0].out);
  for(let i=0;i<results.length;i++){assert.equal(results[i].except,'',test.name);assert.equal(results[i].out,outputs[i],test.name);}
  if(record){
    writeFileSync(new URL('doc-output/'+test.name+'.out',import.meta.url),results[0].out,'latin1');
    writeFileSync(new URL('doc-output/'+test.name+'.native.json',import.meta.url),JSON.stringify({manifest,
      backend:native.backend,evidence:native.evidence,...test.identity,results,
      outputSha256:specialCase?outputs.map(s=>hash(Buffer.from(s,'latin1'))):hash(Buffer.from(results[0].out,'latin1'))},null,2)+'\n');
  }else if(!specialCase)assert.equal(results[0].out,test.output,test.name);
  console.log(test.name,results.map(r=>r.out.trim().split('\n').at(-1)));
}
