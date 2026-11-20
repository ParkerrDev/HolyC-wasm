import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {cases,recorded} from './keydev/cases.mjs';
const build=(source,options={})=>{
  const result=compileHolyC(source,{lenient:false,...options});
  assert.deepEqual(result.warnings,[]);return {...result,module:new WebAssembly.Module(result.bytes)};
};
//One Adam: every program prints through the task's key devices.
for(const profile of ['console','keydev'])assert.throws(()=>build('"?";',{runtimeProfile:profile}),/one runtime/);
assert.deepEqual(build('"CONSOLE\\n";').requiredCapabilities,['task-continuations']);
const profile=build('I64 started=0; started=1; Raw(OFF); "KEYDEV\\n";',{exports:['MAlloc']});
assert.deepEqual(profile.requiredCapabilities,['task-continuations']);
new WebAssembly.Instance(profile.module,{env:createTaskHost().env}); //With no screen, raw text shows nowhere.
let premature=0;
const noTasks=createHost({gfx:new Framebuffer(null),onText:()=>premature++});
for(const name of ['__malloc','__malloc_kernel']) {
  const alloc=noTasks.env[name];noTasks.env[name]=(...args)=>{premature++;return alloc(...args);};
}
assert.throws(()=>new WebAssembly.Instance(profile.module,{env:noTasks.env}),/task continuation/);
assert.equal(premature,0);
const noJspi=createTaskHost({gfx:new Framebuffer(null),webAssembly:{},onText:()=>premature++});
assert.throws(()=>new WebAssembly.Instance(profile.module,{env:noJspi.env}),/JSPI/);
assert.equal(premature,0);
for(const name of cases) {
  const fixture=recorded(name),result=build(fixture.wasmSource,{});
  let out='',first=null;
  const host=createTaskHost({gfx:new Framebuffer(null),ansi:false,onText:text=>out+=text});
  host.attach(new WebAssembly.Instance(result.module,{env:host.env}));
  try {
    for(let i=0;i<4;i++) {
      out='';await host.run();assert.equal(out,fixture.output,name);
      if(first===null)first=host.state.heapPtr;else assert.equal(host.state.heapPtr,first,name);
      assert.equal(host.state.tasks.length,1);
    }
  } finally {await host.dispose();}
  assert.equal(host.state.tasks[0].allocations,0,name);
  console.log(fixture.output.trim(),'four sessions and disposal pass');
}
console.log('KeyDev: one runtime, startup device/continuation gates and source-hashed native device/ScrollLock behavior pass.');
