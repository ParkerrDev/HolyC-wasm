import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DOC_OUTPUT_SRC} from '../../src/doc-output.js';
import {DOC_PUT_SRC} from '../../src/doc-put.js';
import {DOC_RECALC_SRC} from '../../src/doc-recalc.js';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
const symbols=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(DocPutS|DocPrint|DocOutText|PrsDollarCmd|DocParseOwnedFree|char_bmp_zero_cr_nl_cursor|char_bmp_zero_tab_cr_nl_cursor|char_bmp_zero_tab_cr_nl_cursor_dollar)\b/g;
export const rename=(source,suffix)=>source.replace(symbols,(text,name)=>
  name && !(suffix==='Original' && name.startsWith('char_bmp_'))?name+suffix:text);
const unlock=DOC_RECALC_SRC.slice(DOC_RECALC_SRC.indexOf('U0 DocHostRecalcUnlock('),DOC_RECALC_SRC.indexOf('public Bool DocRecalc('));
export const library=DOC_OUTPUT_SRC+unlock+DOC_PUT_SRC;
export function fixture(name){
  const prefix=name==='RejectOwned'?read('Reject.HC')
    .replace(/\nPutReject;\s*$/,'\n').replace('  "PutReject:%d:0\\n",cnt;',''):'';
  const source=read('Common.HC')+'\nRaw(OFF);\n'+prefix+read(name+'.HC');
  const original=read('../doc-output/NativeParse.HC')+read('NativePut.HC');
  const variants=['Reject','RejectOwned'].includes(name)?[rename(library+source,'Host')]:
    [source,rename(original+source,'Original'),rename(library+source,'Host')];
  const inputs=variants.map(s=>Buffer.from(s,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(library,'latin1')),
    originalSha256:hash(Buffer.from(original,'latin1')),inputSha256:inputs.map(hash),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,inputs,identity};
}
export function recorded(name){
  const test=fixture(name),special=name==='FormatOwned';
  const output=special?'PutFormatOwned:0\n':read(name+'.out'),proof=JSON.parse(read(name+'.native.json'));
  for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,name+': '+k);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.results.length,test.inputs.length);
  for(let i=0;i<test.inputs.length;i++){
    const expected=special?`PutFormatOwned:${i===2?0:1}\n`:output;
    assert.equal(proof.results[i].except,'');assert.equal(proof.results[i].out,expected);
    if(special)assert.equal(proof.outputSha256[i],hash(Buffer.from(expected,'latin1')));
  }
  if(!special)assert.equal(proof.outputSha256,hash(Buffer.from(output,'latin1')));
  return {...test,output};
}
