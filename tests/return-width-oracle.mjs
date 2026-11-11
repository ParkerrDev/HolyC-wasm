import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest,Hash} from './oracle/Prepare.mjs';
import {source,recorded} from './return-width/cases.mjs';
const record=process.argv.includes('--record');assert(process.argv.slice(2).every(arg=>arg==='--record'));
const names=['Returns','Context'];
const sources=[Buffer.from(source(),'latin1'),readFileSync(new URL('return-width/Context.HC',import.meta.url))];
const native=await QemuRun(sources);console.log(native.backend,native.evidence);
for(const [index,name] of names.entries()) {
 const result=native.results[index];assert.equal(result.except,'');
 const values=result.out.split('\n').filter(line=>/^(VAL|CTX):/.test(line));
 assert.equal(values.length,index?63:643);
 if(!index)values.forEach((line,i)=>assert.match(line,new RegExp(`^VAL:${i}:[0-9A-F]{16}$`)));
 assert.equal((result.out.match(/Using 64-bit reg var\./g)||[]).length,index?0:4);
 const proof={manifest,backend:native.backend,evidence:native.evidence,sourceSha256:Hash(sources[index]),
  runnerSha256:Hash(readFileSync(new URL('oracle/Qemu.mjs',import.meta.url))),
  captureSha256:Hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url))),
  outputSha256:Hash(Buffer.from(result.out,'latin1')),except:result.except,values:values.length};
 if(!index)proof.warnings='Four original Using 64-bit reg var warnings retained in the full output.';
 if(record) {
  writeFileSync(new URL(`return-width/${name}.native.json`,import.meta.url),JSON.stringify(proof,null,2)+'\n');
  writeFileSync(new URL(`return-width/${name}.native.out`,import.meta.url),result.out,'latin1');
 } else assert.equal(recorded(name).output,result.out);
 console.log(name,proof.values,'native values');
}
