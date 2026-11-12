import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read} from './doc-output/cases.mjs';
const r=compileHolyC(read('Common.HC')+read('Fault.HC'),{lenient:false,runtimeProfile:'keydev',exports:['ParseFaultSetup','ParseFault','ParseFaultDone']});
assert.deepEqual(r.warnings,[]);
let diagnosticFailure=null;
const diagnostics=[],live=new Map(),host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{},onLexError:r=>{
  diagnostics.push(r);if(diagnosticFailure)throw diagnosticFailure;
}});
let armed=false,calls=0,failAt=0,persistent=false,failed=0,before,after,error,type;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
  const alloc=host.env[name];host.env[name]=(...args)=>{
    if(armed){calls++;if(failAt && (calls===failAt || persistent && calls>failAt)){failed++;return 0n;}}
    const p=alloc(...args);
    if(p>0n)live.set(p,name==='__malloc_for'?args[1]:name==='__malloc_kernel'?(host.state.tasks[0]?.ptr??0n):(host.state.tasks.find(t=>t.status==='running')?.ptr??0n));
    return p;
  };
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
const state=()=>({live:[...live].sort((a,b)=>a[0]<b[0]?-1:1),heap:host.state.heapPtr,stack:instance.exports.__sp.value,
  owners:host.state.tasks.map(t=>[t.ptr,t.allocations])});
host.env.ParseFaultMark=(phase,owner,code,kind)=>{
  if(!phase){before=state();armed=true;calls=0;failed=0;}
  else if(phase===1n)armed=false;
  else {after=state();error=code;type=kind;assert.deepEqual(after,before);}
};
host.env.ParseFaultPtr=(ptr,owner)=>{if(ptr)assert.equal(live.get(ptr),owner,'published entry/string owner');};
const instance=new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env});host.attach(instance);
const OutMem=0x6D654D74754Fn,DocCaps=0x73706143636F44n,LexCaps=0x7370614378654Cn;
let count=0;
try{
  await host.run('ParseFaultSetup');const baseline=state();
  for(const foreign of [0n,1n])for(const child of [0n,1n])for(let mode=0n;mode<9n;mode++){
    failAt=0;await host.run('ParseFault',mode,foreign,child);
    const sites=calls;assert(sites>0);
    if(mode<5n)assert.equal(error,0n);
    if(mode===5n || mode===6n){assert.equal(error,0n);assert.equal(type,42n,`mode ${mode}`);}
    if(mode===7n)assert.equal(error,DocCaps);
    if(mode===8n)assert.equal(error,LexCaps);
    assert.deepEqual(state(),baseline);
    for(persistent of [false,true])for(let n=1;n<=sites;n++){
      failAt=n;await host.run('ParseFault',mode,foreign,child);assert(failed>0);
      assert(error===OutMem || type===42n || mode>=7n && (error===DocCaps || error===LexCaps),`mode ${mode}, allocation ${n}, error ${error}, type ${type}`);
      assert.deepEqual(state(),baseline);count++;
      failAt=0;await host.run('ParseFault',mode,foreign,child);assert.deepEqual(state(),baseline);
    }
  }
  diagnosticFailure=new Error('Throwing diagnostic observer');
  for(const foreign of [0n,1n])for(const child of [0n,1n])for(const mode of [6n,8n]){
    failAt=0;await host.run('ParseFault',mode,foreign,child);
    assert.equal(host.state.lexDiagnosticError,diagnosticFailure);
    assert.equal(error,mode===6n?0n:LexCaps);
    if(mode===6n)assert.equal(type,42n);
    assert.deepEqual(state(),baseline);
  }
  diagnosticFailure=null;
  await host.run('ParseFaultDone');
}finally{armed=false;await host.dispose();}
assert.equal(live.size,0);
assert(diagnostics.some(d=>d.category==='Compiler'));assert(diagnostics.some(d=>d.category==='LexCaps'));
console.log(count,'one-shot/persistent parser allocation failures retain no control/entry/string allocations; current/foreign output owners, child callers, heap/stack restoration, syntax errors, explicit capability rejection, eight throwing diagnostic callbacks and immediate retries pass.');
