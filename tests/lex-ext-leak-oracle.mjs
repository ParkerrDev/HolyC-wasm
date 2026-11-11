import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {read,leakFixture,hash} from './lex-ext/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record');
if(process.argv.slice(2).some(a=>a!=='--record'))throw Error('Use --record to update native evidence.');
const {inputs,identity}=leakFixture();
const native=await QemuRun(inputs);console.log(native.backend,native.evidence);
for(let i=0;i<2;i++){assert.equal(native.results[i].except,'');assert.equal(native.results[i].out,`ExtDetached:${1-i}\n`);}
const proof={manifest,backend:native.backend,evidence:native.evidence,...identity,results:native.results,outputSha256:native.results.map(r=>hash(Buffer.from(r.out,'latin1')))};
if(record)writeFileSync(new URL('lex-ext/ExtLeak.native.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');
else{const old=JSON.parse(read('ExtLeak.native.json'));for(const key of [...Object.keys(identity),'results','outputSha256'])assert.deepEqual(proof[key],old[key]);}
console.log('Native echo failure leaks the detached first string; staged cleanup frees its exact native heap span and preserves exception state.');
