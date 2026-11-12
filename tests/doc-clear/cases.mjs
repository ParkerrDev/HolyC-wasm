import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DOC_RECALC_SRC} from '../../src/doc-recalc.js';
import {DOC_LIFE_SRC} from '../../src/doc-life.js';
import {DOC_OUTPUT_SRC} from '../../src/doc-output.js';
import {DOC_PUT_SRC} from '../../src/doc-put.js';
import {DOC_CLEAR_SRC} from '../../src/doc-clear.js';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
const names='DocRecalc|DocTop|DocBottom|DocRst|DocDel|PrsDollarCmd|DocParseOwnedFree|DocPutS|DocPrint|DocOutText|DocClear|DocHostClearCheck|char_bmp_zero_cr_nl_cursor|char_bmp_zero_tab_cr_nl_cursor|char_bmp_zero_tab_cr_nl_cursor_dollar';
const symbols=new RegExp('\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|\\b('+names+')\\b','g');
export const rename=(source,suffix)=>source.replace(symbols,(text,name)=>name && (suffix!=='Original' || name==='DocClear')?name+suffix:text);
export const library=DOC_RECALC_SRC+DOC_LIFE_SRC+DOC_OUTPUT_SRC+DOC_PUT_SRC+DOC_CLEAR_SRC;
export function fixture(name){
  const source=read('../doc-put/Common.HC')+'\nRaw(OFF);\n'+read(name+'.HC'),original=read('NativeClear.HC');
  const observer=name==='Reject'?read('RejectObserver.HC'):'';
  const nativeSource=observer+source.replace('import U0 ClearRejectMark(I64 phase);','');
  const inputs=(name==='Reject'?[rename(library+nativeSource,'Host')]:
    [source,rename(original+source,'Original'),rename(library+source,'Host')]).map(s=>Buffer.from(s,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),librarySha256:hash(Buffer.from(library,'latin1')),
    originalSha256:hash(Buffer.from(original,'latin1')),observerSha256:hash(Buffer.from(observer,'latin1')),inputSha256:inputs.map(hash),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,inputs,identity};
}
export function recorded(name){
  const test=fixture(name),output=read(name+'.out'),proof=JSON.parse(read(name+'.native.json'));
  for(const [k,v] of Object.entries(test.identity))assert.deepEqual(proof[k],v,name+': '+k);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.results.length,test.inputs.length);
  for(const r of proof.results){assert.equal(r.except,'');assert.equal(r.out,output);}
  assert.equal(proof.outputSha256,hash(Buffer.from(output,'latin1')));
  return {...test,output};
}
