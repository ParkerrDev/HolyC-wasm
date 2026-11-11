import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fixture,recorded,hash} from './lex-string/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const args=process.argv.slice(2),record=args.includes('--record');
if(args.some(arg=>arg!=='--record'))throw new Error('Use --record to update native evidence.');
const test=record?fixture():recorded(),native=await QemuRun(test.inputs);
console.log(native.backend,native.evidence);
assert.equal(native.results.length,2);
for(const result of native.results){assert.equal(result.except,'');assert.equal(result.out,native.results[0].out);}
if(record) {
  writeFileSync(new URL('lex-string/LexString.out',import.meta.url),native.results[0].out,'latin1');
  writeFileSync(new URL('lex-string/LexString.native.json',import.meta.url),JSON.stringify({
    manifest,backend:native.backend,evidence:native.evidence,...test.identity,results:native.results,
    outputSha256:hash(Buffer.from(native.results[0].out,'latin1'))},null,2)+'\n');
} else assert.equal(native.results[0].out,test.output);
console.log(native.results[0].out.trim(),'stock and ported native agree');
