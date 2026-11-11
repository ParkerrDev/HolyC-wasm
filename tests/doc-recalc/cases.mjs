import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DOC_RECALC_SRC} from '../../src/doc-recalc.js';
export const cases=['RecalcBasic','RecalcControls','RecalcClear','RecalcEmpty','RecalcTrim','RecalcLock','RecalcOwner'];
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
const symbols=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(DocRecalc)\b/g;
const rename=(source,suffix)=>source.replace(symbols,(text,name)=>name?name+suffix:text);
export function fixture(name) {
  const prefix=read('Common.HC')+'\nRaw(OFF);\n',body=read(name+'.HC'),source=prefix+body,native=read('NativeRecalc.HC');
  const inputs=[source,rename(native+source,'Original'),rename(DOC_RECALC_SRC+source,'Host')].map(text=>Buffer.from(text,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(DOC_RECALC_SRC,'latin1')),nativeSourceSha256:hash(Buffer.from(native,'latin1')),
    inputSha256:inputs.map(hash),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,inputs,identity};
}
export function recorded(name) {
  const test=fixture(name),output=readFileSync(new URL(name+'.out',import.meta.url));
  const proof=JSON.parse(read(name+'.native.json'));
  for(const [key,value] of Object.entries(test.identity))assert.deepEqual(proof[key],value,name+': '+key);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.results.length,3);
  for(const result of proof.results){assert.equal(result.except,'');assert.equal(result.out,output.toString('latin1'));}
  assert.equal(proof.outputSha256,hash(output));return {...test,output:output.toString('latin1')};
}
export function rejectFixture() {
 const source=read('Common.HC')+read('RecalcReject.HC'),observer=read('RejectObserver.HC'),run=read('RejectRun.HC');
 const input=Buffer.from(rename(DOC_RECALC_SRC+observer+source.replace('import U0 RecalcRejectMark(I64 phase);','')+run,'Bounded'),'latin1');
 const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(DOC_RECALC_SRC,'latin1')),observerSha256:hash(Buffer.from(observer,'latin1')),runSha256:hash(Buffer.from(run,'latin1')),inputSha256:hash(input),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
 return {source,input,identity};
}
export function recordedReject() {
 const test=rejectFixture(),proof=JSON.parse(read('Reject.native.json'));
 for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,'Rejected input: '+k);
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
 assert.equal(proof.result.except,'');assert.equal(proof.result.out,'RecalcReject:94\n');
 assert.equal(proof.outputSha256,hash(Buffer.from(proof.result.out,'latin1')));return test;
}
