import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest,Hash} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record');
if(process.argv.slice(2).some(arg=>arg!=='--record'))throw new Error('Use --record to update evidence.');
const names=['NoWarn','NoWarnGlobal','NoWarnExpr','NoWarnField','NoWarnForward'];
const sources=names.map(name=>readFileSync(new URL(`v503/${name}.HC`,import.meta.url))),captureSha256=Hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url)));
const native=await QemuRun(sources);console.log(native.backend,native.evidence);
for(let i=0;i<names.length;i++){
 const name=names[i],result=native.results[i];
 assert.equal(result.except,i?'Compiler':'');
 if(!i)assert.equal(result.out,'NoWarn:23:17\n');
 else assert.match(result.out,/Expecting (local var|',')/);
 const proof={manifest,backend:native.backend,evidence:native.evidence,sourceSha256:Hash(sources[i]),captureSha256,outputSha256:Hash(Buffer.from(result.out,'latin1')),except:result.except};
 if(i)proof.diagnostic=result.out;
 const url=new URL(`v503/${name}.native.json`,import.meta.url);
 if(record){writeFileSync(url,JSON.stringify(proof,null,2)+'\n');if(!i)writeFileSync(new URL('v503/NoWarn.out',import.meta.url),result.out,'latin1');}
 else{const saved=JSON.parse(readFileSync(url));for(const key of ['sourceSha256','captureSha256','except'])assert.equal(saved[key],proof[key]);if(!i)assert.equal(saved.outputSha256,proof.outputSha256);}
 console.log(name,i?'native rejection retained':'native output matched');
}
