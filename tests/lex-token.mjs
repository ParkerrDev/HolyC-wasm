import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {cases,recorded} from './lex-token/cases.mjs';
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.wasmSource,{lenient:false,runtimeProfile:test.profile});
  assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities.includes('task-continuations');
  assert.equal(tasks,test.profile==='keydev');
  let output='',heap,count;const live=new Set(),diagnostics=[];
  const host=(tasks?createTaskHost:createHost)({gfx:new Framebuffer(null),ansi:false,onText:s=>output+=s,
    onLexError:record=>diagnostics.push(record)});
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{const ptr=alloc(...args);if(ptr)live.add(ptr);return ptr;};
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const module=new WebAssembly.Module(result.bytes);
  assert(WebAssembly.Module.imports(module).some(entry=>entry.name==='__lex_error'));
  const missing={...host.env};delete missing.__lex_error;
  assert.throws(()=>new WebAssembly.Instance(module,{env:missing}),WebAssembly.LinkError);
  assert.equal(live.size,0);assert.equal(output,'');
  const instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
  try {
    for(let i=0;i<5;i++) {
      output='';diagnostics.length=0;
      if(tasks)await host.run();else instance.exports.__main();
      assert.equal(output,test.output,name);
      if(i===0){heap=host.state.heapPtr;count=live.size;}
      else{assert.equal(host.state.heapPtr,heap,name);assert.equal(live.size,count,name);}
      if(tasks)assert.equal(host.state.tasks.length,1);
      if(name==='LexMalformed') {
        assert.equal(diagnostics.length,3);
        for(const [j,record] of diagnostics.entries()) {
          assert.equal(record.category,'Compiler');assert.equal(record.filename,'C:/Malformed.HC');
          assert.equal(record.reason,j?'Char const limited to 8 chars at ':'Ident limited to STR_LEN chars at ');
          assert.equal(record.line,2n);assert.equal(record.lastLine,2n);assert.equal(record.token,256n);
          assert.equal(record.offset,[147n,13n,21n][j]);assert.equal(record.column,[144n,10n,18n][j]);
          assert(record.task>0n);assert(Object.isFrozen(record));
        }
        assert.equal(host.state.lexError,diagnostics[2]);assert.equal(host.state.lexDiagnosticError,null);
      } else assert.deepEqual(diagnostics,[]);
    }
  } finally {if(tasks)await host.dispose();else for(const ptr of [...live])host.env.__free(ptr);}
  assert.equal(live.size,0);console.log(name,'native token/state/error data, five lifetimes and final disposal');
}
for(const name of ['LexPutPos','LexWarn','LexExcept'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false}),/undefined symbol/);
console.log('Finite scanning preserves console independence and requires its diagnostic device before execution; debugger diagnostics remain absent.');
