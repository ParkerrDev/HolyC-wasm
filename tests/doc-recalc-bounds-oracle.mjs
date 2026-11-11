import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {rejectFixture,recordedReject,hash} from './doc-recalc/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record'),test=record?rejectFixture():recordedReject();
const native=await QemuRun([test.input]),result=native.results[0];console.log(native.backend,native.evidence);
assert.equal(result.except,'');assert.equal(result.out,'RecalcReject:94\n');
if(record)writeFileSync(new URL('doc-recalc/Reject.native.json',import.meta.url),JSON.stringify({
 manifest,backend:native.backend,evidence:native.evidence,...test.identity,result,outputSha256:hash(Buffer.from(result.out,'latin1')),
 scope:'Staged bounded normal-layout rejection under original V5.03; unavailable capabilities are intentionally not invoked through stock DocRecalc. Native observer checks heap-span restoration; host separately proves no allocation calls.'},null,2)+'\n');
console.log(result.out.trim(),'native staged rejection preserves state, exception chain and heap ownership');
