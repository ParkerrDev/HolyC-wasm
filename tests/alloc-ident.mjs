import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const deadline=setTimeout(()=>{throw new Error('Allocation identity checks did not settle');},15000);
const read=file=>readFileSync(new URL(file,import.meta.url),'latin1');
const sha=value=>createHash('sha256').update(value,'latin1').digest('hex');
function native(name) {
  const source=read(name+'.HC'),output=read(name+'.out'),evidence=JSON.parse(read(name+'.native.json'));
  assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
  assert.equal(sha(source),evidence.sourceSha256);assert.equal(sha(output),evidence.outputSha256);
  return {source,output};
}
const span=native('probes/AllocSpan');
for(const row of span.output.trim().split('\n')) {
  const [requested,usable,internal]=row.split(' ').map(Number);
  assert(usable>=requested);assert.equal(internal-usable,16,'original release heap header');
}
// The host reports its actual internal allocation span. It does not substitute
// the smaller native header; that would undercount the real occupied storage.
const direct=createHost(),memory=new WebAssembly.Memory({initial:257,maximum:512});direct.attach({exports:{memory}});
for(let size=0;size<130;size++) {
  const a=direct.env.__malloc(BigInt(size)),b=direct.env.__malloc(1n);
  assert.equal(direct.env.__msize2(a)-direct.env.__msize(a),32n);
  assert.equal(direct.env.__msize2(a),b-a,'contiguous allocation span');
  direct.env.__free(b);direct.env.__free(a);
}
assert.equal(direct.env.__msize2(0n),0n);
const old=createHost({heapAbi:0});old.attach({exports:{memory:new WebAssembly.Memory({initial:257})}});
assert.equal(old.env.__msize2(0n),0n);
assert.throws(()=>old.env.__msize2(old.env.__malloc(8n)),/legacy bump-heap/);
const fixture=native('v503/AllocIdent');let text='';
const compiled=compileHolyC(fixture.source,{lenient:false});assert.deepEqual(compiled.warnings,[]);
const host=createHost({ansi:false,onText:value=>text+=value});
const instance=new WebAssembly.Instance(new WebAssembly.Module(compiled.bytes),{env:host.env});host.attach(instance);
instance.exports.__main();assert.equal(text,fixture.output);
assert.equal(host.state.heapPtr,16777248);

const owned=native('v503/AllocIdentTask');
const result=compileHolyC(owned.source,{lenient:false,exports:['AllocIdentTask']});assert.deepEqual(result.warnings,[]);
const runtime=createTaskHost();let fail=false,inst;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
  const original=runtime.env[name];
  runtime.env[name]=(...args)=>fail && new DataView(inst.exports.memory.buffer).getBigInt64(result.globals.get('ai_armed').addr,true)?0n:original(...args);
}
inst=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:runtime.env});runtime.attach(inst);
for(let trial=0;trial<30;trial++) for(let mode=0;mode<3;mode++) for(fail of [false,true,false]) {
  assert.equal(await runtime.run('AllocIdentTask',BigInt(mode)),fail?0x6D654D74754Fn:0n);
  assert.equal(inst.exports.__sp.value,16777216n);assert.equal(runtime.state.heapPtr,16777248);
  assert.deepEqual(runtime.state.tasks.map(t=>[t.status,t.allocations]),[['dead',0]]);
}
await runtime.dispose();clearTimeout(deadline);
console.log('Heap identity: native full-capacity copies and NULL behavior match; real internal spans, legacy rejection, child/parent/session ownership and 270 failure/retry cycles pass.');
