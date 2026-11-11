import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DOC_RECALC_SRC} from '../../src/doc-recalc.js';
import {DOC_LIFE_SRC} from '../../src/doc-life.js';
export const cases=['LifeMove','LifeReset','LifeOwner'];
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
const symbols=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(DocRecalc|DocTop|DocBottom|DocRst|DocDel)\b/g;
export const rename=(source,suffix)=>source.replace(symbols,(text,name)=>name && !(name==='DocRecalc' && suffix==='Original')?name+suffix:text);
export function fixture(name){
 const source=read('../doc-recalc/Common.HC')+read('Common.HC')+'\nRaw(OFF);\n'+read(name+'.HC');
 const native=read('NativeLife.HC'),library=DOC_RECALC_SRC+DOC_LIFE_SRC;
 const inputs=[source,rename(native+source,'Original'),rename(library+source,'Host')].map(s=>Buffer.from(s,'latin1'));
 const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(library,'latin1')),nativeSourceSha256:hash(Buffer.from(native,'latin1')),inputSha256:inputs.map(hash),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
 return {name,source,inputs,identity};
}
export function recorded(name){
 const test=fixture(name),output=read(name+'.out'),proof=JSON.parse(read(name+'.native.json'));
 for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,name+': '+k);
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.results.length,3);
 for(const r of proof.results){assert.equal(r.except,'');assert.equal(r.out,output);}assert.equal(proof.outputSha256,hash(Buffer.from(output,'latin1')));
 return {...test,output};
}
export function rejectFixture(){
 const body=read('../doc-recalc/RecalcReject.HC').replace(/\bDocRecalc\b/g,'LifeApply');
 const source=read('../doc-recalc/Common.HC')+read('Common.HC')+read('LifeApply.HC')+body+read('LifeResetReject.HC');
 const observer=read('../doc-recalc/RejectObserver.HC'),library=DOC_RECALC_SRC+DOC_LIFE_SRC;
 const input=Buffer.from(rename(library+observer+source.replace('import U0 RecalcRejectMark(I64 phase);',''),'Host'),'latin1');
 const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(library,'latin1')),observerSha256:hash(Buffer.from(observer,'latin1')),inputSha256:hash(input),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
 return {source,input,identity};
}
export function recordedReject(){
 const test=rejectFixture(),proof=JSON.parse(read('Reject.native.json'));
 for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,'Life rejection: '+k);
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.result.except,'');
 assert.equal(proof.result.out,'LifeReject:168\n');assert.equal(proof.outputSha256,hash(Buffer.from(proof.result.out,'latin1')));return test;
}
export function ownershipFixture(){
 const source=read('../doc-recalc/Common.HC')+read('NativeOwnership.HC'),library=DOC_RECALC_SRC+DOC_LIFE_SRC;
 const inputs=[source,rename(library+source,'Host')].map(s=>Buffer.from(s,'latin1'));
 const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(library,'latin1')),inputSha256:inputs.map(hash),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
 return {inputs,identity};
}
export function recordedOwnership(){
 const test=ownershipFixture(),proof=JSON.parse(read('NativeOwnership.native.json'));
 for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,'Native ownership: '+k);
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.results.length,2);
 for(let i=0;i<2;i++){
  assert.equal(proof.results[i].except,'');assert.equal(proof.results[i].out,`OrphanRemaining:${1-i}\nDeleteRemaining:${1-i}\n`);
  assert.equal(proof.outputSha256[i],hash(Buffer.from(proof.results[i].out,'latin1')));
 }
 return test;
}
