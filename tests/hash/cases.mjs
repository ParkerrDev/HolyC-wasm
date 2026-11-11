import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const cases=['HashCoreChk','HashOwn','HashTask'];
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function fixture(name) {
  const source=readFileSync(new URL(name+'.HC',import.meta.url));
  const nativePrefix=name==='HashOwn'?'I64 HashHeapUsed()\n{\n  return Fs->data_heap->used_u8s;\n}\n':'';
  const wasmPrefix=name==='HashOwn'?'import I64 __hash_live_span();\nI64 HashHeapUsed()\n{\n  return __hash_live_span;\n}\n':'';
  const input=Buffer.concat([Buffer.from(nativePrefix),source]);
  const identity={sourceSha256:hash(source),nativePrefix,wasmPrefix,nativeInputSha256:hash(input),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,input,wasmSource:wasmPrefix+source.toString('latin1'),identity};
}
export function recorded(name) {
  const test=fixture(name),output=readFileSync(new URL(name+'.out',import.meta.url));
  const proof=JSON.parse(readFileSync(new URL(name+'.native.json',import.meta.url)));
  for(const [key,value] of Object.entries(test.identity))assert.equal(proof[key],value,name+': '+key);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.except,'');assert.equal(proof.outputSha256,hash(output));
  return {...test,output:output.toString('latin1')};
}
