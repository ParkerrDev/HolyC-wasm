import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {recorded} from './doc-clear/cases.mjs';
recorded('Owner');
for(const name of ['Clear','Break','Reject']){
  const test=recorded(name),r=compileHolyC(test.source,{lenient:false,runtimeProfile:'keydev'});
  assert.deepEqual(r.warnings,[]);
  let out='',heap,count,guard=false;const live=new Set();
  const host=createTaskHost({gfx:new Framebuffer(null),onText:s=>out+=s});
  for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
    const alloc=host.env[name];host.env[name]=(...args)=>{
      assert(!guard,'unsupported Clear must fail before allocating');
      const p=alloc(...args);if(p>0n)live.add(p);return p;
    };
  }
  const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
  host.env.ClearRejectMark=phase=>{guard=phase===0n;};
  host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
  try{
    for(let i=0;i<5;i++){
      out='';await host.run();assert.equal(out,test.output);
      if(!i){heap=host.state.heapPtr;count=live.size;}
      else{assert.equal(host.state.heapPtr,heap);assert.equal(live.size,count);}
      assert.equal(host.state.tasks.length,1);
    }
  }finally{guard=false;await host.dispose();}
  assert.equal(live.size,0);console.log(out.trim(),'five lifetimes, plateau and complete disposal');
}
for(const name of ['DocNew','DocPrintPartial','EdLeftClickLink'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false,runtimeProfile:'keydev'}),/undefined|untyped/);
