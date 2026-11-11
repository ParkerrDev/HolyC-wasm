import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LEX_TYPES_SRC,LEX_SRC} from '../../src/lex-stream.js';
import {LEX_STRING_SRC} from '../../src/lex-string.js';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
export function fixture() {
  const source=read('LexString.HC');
  const nativeBindings='extern I64 LexInStr(CCmpCtrl *cc,U8 *buf,I64 size,Bool *done);\n'+
    'extern U0 LexIncludeStr(CCmpCtrl *cc,U8 *filename,U8 *src,Bool actual);\n';
  const rename=source=>source.replace(/\bLexInStr\b/g,'LexInStrHost');
  const inputs=[nativeBindings+source,nativeBindings+rename(LEX_STRING_SRC+source)].map(text=>Buffer.from(text,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),nativeBindings,
    librarySha256:hash(Buffer.from(LEX_STRING_SRC,'latin1')),
    streamSha256:hash(Buffer.from(LEX_TYPES_SRC+LEX_SRC,'latin1')),
    inputSha256:inputs.map(hash),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {source,inputs,identity};
}
export function recorded() {
  const test=fixture(),output=readFileSync(new URL('LexString.out',import.meta.url));
  const proof=JSON.parse(read('LexString.native.json'));
  for(const [key,value] of Object.entries(test.identity))assert.deepEqual(proof[key],value,key);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.results.length,2);
  for(const result of proof.results){assert.equal(result.except,'');assert.equal(result.out,output.toString('latin1'));}
  assert.equal(proof.outputSha256,hash(output));
  return {...test,output:output.toString('latin1')};
}
