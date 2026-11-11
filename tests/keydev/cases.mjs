import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const cases=['KeyInit','KeyOutputChk','RawModeChk','RawPrintChk','RawDelayChk','KeyScroll','KeyFilter'];
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function fixture(name) {
  const source=readFileSync(new URL(name+'.HC',import.meta.url));
  const wasmWrapper='\nRaw(OFF);\n'+name+';\n';
  // Raw fixtures replace the native shared screen cache. Disable hardware
  // preemption for that test-only replacement; the WASM host is cooperative.
  const nativeWrapper=name.startsWith('Raw')?
    '\nU0 KeyNativeRun()\n{\n  PUSHFD\n  CLI\n  Raw(OFF);\n  '+name+';\n  POPFD\n}\n\nKeyNativeRun;\n':wasmWrapper;
  const input=Buffer.concat([source,Buffer.from(nativeWrapper)]);
  const capture=readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url));
  const identity={sourceSha256:hash(source),nativeWrapper,wasmWrapper,
    nativeInputSha256:hash(input),captureSha256:hash(capture)};
  return {name,source,input,wasmSource:source.toString('latin1')+wasmWrapper,identity};
}
export function recorded(name) {
  const test=fixture(name),out=readFileSync(new URL(name+'.out',import.meta.url));
  const proof=JSON.parse(readFileSync(new URL(name+'.native.json',import.meta.url)));
  for(const [field,value] of Object.entries(test.identity)) assert.equal(proof[field],value,name+': '+field);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.except,'');
  assert.equal(proof.outputSha256,hash(out));
  return {...test,output:out.toString('latin1')};
}
