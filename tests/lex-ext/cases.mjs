import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LEX_EXT_SRC} from '../../src/lex-ext.js';
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const rename=(source,suffix)=>source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(LexExtStr)\b/g,(text,name)=>name?name+suffix:text);
export function fixture(){
 const source=read('ExtState.HC')+read('ExtValid.HC'),original=read('NativeExt.HC');
 const inputs=[source,rename(original+source,'Original'),rename(LEX_EXT_SRC+source,'Host')].map(s=>Buffer.from(s,'latin1'));
 const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(LEX_EXT_SRC,'latin1')),originalSha256:hash(Buffer.from(original,'latin1')),inputSha256:inputs.map(hash),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
 return {source,inputs,identity};
}
export function recorded(){
 const test=fixture(),proof=JSON.parse(read('ExtValid.native.json')),output=read('ExtValid.out');
 for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,k);
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.results.length,3);
 for(const r of proof.results){assert.equal(r.except,'');assert.equal(r.out,output);}
 assert.equal(proof.outputSha256,hash(Buffer.from(output,'latin1')));return {...test,output};
}

export function leakFixture(){
 const source=read('ExtLeak.HC'),inputs=[source,rename(LEX_EXT_SRC+source,'Host')].map(s=>Buffer.from(s,'latin1'));
 const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(LEX_EXT_SRC,'latin1')),inputSha256:inputs.map(hash),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
 return {inputs,identity};
}
export function recordedLeak(){
 const test=leakFixture(),proof=JSON.parse(read('ExtLeak.native.json'));
 for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,k);
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.results.length,2);
 for(let i=0;i<2;i++){assert.equal(proof.results[i].except,'');assert.equal(proof.results[i].out,`ExtDetached:${1-i}\n`);assert.equal(proof.outputSha256[i],hash(Buffer.from(proof.results[i].out,'latin1')));}
 return test;
}
