import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
const source=`I64 raw_cols=text.cols,raw_rows=text.rows,raw_size=MSize(text.raw_scrn_image);
U0 Child(U8 *) {RawPutChar('F'); Sleep(1);}
U0 Check() {
  CTask *child;
  if(raw_cols!=80 || raw_rows!=60 || raw_size!=38400) throw('RawInit');
  if(text.font!=sys_font_std || text.aux_font!=sys_font_cyrillic) throw('RawFont');
  child=Spawn(&Child,,,,Fs); while(TaskValidate(child)) Sleep(1);
  if(MSize(text.raw_scrn_image)!=38400) throw('RawLife');
}
Check;`;
const r=compileHolyC(source,{lenient:false,exports:['Check']});assert.deepEqual(r.warnings,[]);
const fb=new Framebuffer(null),host=createTaskHost({gfx:fb,onText:()=>{}});
const instance=new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env});host.attach(instance);
let first=null;
try{
 for(let i=0;i<5;i++){
  await host.run();
  if(first===null)first=host.state.heapPtr;else assert.equal(host.state.heapPtr,first);
  assert.equal(host.state.tasks.length,1);assert.equal(host.state.tasks[0].status,'dead');
 }
 assert(fb.indices.some(v=>v===15));
}finally{await host.dispose();}
assert.equal(host.state.tasks[0].allocations,0,'Session cache is released on dispose.');
const simple=compileHolyC('I64 cols=text.cols; "READY:%d\\n",cols;',{lenient:false});
let output='',fail=true;
const retry=createHost({ansi:false,onText:s=>output+=s}),alloc=retry.env.__malloc_kernel;
retry.env.__malloc_kernel=size=>{if(size===38400n && fail){fail=false;return 0n;}return alloc(size);};
const inst=new WebAssembly.Instance(new WebAssembly.Module(simple.bytes),{env:retry.env});retry.attach(inst);
assert.throws(()=>inst.exports.__main());assert.equal(output,'');
assert.throws(()=>inst.exports.__main(),/fresh.*instance/);assert.equal(output,'');
const fresh=createHost({ansi:false,onText:s=>output+=s});
const clean=new WebAssembly.Instance(new WebAssembly.Module(simple.bytes),{env:fresh.env});fresh.attach(clean);
clean.exports.__main();assert.equal(output,'READY:80\n');
console.log('Raw state: initialized before user globals, child lifetime, five-run heap plateau, session disposal, poisoned-initialization refusal and fresh-instance recovery pass.');
