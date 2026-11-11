import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {cases,recorded} from './doc-recalc/cases.mjs';
for(const name of cases) {
  const test=recorded(name);if(name==='RecalcOwner')continue;
  const result=compileHolyC(test.source,{lenient:false,runtimeProfile:'keydev'});
  assert.deepEqual(result.warnings,[]);
  let output='',heap,count;const live=new Set();
  const host=createTaskHost({gfx:new Framebuffer(null),ansi:false,onText:s=>output+=s});
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{const p=alloc(...args);if(p>0n)live.add(p);return p;};
  }
  const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
  host.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env}));
  try {
    for(let i=0;i<5;i++) {
      output='';await host.run();assert.equal(output,test.output,name);
      if(!i){heap=host.state.heapPtr;count=live.size;}
      else{assert.equal(host.state.heapPtr,heap,name);assert.equal(live.size,count,name);}
      assert.equal(host.state.tasks.length,1);
    }
  } finally {await host.dispose();}
  assert.equal(live.size,0);console.log(test.output.trim(),'five lifetimes and complete disposal');
}
for(const name of ['DocNew','DocRst','DocTop','DocBottom','DocClear','EdLeftClickLink'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false,runtimeProfile:'keydev'}),/undefined|untyped/);
assert.throws(()=>compileHolyC('DocRecalc(NULL);',{lenient:false}),/undefined|untyped/);
console.log('Normal layout is explicit KeyDev functionality; console, screen/editor and reset/clear boundaries remain.');
