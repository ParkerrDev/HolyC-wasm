import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest,Hash} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record');
if(process.argv.slice(2).some(arg=>arg!=='--record'))throw new Error('Use --record to update evidence.');
const outputs={NoWarn:'NoWarn:23:17\n',NoWarnVarargs:'VarScope:207:111:222\n'};
const names=[...Object.keys(outputs),'NoWarnGlobal','NoWarnExpr','NoWarnField','NoWarnForward'];
const sources=names.map(name=>readFileSync(new URL(`v503/${name}.HC`,import.meta.url))),captureSha256=Hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url)));
const native=await QemuRun(sources);console.log(native.backend,native.evidence);
for(let i=0;i<names.length;i++){
 const name=names[i],result=native.results[i],reject=!Object.hasOwn(outputs,name);
 assert.equal(result.except,reject?'Compiler':'');
 if(!reject)assert.equal(result.out,outputs[name]);
 else assert.match(result.out,/Expecting (local var|',')/);
 const proof={manifest,backend:native.backend,evidence:native.evidence,sourceSha256:Hash(sources[i]),captureSha256,outputSha256:Hash(Buffer.from(result.out,'latin1')),except:result.except};
 if(reject)proof.diagnostic=result.out;
 const url=new URL(`v503/${name}.native.json`,import.meta.url);
 if(record){writeFileSync(url,JSON.stringify(proof,null,2)+'\n');if(!reject)writeFileSync(new URL(`v503/${name}.out`,import.meta.url),result.out,'latin1');}
 else{const saved=JSON.parse(readFileSync(url));for(const key of ['sourceSha256','captureSha256','except'])assert.equal(saved[key],proof[key]);if(!reject)assert.equal(saved.outputSha256,proof.outputSha256);}
 console.log(name,reject?'native rejection retained':'native output matched');
}
