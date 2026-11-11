import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Hash} from '../oracle/Prepare.mjs';
export const cases=['Lifetime','Scope','Alignment','Branches','Tasks','Failure','AutoValue','AutoAddress'];
export const expected={
 Lifetime:'AtDef:1\nUnused:2\nCalls:8:9:2\nRedef:10:501\nData:1:aZc:1:18\nRecursive:4:6\nAddress:1:1:1:2\nNarrow:0:1\n',
 Scope:'Scope:812:7:9103:4\nStruct:1:23:0\n',
 Alignment:'Align:0:0:0:1:1:1\nData:7:19:AB\n',
 Branches:'Branches:2\nAfter:2\n',
 Tasks:'Before:1:17:1\nChild:2:1:18:1\nChild:3:1:19:1\nAfter:1:4\n',
 Failure:'BEFORE\n',
};
export function recorded(name) {
 const source=readFileSync(new URL(`${name}.HC`,import.meta.url));
 const proof=JSON.parse(readFileSync(new URL(`${name}.native.json`,import.meta.url)));
 assert.equal(proof.sourceSha256,Hash(source));
 assert.equal(proof.runnerSha256,Hash(readFileSync(new URL('../oracle/Qemu.mjs',import.meta.url))));
 assert.equal(proof.captureSha256,Hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url))));
 assert.equal(proof.outputSha256,Hash(Buffer.from(proof.out,'latin1')));
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
 return {source,proof};
}
