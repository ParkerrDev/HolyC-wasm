import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DOC_OUTPUT_SRC} from '../../src/doc-output.js';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
const symbols=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(PrsDollarCmd|DocParseOwnedFree)\b/g;
export const rename=(source,suffix)=>source.replace(symbols,(text,name)=>name?name+suffix:text);
export function fixture(name){
  const source=read('Common.HC')+'\nRaw(OFF);\n'+read(name+'.HC');
  const original=read('NativeParse.HC');
  const inputs=[source,rename(original+source,'Original'),rename(DOC_OUTPUT_SRC+source,'Host')].map(s=>Buffer.from(s,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(DOC_OUTPUT_SRC,'latin1')),
    originalSha256:hash(Buffer.from(original,'latin1')),inputSha256:inputs.map(hash),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,inputs,identity};
}
export function recorded(name){
  const test=fixture(name),output=read(name+'.out'),proof=JSON.parse(read(name+'.native.json'));
  for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,name+': '+k);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.results.length,3);
  for(const r of proof.results){assert.equal(r.except,'');assert.equal(r.out,output);}
  assert.equal(proof.outputSha256,hash(Buffer.from(output,'latin1')));
  return {...test,output};
}
export function special(name){
  const source=read('Common.HC')+'\nRaw(OFF);\n'+read(name+'.HC');
  const inputs=(name==='Ownership'?[source,rename(DOC_OUTPUT_SRC+source,'Host')]:[rename(DOC_OUTPUT_SRC+source,'Host')]).map(s=>Buffer.from(s,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(DOC_OUTPUT_SRC,'latin1')),
    inputSha256:inputs.map(hash),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,inputs,identity};
}
export function recordedSpecial(name){
  const test=special(name),proof=JSON.parse(read(name+'.native.json'));
  for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,name+': '+k);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  const outputs=name==='Ownership'?['ErrorOwned:1:1\n','ErrorOwned:0:0\n']:['ParseReject:34:0\n'];
  assert.equal(proof.results.length,outputs.length);
  for(let i=0;i<outputs.length;i++){
    assert.equal(proof.results[i].except,'');assert.equal(proof.results[i].out,outputs[i]);
    assert.equal(proof.outputSha256[i],hash(Buffer.from(outputs[i],'latin1')));
  }
  return test;
}
