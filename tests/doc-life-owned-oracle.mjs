import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {ownershipFixture,recordedOwnership,hash} from './doc-life/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record'),test=record?ownershipFixture():recordedOwnership();
const native=await QemuRun(test.inputs);console.log(native.backend,native.evidence);
for(let i=0;i<2;i++){
 assert.equal(native.results[i].except,'');assert.equal(native.results[i].out,`OrphanRemaining:${1-i}\nDeleteRemaining:${1-i}\n`);
}
if(record)writeFileSync(new URL('doc-life/NativeOwnership.native.json',import.meta.url),JSON.stringify({manifest,...native,...test.identity,outputSha256:native.results.map(r=>hash(Buffer.from(r.out,'latin1')))},null,2)+'\n');
console.log('Original V5.03 leaves an orphan tag and interrupted-deletion document; staged native cleanup frees both with the exception chain intact.');
