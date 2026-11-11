import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MEMBER_TYPES_SRC,MEMBER_SRC} from '../../src/member.js';
import {HASH_TYPES_SRC} from '../../src/hash-prelude.js';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
export const cases=['Member','MemberTask'];
const symbols=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(MemberMetaData|MemberMetaFind|MemberFind|MemberClassBaseFind|MemberLstCmp)\b/g;
const rename=source=>source.replace(symbols,(text,name)=>name?name+'Host':text);
export function fixture(name) {
  const source=read(name+'.HC'),nativeBindings=read('NativeBindings.HC');
  const inputs=[nativeBindings+source,rename(MEMBER_SRC+source)].map(text=>Buffer.from(text,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),nativeBindings,
    typesSha256:hash(Buffer.from(HASH_TYPES_SRC+MEMBER_TYPES_SRC,'latin1')),
    librarySha256:hash(Buffer.from(MEMBER_SRC,'latin1')),inputSha256:inputs.map(hash),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,inputs,identity};
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
