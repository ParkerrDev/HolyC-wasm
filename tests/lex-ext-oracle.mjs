import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fixture,recorded,hash} from './lex-ext/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const args=process.argv.slice(2),record=args.includes('--record');
if(args.some(arg=>arg!=='--record'))throw new Error('Use --record to update native evidence.');
const test=record?fixture():recorded(),native=await QemuRun(test.inputs);
console.log(native.backend,native.evidence);
assert.equal(native.results.length,3);
for(const r of native.results){assert.equal(r.except,'');assert.equal(r.out,native.results[0].out);}
const output=native.results[0].out;
if(record){
 writeFileSync(new URL('lex-ext/ExtValid.out',import.meta.url),output,'latin1');
 writeFileSync(new URL('lex-ext/ExtValid.native.json',import.meta.url),JSON.stringify({manifest,backend:native.backend,evidence:native.evidence,...test.identity,results:native.results,outputSha256:hash(Buffer.from(output,'latin1'))},null,2)+'\n');
}else assert.equal(output,test.output);
console.log(output.trim(),'stock, copied original and staged native concatenation agree');
