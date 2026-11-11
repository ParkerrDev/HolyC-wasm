import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CMP_TABLE_TYPES_SRC,CMP_TABLE_SRC} from '../../src/cmp-tables.js';
import {LEX_TYPES_SRC} from '../../src/lex-stream.js';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=name=>readFileSync(new URL(name,import.meta.url),'latin1');
export const cases=['CmpTables','CmpTableTask','CmpAliases'];
export function fixture(name='CmpTables') {
  const source=read(name+'.HC');
  const before='CCmpGlbls cmp;\nMemSet(&cmp,0,sizeof(CCmpGlbls));\n';
  const init='CmpTablesHostInit;\n';
  const after=['to_reg_vars_map','non_ptr_vars_map','dual_U16_tokens1','dual_U16_tokens2','dual_U16_tokens3','binary_ops']
    .map(field=>'Free(cmp.'+field+');').join('\n')+'\n';
  const inputs=[source,CMP_TABLE_TYPES_SRC+before+CMP_TABLE_SRC+init+source+after].map(text=>Buffer.from(text,'latin1'));
  const identity={sourceSha256:hash(Buffer.from(source,'latin1')),before,init,after,
    typesSha256:hash(Buffer.from(LEX_TYPES_SRC+CMP_TABLE_TYPES_SRC,'latin1')),
    librarySha256:hash(Buffer.from(CMP_TABLE_SRC,'latin1')),inputSha256:inputs.map(hash),
    captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))};
  return {name,source,wasmSource:source,inputs,identity};
}
export function recorded(name='CmpTables') {
  const test=fixture(name),output=readFileSync(new URL(name+'.out',import.meta.url));
  const proof=JSON.parse(read(name+'.native.json'));
  for(const [key,value] of Object.entries(test.identity))assert.deepEqual(proof[key],value,key);
  assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');
  assert.equal(proof.results.length,2);
  for(const result of proof.results){assert.equal(result.except,'');assert.equal(result.out,output.toString('latin1'));}
  assert.equal(proof.outputSha256,hash(output));
  return {...test,output:output.toString('latin1')};
}
