import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RUNTIME_FUNCTION_EXPORTS} from '../../src/function-exports.js';
export const cases=['Functions','Forward','Output','Exports'];
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url));
export function fixture(name) {
  const source=read(name+'.HC');
  // Header-mismatch warnings are a separate, unimplemented diagnostic. Keep
  // this native option explicit so the proof only compares binding behavior.
  const prefix=name==='Forward'?'Option(OPTf_WARN_HEADER_MISMATCH,OFF);\n':'';
  const input=Buffer.concat([Buffer.from(prefix),source]);
  return {name,source,input,identity:{sourceSha256:hash(source),nativePrefix:prefix,inputSha256:hash(input),
    captureSha256:hash(read('../oracle/QemuCapture.HC'))}};
}
export function recorded(name) {
  const test=fixture(name),output=read(name+'.out'),proof=JSON.parse(read(name+'.native.json'));
  for(const [key,value] of Object.entries(test.identity))assert.deepEqual(proof[key],value,name+': '+key);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.except,'');assert.equal(proof.outputSha256,hash(output));
  if(name==='FunctionExports')assert.deepEqual(output.toString('latin1').trim().split('\n').map(row=>row.split(':')[1]),RUNTIME_FUNCTION_EXPORTS);
  return {...test,output:output.toString('latin1')};
}
