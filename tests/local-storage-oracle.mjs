import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {cases,fixture,recorded,hash,observations} from './local-storage/cases.mjs';
import {QemuRun} from './oracle/Qemu.mjs';
import {manifest} from './oracle/Prepare.mjs';
const record=process.argv.includes('--record'),names=process.argv.slice(2).filter(arg=>arg!=='--record');
if(names.some(name=>!Object.hasOwn(cases,name)))throw new Error('Use --record and optional fixture names.');
const tests=(names.length?names:Object.keys(cases)).map(name=>({name,...(record?fixture(name):recorded(name))}));
const native=await QemuRun(tests.map(t=>Buffer.concat([t.source,t.wrapper])),{timeout:180});
console.log(native.backend,native.evidence);assert.equal(native.results.length,tests.length);
for(let i=0;i<tests.length;i++){
 const test=tests[i],result=native.results[i];assert.equal(result.except,'',test.name);
 const values=observations(result.out).filter(line=>line.startsWith('VAL:'));
 assert(values.length>0);values.forEach((line,i)=>assert.match(line,new RegExp('^VAL:'+i+':[0-9A-F]{16}$')));
 for(const name of test.names)assert(result.out.includes('REG:'+name+':'),name);
 if(record){
  writeFileSync(new URL('local-storage/'+test.name+'.native.out',import.meta.url),result.out,'latin1');
  writeFileSync(new URL('local-storage/'+test.name+'.native.json',import.meta.url),JSON.stringify({manifest,backend:native.backend,evidence:native.evidence,
   ...test.identity,except:result.except,outputSha256:hash(Buffer.from(result.out,'latin1'))},null,2)+'\n');
 }else assert.deepEqual(observations(result.out),observations(test.output),test.name);
 console.log(test.name,values.length,'native values; register decisions independently inspected');
}
