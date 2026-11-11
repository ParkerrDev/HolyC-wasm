import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest,Hash} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record');
assert(process.argv.slice(2).every(arg=>arg==='--record'));
const names=['DeferredInit','DeferredDefault'];
const sources=names.map(name=>readFileSync(new URL(`probes/${name}.HC`,import.meta.url)));
const native=await QemuRun(sources);
console.log(native.backend,native.evidence);
for(let i=0;i<names.length;i++) {
  const name=names[i],result=native.results[i];
  assert.equal(result.except,'Init');assert.equal(result.out,'BEFORE\n');
  const proof={manifest,backend:native.backend,evidence:native.evidence,
    sourceSha256:Hash(sources[i]),
    runnerSha256:Hash(readFileSync(new URL('oracle/Qemu.mjs',import.meta.url))),
    captureSha256:Hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url))),
    outputSha256:Hash(Buffer.from(result.out,'latin1')),except:result.except,out:result.out,
    scope:'Original native execution stops at the failed declaration. Reentry poisoning is the host module recovery contract, not native incremental recompilation.'};
  const file=new URL(`probes/${name}.native.json`,import.meta.url);
  if(record)writeFileSync(file,JSON.stringify(proof,null,2)+'\n');
  else {
    const saved=JSON.parse(readFileSync(file));
    for(const key of ['sourceSha256','runnerSha256','captureSha256','outputSha256','except'])
      assert.equal(saved[key],proof[key]);
  }
  console.log(name,result.except,JSON.stringify(result.out));
}
