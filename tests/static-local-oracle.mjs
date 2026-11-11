import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest,Hash} from './oracle/Prepare.mjs';
import {cases,expected,recorded} from './static-local/cases.mjs';
const record=process.argv.includes('--record');
assert(process.argv.slice(2).every(arg=>arg==='--record'));
const sources=cases.map(name=>readFileSync(new URL(`static-local/${name}.HC`,import.meta.url)));
const native=await QemuRun(sources);console.log(native.backend,native.evidence);
for(let i=0;i<cases.length;i++) {
 const name=cases[i],result=native.results[i];
 if(Object.hasOwn(expected,name)) {
  assert.equal(result.out,expected[name],name);
  assert.equal(result.except,name==='Failure'?'Init':'',name);
 }
 const proof={manifest,backend:native.backend,evidence:native.evidence,
  sourceSha256:Hash(sources[i]),runnerSha256:Hash(readFileSync(new URL('oracle/Qemu.mjs',import.meta.url))),
  captureSha256:Hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url))),
  outputSha256:Hash(Buffer.from(result.out,'latin1')),except:result.except,out:result.out};
 if(record)writeFileSync(new URL(`static-local/${name}.native.json`,import.meta.url),JSON.stringify(proof,null,2)+'\n');
 else {const saved=recorded(name).proof;assert.equal(saved.outputSha256,proof.outputSha256);assert.equal(saved.except,proof.except);}
 console.log(name,JSON.stringify(result));
}
