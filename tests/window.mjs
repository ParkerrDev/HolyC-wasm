import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const sha=value=>createHash('sha256').update(value,'latin1').digest('hex');
const deadline=setTimeout(()=>{throw new Error('Window checks did not settle');},20000);
for(const [name,entry] of [['WindowStack','WindowZChk'],['DocState','DocStateChk'],['WindowDraw','WinDrawChk']]) {
  const native=readFileSync(new URL('probes/'+name+'.HC',import.meta.url),'latin1');
  const expected=readFileSync(new URL('probes/'+name+'.out',import.meta.url),'latin1');
  const evidence=JSON.parse(readFileSync(new URL('probes/'+name+'.native.json',import.meta.url)));
  assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
  assert.equal(sha(native),evidence.sourceSha256);assert.equal(sha(expected),evidence.outputSha256);
  // Native probes suspend the real manager while borrowing its public state.
  // Draw's native adapter isolates the measured fresh-alias callback contract;
  // WASM exercises the runtime implementation, never that test adapter.
  let source=native.split('//Native manager isolation.')[0];
  if(name==='WindowDraw') source=source.split('//Shared fixture.')[1];
  source+='\n'+entry+';';
  const result=compileHolyC(source,{lenient:false});assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities.includes('task-continuations');
  let output='',first=null;const errors=[];
  const host=(tasks?createTaskHost:createHost)({ansi:false,onText:text=>output+=text,onTaskError:error=>errors.push(error)});
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  for(let repeat=0;repeat<(tasks?4:1);repeat++) {
    output='';if(tasks)await host.run();else instance.exports.__main();
    assert.equal(output,expected,name);assert.deepEqual(errors,[]);
    if(tasks) {
      if(first!==null) assert.equal(host.state.heapPtr,first);else first=host.state.heapPtr;
      assert.deepEqual(host.state.tasks.map(task=>[task.status,task.allocations]),[['dead',0]]);
    }
  }
  if(tasks) await host.dispose();
}
clearTimeout(deadline);
console.log('Window: original document layouts/state, 1,280 ordering/focus cases and 6,144,000 occlusion cells match; four draw/exception cycles preserve alias ownership and heap.');
