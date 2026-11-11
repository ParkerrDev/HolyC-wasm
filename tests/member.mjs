import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {cases,recorded} from './member/cases.mjs';
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.identity.nativeBindings+test.source,{lenient:false});
  assert.deepEqual(result.warnings,[]);const tasks=result.requiredCapabilities.includes('task-continuations');
  let output='',heap,count;const live=new Set(),host=(tasks?createTaskHost:createHost)({ansi:false,onText:s=>output+=s});
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{const ptr=alloc(...args);if(ptr)live.add(ptr);return ptr;};
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  try {
    for(let i=0;i<5;i++) {
      output='';if(tasks)await host.run();else instance.exports.__main();
      assert.equal(output,test.output,name);
      if(i===0){heap=host.state.heapPtr;count=live.size;}
      else{assert.equal(host.state.heapPtr,heap,name);assert.equal(live.size,count,name);}
      if(tasks)assert.equal(host.state.tasks.length,1);else assert.equal(live.size,0);
    }
  } finally {if(tasks)await host.dispose();else for(const ptr of [...live])host.env.__free(ptr);}
  assert.equal(live.size,0);console.log(test.output.trim(),'five lifetimes, shared parent records and final disposal');
}
const test=recorded('Member'),source=test.identity.nativeBindings+test.source.replace(/\nMember;\n$/,'\n');
const result=compileHolyC(source,{lenient:false,exports:['MemberLayout','MemberLookup','MemberCompare']}),module=new WebAssembly.Module(result.bytes);
assert.deepEqual(result.requiredCapabilities,[]);
assert(!WebAssembly.Module.imports(module).some(entry=>entry.name.startsWith('__malloc')));
let attempts=0;const host=createHost();for(const name of ['__malloc','__malloc_for','__malloc_kernel'])host.env[name]=()=>{attempts++;throw new Error('Unexpected allocation');};
const instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);instance.exports.__rt_init();
instance.exports.MemberLayout();instance.exports.MemberLookup();instance.exports.MemberCompare();
const data=new DataView(instance.exports.memory.buffer),parts=test.output.trim().split(':');
assert.equal(data.getBigUint64(result.globals.get('member_hash').addr,true),BigInt('0x'+parts[1]));
assert.equal(data.getBigInt64(result.globals.get('member_cnt').addr,true),BigInt(parts[2]));assert.equal(attempts,0);
for(const name of ['MemberAdd','MemberLstNew','MemberLstDel','ClassMemberLstDel','MemberLstSize','CInit'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false}),/undefined symbol/);
console.log('Native member queries allocate nothing and require no task backend; compiler graph construction/destruction stays absent.');
