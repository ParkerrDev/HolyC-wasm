import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DOC_ENTRY_SRC,DOC_ENTRY_TYPES_SRC} from '../../src/doc-entry.js';
export const cases=['DocEntriesChk','DocInsertChk','DocSharedCopyChk','DocEntryTask'];
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
export const base=read('DocEntriesChk.HC').replace(/\nDocEntriesChk;\s*$/,'\n');
const names=[...DOC_ENTRY_SRC.matchAll(/^(?:public )?(?:U0|I64|Bool|CDocBin \*|CDocEntry \*)\s*(\w+)\(/gm)].map(m=>m[1]);
const symbols=new RegExp('\\b('+names.join('|')+')\\b','g');
const rename=source=>source.replace(symbols,'$1Host');
export function fixture(name) {
  const source=read(name+'.HC'),prefix=name==='DocEntriesChk'?'':base;
  const wasmSource=prefix+'\nRaw(OFF);\n'+source;
  const inputs=[wasmSource,rename(DOC_ENTRY_SRC+wasmSource)].map(text=>Buffer.from(text,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),prefixSha256:hash(Buffer.from(prefix,'latin1')),
    librarySha256:hash(Buffer.from(DOC_ENTRY_SRC,'latin1')),typesSha256:hash(Buffer.from(DOC_ENTRY_TYPES_SRC,'latin1')),
    wasmSourceSha256:hash(Buffer.from(wasmSource,'latin1')),inputSha256:inputs.map(hash),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,wasmSource,inputs,identity};
}
export function recorded(name) {
  const test=fixture(name),output=readFileSync(new URL(name+'.out',import.meta.url));
  const proof=JSON.parse(read(name+'.native.json'));
  for(const [key,value] of Object.entries(test.identity))assert.deepEqual(proof[key],value,name+': '+key);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.results.length,2);
  for(const result of proof.results){assert.equal(result.except,'');assert.equal(result.out,output.toString('latin1'));}
  assert.equal(proof.outputSha256,hash(output));
  return {...test,output:output.toString('latin1')};
}
