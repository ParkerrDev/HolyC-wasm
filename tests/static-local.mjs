import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {cases,expected,recorded} from './static-local/cases.mjs';
const poison=/initialization failed or reentered/;
for(const name of cases) {
 const test=recorded(name);
 if(name.startsWith('Auto')) {
  assert.equal(test.proof.out,'DEFINED\n');assert.equal(test.proof.except,'');
  assert.throws(()=>compileHolyC(test.source,{lenient:false}),/Static initializer cannot (read|address) an automatic local/);
  console.log(name,'native acceptance retained; compiler-stack expression explicitly unavailable');
  continue;
 }
 const result=compileHolyC(test.source,{lenient:false,traceLocals:true});
 assert.deepEqual(result.warnings,[]);
 let out='';const host=(name==='Tasks'?createTaskHost:createHost)({onText:s=>out+=s});
 const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
 if(name==='Failure') {
  assert.throws(()=>instance.exports.__main(),WebAssembly.Exception);
  assert.equal(out,test.proof.out);
  assert.throws(()=>instance.exports.__main(),poison);
 } else if(name==='Tasks') {
  await host.run();assert.equal(host.state.heapPtr,16777248);
  assert.deepEqual(host.state.tasks.map(task=>[task.status,task.allocations]),[['dead',0]]);
  await host.dispose();
 } else instance.exports.__main();
 assert.equal(out,test.proof.out,name);assert.equal(out,expected[name]);
 if(name==='Lifetime')for(const fun of ['StNext','StUnused','StText','StArray','StRecursive','StOne','StTwo','StNarrow']) {
  const rows=result.localRegisters.get(fun);assert(rows?.some(row=>row.reg===32),fun+' static REG_NONE');
 }
 console.log(name,JSON.stringify(out));
}
// One compiled function keeps its cell through calls/recursion; independent
// instances own separate cells and initialization effects.
const source=`
I64 st_inits=0;
I64 StInit(){st_inits++;return 7;}
I64 *StCell(){static I64 value=StInit;return &value;}
I64 StNext(){I64 *value=StCell;return ++*value;}
I64 StInits(){return st_inits;}
`;
const result=compileHolyC(source,{lenient:false,exports:['StCell','StNext','StInits']});
assert.deepEqual(result.warnings,[]);
const module=new WebAssembly.Module(result.bytes);
const load=()=>{const host=createHost(),instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);instance.exports.__rt_init();return instance.exports;};
const a=load(),b=load(),address=a.StCell();
for(let i=0;i<20;i++) {
 assert.equal(a.StNext(),BigInt(i+8));assert.equal(a.StCell(),address);
 a.__rt_init();assert.equal(a.StInits(),1n);
}
assert.equal(b.StNext(),8n);assert.equal(b.StInits(),1n);
new DataView(a.memory.buffer).setBigInt64(Number(address),41n,true);
assert.equal(a.StNext(),42n);assert.equal(b.StNext(),9n);
assert.equal(a.__sp.value,16777216n);assert.equal(b.__sp.value,16777216n);
console.log('Independent static cells, stable addresses, repeated calls/initialization and child use pass.');

// Initialization can allocate task-owned heap data. A failed later static
// initializer poisons entry; disposing its root releases the earlier allocation.
const failure=compileHolyC(`
U8 *StFirst(){static U8 *ptr=MAlloc(32);return ptr;}
U8 *StSecond(){static U8 *ptr=MAlloc(64);return ptr;}
"READY\\n";
I64 StWait(){return GetKey;}
`,{lenient:false,exports:['StWait']});
assert.deepEqual(failure.warnings,[]);
for(const fail of [true,false]) {
 let out='',calls=[];
 const host=createTaskHost({onText:s=>out+=s}),malloc=host.env.__malloc;
 host.env.__malloc=size=>{calls.push(Number(size));if(fail && Number(size)===64)return 0n;return malloc(size);};
 const instance=new WebAssembly.Instance(new WebAssembly.Module(failure.bytes),{env:host.env});host.attach(instance);
 if(fail) {
  await assert.rejects(host.run(),WebAssembly.Exception);assert.equal(out,'');
  const count=calls.length;await assert.rejects(host.run(),poison);assert.equal(calls.length,count);
  await assert.rejects(host.dispose(),poison);
 } else {await host.run();assert.equal(out,'READY\n');await host.dispose();}
 assert.equal(host.state.heapPtr,16777248);assert(calls.includes(32));assert(calls.includes(64));
}
console.log('Static initializer allocation failure, poison, root disposal and fresh-instance recovery pass.');
