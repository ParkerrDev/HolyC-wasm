import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CMP_TYPES_SRC,CMP_SRC} from '../../src/cmp-control.js';
import {LEX_TYPES_SRC,LEX_BITMAP_SRC,LEX_GLOBALS_SRC,LEX_SRC} from '../../src/lex-stream.js';
export const cases=['LexStream','LexEcho','LexTask'];
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
const symbols=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(LexFileHostChk|LexFilePush|LexFilePop|CmpCtrlNew|CmpCtrlDel|CmpCtrlSize|LexBackupLastChar|LexPush|LexPopRestore|LexPopNoRestore|LexGetChar|LexSkipEol|LexIncludeStr)\b/g;
const rename=source=>source.replace(symbols,(text,name)=>name?name+'Host':text);
assert.equal(rename('// caller\'s LexPush\nLexPush("LexPush",\'C\');'),
  '// caller\'s LexPush\nLexPushHost("LexPush",\'C\');');
export function fixture(name) {
  const source=read(name+'.HC'),nativeBindings=read('../cmp-control/NativeBindings.HC')+
    'extern U0 LexIncludeStr(CCmpCtrl *cc,U8 *filename,U8 *src,Bool actual);\n';
  const wrapper=name==='LexEcho'?'Raw(OFF);\n':'';
  const wasmSource=wrapper+source;
  const inputs=[nativeBindings+wasmSource,rename(CMP_SRC+LEX_BITMAP_SRC+LEX_SRC+wasmSource)].map(text=>Buffer.from(text,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),
    nativeBindings,wrapper,wasmSourceSha256:hash(Buffer.from(wasmSource,'latin1')),typesSha256:hash(Buffer.from(CMP_TYPES_SRC+LEX_TYPES_SRC,'latin1')),
    librarySha256:hash(Buffer.from(CMP_SRC+LEX_BITMAP_SRC+LEX_SRC,'latin1')),
    globalsSha256:hash(Buffer.from(LEX_GLOBALS_SRC,'latin1')),
    inputSha256:inputs.map(hash),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,wasmSource,inputs,identity,profile:name==='LexEcho'?'keydev':'console'};
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
