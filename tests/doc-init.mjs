import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {cases,recorded} from './doc-init/cases.mjs';
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.source,{lenient:false});
  assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities.includes('task-continuations');
  assert.equal(tasks,name==='DocTask');
  let output='',heap,count;const live=new Set();
  const host=(tasks?createTaskHost:createHost)({ansi:false,onText:s=>output+=s});
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
      if(tasks)assert.equal(host.state.tasks.length,1);
    }
  } finally {if(tasks)await host.dispose();else for(const ptr of [...live])host.env.__free(ptr);}
  assert.equal(live.size,0);console.log(name,'native values/parser state, five session lifetimes and complete disposal');
}
for(const name of ['DocInit','DocNew','DocRst','DocRecalc'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false}),/undefined symbol/);
assert.throws(()=>compileHolyC('DocClear;',{lenient:false,runtimeProfile:'keydev'}),/undefined symbol/);
const plain=compileHolyC('I64 Value(){return 1;}',{lenient:false,exports:['Value']});
assert(!WebAssembly.Module.imports(new WebAssembly.Module(plain.bytes)).some(entry=>entry.name.startsWith('__malloc')));
for(const source of [
  'I64 Read(){return doldoc.hash->mask;}',
  'CDolDocGlbls *p=&doldoc;I64 Read(){return p->hash->mask;}',
  'I64 Read(){U8 *p=&doldoc;CHashTable *table=*(p+offset(CDolDocGlbls.hash))(CHashTable **);return table->mask;}',
]) {
  const result=compileHolyC(source,{lenient:false,exports:['Read']});assert.deepEqual(result.warnings,[]);
  const host=createHost(),live=new Set();
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{const p=alloc(...args);if(p)live.add(p);return p;};
  }
  const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  instance.exports.__rt_init();assert.equal(instance.exports.Read(),511n);
  for(const p of [...live])host.env.__free(p);
}
console.log('Direct/typed/raw document-state access triggers real root initialization; unrelated modules remain allocation-free. Boot-only DocInit and unfinished document lifecycle APIs stay unavailable.');
