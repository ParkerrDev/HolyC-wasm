import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {cases,recorded} from './lex-report/cases.mjs';
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.wasmSource,{lenient:false});
  assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities.includes('task-continuations');
  let output='',heap,count;const live=new Set(),host=(tasks?createTaskHost:createHost)({gfx:new Framebuffer(null),ansi:false,onText:s=>output+=s});
  for(const name of ['__malloc','__malloc_kernel']) {
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
  assert.equal(live.size,0);console.log(name,'native output/state, five lifetimes and final disposal');
}
//LexPutLine prints, so it is a task program; with no line it allocates and prints nothing.
const line=compileHolyC('LexPutLine(NULL,NULL);',{lenient:false,exports:['LexPutLine']});
assert.deepEqual(line.requiredCapabilities,['task-continuations']);
let attempts=0,armed=false,output='';const lineHost=createTaskHost({jit:line.jit,ansi:false,onText:s=>output+=s});
for(const name of ['__malloc','__malloc_kernel']) {
  const alloc=lineHost.env[name];
  lineHost.env[name]=(...args)=>{if(armed){attempts++;throw new Error('Unexpected line allocation');}return alloc(...args);};
}
lineHost.attach(new WebAssembly.Instance(new WebAssembly.Module(line.bytes),{env:lineHost.env}));
try {
  await lineHost.run();armed=true;
  assert.equal(await lineHost.run('LexPutLine',0n,0n),undefined);
} finally {armed=false;await lineHost.dispose();}
assert.equal(attempts,0);assert.equal(output,'');
for(const name of ['LexPutPos','LexWarn'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false}),/undefined symbol/);
//LexExcept is V5.03's name for the throw; here it reports through LexHostFail.
assert.throws(()=>compileHolyC('LexExcept;',{lenient:false}),/Missing required function argument/);
console.log('Reporting primitives preserve console independence; debugger diagnostic orchestration remains absent.');
