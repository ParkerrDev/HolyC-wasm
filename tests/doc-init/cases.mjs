import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DOC_INIT_TYPES_SRC,DOC_INIT_SRC} from '../../src/doc-init.js';
export const cases=['DocDefaults','DocFlags','DocTask'];
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
const symbols=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(DocInit|PrsDocFlags|PrsDocFlagSingle|doldoc)\b/g;
const rename=(source,suffix)=>source.replace(symbols,(text,name)=>name?name+suffix:text);
export function fixture(name) {
  const source=read(name+'.HC'),nativeParser=read('NativeParser.HC')+'\n',nativeInit=read('NativeInit.HC');
  const originalBefore='CDolDocGlbls doldocOriginal;\nMemSet(&doldocOriginal,0,sizeof(CDolDocGlbls));\n';
  const portBefore='CDolDocGlbls doldocHost;\nMemSet(&doldocHost,0,sizeof(CDolDocGlbls));\n';
  const originalInit='DocInitOriginal;\n',portInit='DocHostInit;\n';
  const inputs=[source,originalBefore+rename(nativeParser+nativeInit,'Original')+originalInit+rename(source,'Original'),
    portBefore+rename(DOC_INIT_SRC,'Host')+portInit+rename(source,'Host')].map(text=>Buffer.from(text,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),originalBefore,portBefore,originalInit,portInit,
    nativeParserSha256:hash(Buffer.from(nativeParser,'latin1')),nativeInitSha256:hash(Buffer.from(nativeInit,'latin1')),
    typesSha256:hash(Buffer.from(DOC_INIT_TYPES_SRC,'latin1')),librarySha256:hash(Buffer.from(DOC_INIT_SRC,'latin1')),
    inputSha256:inputs.map(hash),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,inputs,identity};
}
export function recorded(name) {
  const test=fixture(name),output=readFileSync(new URL(name+'.out',import.meta.url));
  const proof=JSON.parse(read(name+'.native.json'));
  for(const [key,value] of Object.entries(test.identity))assert.deepEqual(proof[key],value,name+': '+key);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.results.length,3);
  for(const result of proof.results){assert.equal(result.except,'');assert.equal(result.out,output.toString('latin1'));}
  assert.equal(proof.outputSha256,hash(output));
  return {...test,output:output.toString('latin1')};
}
