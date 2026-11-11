import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DEFINE_SRC} from '../../src/define-prelude.js';
export const cases=['DefineChk','DefineTask'];
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
export const base=read('DefineChk.HC').replace(/\nDefineChk;\s*$/,'\n');
const nativeMeta=read('MetaNative.HC'),hostMeta=read('MetaHost.HC');
const symbols=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(DefineLoad|DefineLstLoad|UndefinedDefine|Define|DefineSub|DefineCnt|DefineMatch|DefinePrint|HashDefineLstAdd)\b/g;
const rename=source=>source.replace(symbols,(text,name)=>name?name+'Host':text);
assert.equal(rename('// caller\'s DefineLoad\nDefineLoad("Define",\'D\');'),
  '// caller\'s DefineLoad\nDefineLoadHost("Define",\'D\');');
export function fixture(name) {
  const source=read(name+'.HC'),prefix=name==='DefineChk'?'':base;
  const wasmSource=hostMeta+prefix+source;
  const inputs=[nativeMeta+prefix+source,rename(DEFINE_SRC+hostMeta+prefix+source)].map(text=>Buffer.from(text,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),prefixSha256:hash(Buffer.from(prefix,'latin1')),
    nativeMetadataCheck:nativeMeta,hostMetadataCheck:hostMeta,librarySha256:hash(Buffer.from(DEFINE_SRC,'latin1')),
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
