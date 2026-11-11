import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const read=name=>readFileSync(new URL('probes/WindowLock.'+name,import.meta.url),'latin1');
const source=read('HC'),expected=read('out'),evidence=JSON.parse(read('native.json'));
const hash=s=>createHash('sha256').update(s,'latin1').digest('hex');
assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
assert.equal(hash(source),evidence.sourceSha256);assert.equal(hash(expected),evidence.outputSha256);
const result=compileHolyC(source,{lenient:false});assert.deepEqual(result.warnings,[]);
const deadline=setTimeout(()=>{throw new Error('Document locks did not settle');},10000);
let output='',first=null;const errors=[];
const host=createTaskHost({ansi:false,onText:s=>output+=s,onTaskError:error=>errors.push(error)});
try{
 const instance=await WebAssembly.instantiate(result.bytes,{env:host.env});host.attach(instance.instance);
 for(let i=0;i<4;i++){
  output='';await host.run();assert.equal(output,expected);assert.deepEqual(errors,[]);
  if(first===null)first=host.state.heapPtr;else assert.equal(host.state.heapPtr,first);
  assert.deepEqual(host.state.tasks.map(task=>[task.status,task.allocations]),[['dead',0]]);
 }
}finally{clearTimeout(deadline);await host.dispose();}
console.log(expected.trim(),'nested/competing locks and release before pending Break match; four runs retain no tasks or allocations.');
