import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {recorded} from './cmp-tables/cases.mjs';
const proof=recorded(),expected=17104939n;
function load(source,{tasks=false,failAt=0,exports=[]}={}) {
  const result=compileHolyC(source,{lenient:false,exports});assert.deepEqual(result.warnings,[]);
  let output='',calls=0;const live=new Set(),host=(tasks?createTaskHost:createHost)({ansi:false,onText:s=>output+=s});
  const alloc=host.env.__malloc_kernel;
  host.env.__malloc_kernel=size=>{if(++calls===failAt)return 0n;const ptr=alloc(size);if(ptr)live.add(ptr);return ptr;};
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  return {result,host,instance,live,get calls(){return calls;},get output(){return output;},clear(){output='';}};
}
const release=test=>{for(const ptr of [...test.live])test.host.env.__free(ptr);assert.equal(test.live.size,0);};
const native=load(proof.source);
try {
  let heap;
  for(let i=0;i<5;i++) {
    native.clear();native.instance.exports.__main();assert.equal(native.output,proof.output);
    assert.equal(native.calls,6);assert.equal(native.live.size,6);
    if(heap===undefined)heap=native.host.state.heapPtr;else assert.equal(native.host.state.heapPtr,heap);
  }
} finally {release(native);}
for(const source of [
  'I64 Read(){return cmp.compiled_lines;}',
  'I64 Read(){return sizeof(CCmpGlbls);}',
  'I64 cmp=17;I64 Read(){return cmp;}',
]) {
  const test=load(source,{exports:['Read']});test.instance.exports.__rt_init();
  assert.equal(test.calls,0);assert.equal(test.live.size,0);
  assert(!WebAssembly.Module.imports(new WebAssembly.Module(test.result.bytes)).some(x=>x.name==='__malloc_kernel'));
}
const forms=[
  'I64 Read(){return cmp.dual_U16_tokens1[43];}',
  'CCmpGlbls *alias=&cmp;I64 Read(){return alias->dual_U16_tokens1[43];}',
  'CCmpGlbls *Alias(){return &cmp;}I64 Read(){CCmpGlbls *ptr=Alias;return ptr->dual_U16_tokens1[43];}',
  'I64 Read(){U8 *ptr=&cmp;U32 *d=*(ptr+offset(CCmpGlbls.dual_U16_tokens1))(U32 **);return d[43];}',
  'I64 Read(){U8 *ptr=&cmp.compiled_lines;ptr-=offset(CCmpGlbls.compiled_lines);U32 *d=*(ptr+offset(CCmpGlbls.dual_U16_tokens1))(U32 **);return d[43];}',
  'I64 Read(){U8 *ptr=cmp.internal_types;ptr-=offset(CCmpGlbls.internal_types);U32 *d=*(ptr+offset(CCmpGlbls.dual_U16_tokens1))(U32 **);return d[43];}',
  'I64 Read(U8 *ptr=&cmp){U32 *d=*(ptr+offset(CCmpGlbls.dual_U16_tokens1))(U32 **);return d[43];} I64 Default(){return Read;}',
  'I64 Native(){return cmp.dual_U16_tokens1[43];}I64 cmp=17;I64 Read(){return Native+cmp-17;}',
];
for(const source of forms) {
  const method=source.includes('I64 Default()')?'Default':'Read',test=load(source,{exports:[method]});
  try {
    test.instance.exports.__rt_init();assert.equal(test.instance.exports[method](),expected);
    assert.equal(test.calls,6);assert.equal(test.live.size,6);
  } finally {release(test);}
}
const escaped=load('I64 Read(){return &cmp;}',{exports:['Read']});
try {
  escaped.instance.exports.__rt_init();assert.equal(escaped.calls,6);
  const memory=new DataView(escaped.instance.exports.memory.buffer),addr=Number(escaped.instance.exports.Read());
  const table=Number(memory.getBigUint64(addr+368,true));assert.equal(memory.getUint32(table+43*4,true),Number(expected));
  memory.setUint32(table+43*4,12345,true);memory.setBigInt64(addr+528,97n,true);
  escaped.instance.exports.__main();escaped.instance.exports.__rt_init();
  assert.equal(escaped.calls,6);assert.equal(memory.getBigUint64(addr+368,true),BigInt(table));
  assert.equal(memory.getUint32(table+43*4,true),12345);assert.equal(memory.getBigInt64(addr+528,true),97n);
  assert.equal(memory.getBigUint64(addr,true),0n,'No fabricated ASM graph.');
  for(let i=0;i<16;i++)assert.equal(memory.getBigUint64(addr+8+i*8,true),0n,'No fabricated internal types.');
} finally {release(escaped);}
const faultSource='I64 started=0; I64 Read(){return cmp.dual_U16_tokens1[43];} started=1;';
for(let failAt=1;failAt<=6;failAt++) {
  const test=load(faultSource,{failAt,exports:['Read']});
  const warm=test.host.env.__malloc(8n);test.host.env.__free(warm);
  const before=test.host.state.heapPtr;
  assert.throws(()=>test.instance.exports.__main(),WebAssembly.Exception);
  assert.equal(test.calls,failAt);assert.equal(test.live.size,0);assert.equal(test.host.state.heapPtr,before);
  const bytes=new Uint8Array(test.instance.exports.memory.buffer),cmp=test.result.globals.get('cmp').addr;
  assert(bytes.slice(cmp,cmp+536).every(byte=>byte===0),'No staged table or scalar publishes on failure.');
  assert.equal(new DataView(bytes.buffer).getBigInt64(test.result.globals.get('started').addr,true),0n);
  assert.throws(()=>test.instance.exports.__main(),/initialization failed or reentered/);assert.equal(test.calls,failAt);
}
const fresh=load(faultSource,{exports:['Read']});
try {fresh.instance.exports.__main();assert.equal(fresh.instance.exports.Read(),expected);assert.equal(fresh.calls,6);}
finally {release(fresh);}
const aliasesProof=recorded('CmpAliases'),aliases=load(aliasesProof.source);
try {aliases.instance.exports.__main();assert.equal(aliases.output,aliasesProof.output);assert.equal(aliases.calls,6);}
finally {release(aliases);}
const taskProof=recorded('CmpTableTask'),task=load(taskProof.source,{tasks:true});
try {
  let heap,count;
  for(let i=0;i<5;i++) {
    task.clear();await task.host.run();assert.equal(task.output,taskProof.output);
    assert.equal(task.host.state.tasks.length,1);
    if(heap===undefined){heap=task.host.state.heapPtr;count=task.live.size;}
    else {assert.equal(task.host.state.heapPtr,heap);assert.equal(task.live.size,count);}
    assert(task.live.size>=6,'The shared six tables survive every child exit.');
  }
} finally {await task.host.dispose();}
assert.equal(task.live.size,0);assert.equal(task.host.state.tasks[0].allocations,0);
for(const name of ['CInit','CmpFillTables','Lex'])assert.throws(()=>compileHolyC(name+';',{lenient:false}),/undefined symbol/);
console.log(proof.output.trim(),'five lifetimes, six staged failures, typed/default/raw aliases, reset effects and allocation-free counters pass; compiler boot/graphs remain absent.');
