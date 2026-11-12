import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {recorded} from './doc-put/cases.mjs';
recorded('Owner');
recorded('RejectOwned');
for(const name of ['Put','Break','Reject']){
const test=recorded(name),r=compileHolyC(test.source,{lenient:false,runtimeProfile:'keydev'});
assert.deepEqual(r.warnings,[]);
let out='',heap,count;const live=new Set(),host=createTaskHost({gfx:new Framebuffer(null),onText:s=>out+=s});
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
  const alloc=host.env[name];host.env[name]=(...args)=>{const p=alloc(...args);if(p>0n)live.add(p);return p;};
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
try{
  for(let i=0;i<5;i++){
    out='';await host.run();assert.equal(out,test.output);
    if(!i){heap=host.state.heapPtr;count=live.size;}
    else{assert.equal(host.state.heapPtr,heap);assert.equal(live.size,count);}
    assert.equal(host.state.tasks.length,1);
  }
}finally{await host.dispose();}
assert.equal(live.size,0);console.log(out.trim(),'five lifetimes, plateau and complete disposal');
}
for(const name of ['DocPutS','DocPrint'])assert.throws(()=>compileHolyC(name+';',{lenient:false}),/undefined|untyped/);
for(const name of ['DocNew','DocClear','DocPrintPartial','EdLeftClickLink'])
  assert.throws(()=>compileHolyC(name+';',{lenient:false,runtimeProfile:'keydev'}),/undefined|untyped/);
