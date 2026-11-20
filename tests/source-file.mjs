// A file's own place in a project: BP= links to another document's bins,
// and __DIR__, __FILE__, __LINE__ and __CMD_LINE__, against V5.03's output.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileProject} from '../src/project.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Hash} from './oracle/Prepare.mjs';
const dir=new URL('source-file/',import.meta.url),read=name=>readFileSync(new URL(name,dir));
const evidence=JSON.parse(read('MAIN.native.json'));
assert.equal(evidence.backend.engine,'qemu');
for(const [name,sha] of Object.entries(evidence.sources))
  assert.equal(Hash(read(name)),sha,name+' changed since native oracle recording');
const want=read('MAIN.out').toString('latin1');
assert.equal(Hash(Buffer.from(want,'latin1')),evidence.outputSha256);
const file=name=>({path:'C:/ORACLE/'+name,source:read(name).toString('latin1')});
const result=compileProject({filename:'C:/ORACLE/F0000.HC',source:read('MAIN.HC').toString('latin1'),
  files:[file('INC.HC'),file('LINKED.HC')]});
let out='';
const host=createTaskHost({ansi:false,onText:text=>out+=text});
const {instance}=await WebAssembly.instantiate(result.bytes,{env:host.env});
host.attach(instance);await host.run();
assert.equal(out,want);
assert.throws(()=>compileProject({filename:'C:/ORACLE/F0000.HC',source:read('MAIN.HC').toString('latin1'),
  files:[file('INC.HC')]}),/DolDoc binary 5 is missing/);
console.log('Source files: BP links by tag and number, and file defines match V5.03.');
