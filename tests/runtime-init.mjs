import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Hash} from './oracle/Prepare.mjs';
import {compileHolyC} from '../src/compiler.js';
import {compile} from '../src/codegen.js';
import {parse} from '../src/parser.js';
import {lex} from '../src/lexer.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
const poisoned=/initialization failed or reentered; create a fresh module instance/;
function load(source,configure=()=>{},options={}) {
  const result=compileHolyC(source,{lenient:false,...options});assert.deepEqual(result.warnings,[]);
  const host=createHost({onText:()=>{}});let instance;
  configure(host,()=>instance?.exports);
  instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  return {result,host,fn:instance.exports};
}
for(const name of ['DeferredInit','DeferredDefault']) {
  const source=readFileSync(new URL(`probes/${name}.HC`,import.meta.url));
  const proof=JSON.parse(readFileSync(new URL(`probes/${name}.native.json`,import.meta.url)));
  assert.equal(proof.sourceSha256,Hash(source));
  assert.equal(proof.runnerSha256,Hash(readFileSync(new URL('oracle/Qemu.mjs',import.meta.url))));
  assert.equal(proof.captureSha256,Hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url))));
  assert.equal(proof.outputSha256,Hash(Buffer.from(proof.out,'latin1')));
  assert.equal(proof.except,'Init');assert.equal(proof.backend.engine,'qemu');
  let out='';
  const result=compileHolyC(source.toString('latin1'),{lenient:false});
  assert.deepEqual(result.warnings,[]);
  const host=createHost({onText:s=>out+=s});
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  assert.throws(()=>instance.exports.__main(),WebAssembly.Exception);
  assert.equal(out,proof.out);
  assert.throws(()=>instance.exports.__main(),poisoned);assert.equal(out,proof.out);
}
// A real graphics hook allocation fails before any user initializer or main.
let fail=true,calls=0,effects=0;
const hookSource='import I64 Effect(); I64 width=gr.pen_brushes[3]->width; I64 seen=Effect; Effect;';
const hook=load(hookSource,host=>{
  const malloc=host.env.__malloc;
  host.env.__malloc=size=>{calls++;return fail?0n:malloc(size);};
  host.env.Effect=()=>{effects++;return 1n;};
});
assert.throws(()=>hook.fn.__main(),WebAssembly.Exception);
assert.equal(effects,0);const failedCalls=calls;fail=false;
for(let i=0;i<3;i++) {
  assert.throws(()=>hook.fn.__rt_init(),poisoned);
  assert.throws(()=>hook.fn.__main(),poisoned);
}
assert.equal(calls,failedCalls);assert.equal(effects,0);
const fresh=load(hookSource,host=>{host.env.Effect=()=>{effects++;return 1n;};});
fresh.fn.__main();assert.equal(effects,2);
fresh.fn.__rt_init();assert.equal(effects,2);fresh.fn.__main();assert.equal(effects,3);

// Typed exceptions, host errors, WASM traps and reentrancy all retain poison.
for(const mode of ['typed','host','trap','reentrant']) {
  let count=0,main=0;
  const source=`
import I64 Side(); import I64 Main();
I64 Fail() {${mode==='typed'?"throw('Init');":mode==='trap'?'U8 *ptr=0xFFFFFFFF;return *ptr;':''} return 1;}
I64 first=Side;
I64 second=Fail;
Main;
`;
  const test=load(source,(host,get)=>{
    host.env.Side=()=>{count++;if(mode==='host') throw new Error('host initialization failure');
      if(mode==='reentrant') get().__rt_init();return 1n;};
    host.env.Main=()=>{main++;return 0n;};
  });
  const initial=mode==='typed'?WebAssembly.Exception:mode==='trap'?WebAssembly.RuntimeError:
    mode==='host'?/host initialization failure/:poisoned;
  assert.throws(()=>test.fn.__main(),initial);assert.equal(count,1);assert.equal(main,0);
  assert.throws(()=>test.fn.__main(),poisoned);assert.equal(count,1);assert.equal(main,0);
}
// Deferred declarations must poison entry before any earlier top-level effects
// repeat. Both global values and captured defaults use this declaration path.
for(const declaration of ['I64 value=Fail;', 'I64 Value(I64 x=Fail){return x;}'])
  for(const mode of ['typed','host','trap','reentrant']) {
    let before=0,after=0,calls=0;
    const source=`
import I64 Before(); import I64 After(); import I64 Side();
I64 Fail() {Side; ${mode==='typed'?"throw('Init');":mode==='trap'?'U8 *ptr=0xFFFFFFFF;return *ptr;':''} return 7;}
Before;
${declaration}
After;
`;
    const test=load(source,(host,get)=>{
      host.env.Before=()=>{before++;return 0n;};
      host.env.After=()=>{after++;return 0n;};
      host.env.Side=()=>{calls++;if(mode==='host')throw new Error('deferred host failure');
        if(mode==='reentrant')get().__main();return 0n;};
    });
    const initial=mode==='typed'?WebAssembly.Exception:mode==='trap'?WebAssembly.RuntimeError:
      mode==='host'?/deferred host failure/:poisoned;
    assert.throws(()=>test.fn.__main(),initial);
    assert.deepEqual([before,after,calls],[1,0,1]);
    for(let i=0;i<2;i++) {
      assert.throws(()=>test.fn.__main(),poisoned);
      assert.throws(()=>test.fn.__rt_init(),poisoned);
    }
    assert.deepEqual([before,after,calls],[1,0,1]);
  }
// A deferred-only module also needs the guard even without prelude/init hooks.
const deferredSource='import I64 Side(); import I64 Main(); Main; I64 value=Side; Main;';
let side=0,main=0,failDeferred=true;
const deferredConfig=host=>{
  host.env.Side=()=>{side++;if(failDeferred)throw new Error('deferred');return 9n;};
  host.env.Main=()=>{main++;return 0n;};
};
const deferred=load(deferredSource,deferredConfig,{noPrelude:true});
assert.throws(()=>deferred.fn.__main(),/deferred/);failDeferred=false;
assert.throws(()=>deferred.fn.__main(),poisoned);assert.deepEqual([side,main],[1,1]);
const deferredFresh=load(deferredSource,deferredConfig,{noPrelude:true});
deferredFresh.fn.__main();deferredFresh.fn.__main();
assert.deepEqual([side,main],[2,5]);
// A failed JSPI startup must poison later runs too, without entering main.
let taskEffects=0;
const taskResult=compileHolyC(hookSource+' I64 Waiter(){return GetKey;}',{lenient:false,exports:['Waiter']});
const taskHost=createTaskHost(),taskMalloc=taskHost.env.__malloc;
let taskFail=true;
taskHost.env.__malloc=size=>taskFail?0n:taskMalloc(size);
taskHost.env.Effect=()=>{taskEffects++;return 1n;};
const taskInstance=new WebAssembly.Instance(new WebAssembly.Module(taskResult.bytes),{env:taskHost.env});taskHost.attach(taskInstance);
const taskHeap=taskHost.state.heapPtr;
await assert.rejects(taskHost.run(),WebAssembly.Exception);taskFail=false;
await assert.rejects(taskHost.run(),poisoned);assert.equal(taskEffects,0);
await assert.rejects(taskHost.dispose(),poisoned);
assert.equal(taskHost.state.heapPtr,taskHeap);
const delayedTask=compileHolyC('import I64 Side(); Side; I64 value=Side; GetKey;',{lenient:false});
const delayedHost=createTaskHost();let delayedCalls=0;
delayedHost.env.Side=()=>{if(++delayedCalls===2)throw new Error('deferred task failure');return 7n;};
const delayedInstance=new WebAssembly.Instance(new WebAssembly.Module(delayedTask.bytes),{env:delayedHost.env});
delayedHost.attach(delayedInstance);const delayedHeap=delayedHost.state.heapPtr;
await assert.rejects(delayedHost.run(),/deferred task failure/);
await assert.rejects(delayedHost.run(),poisoned);assert.equal(delayedCalls,2);
await assert.rejects(delayedHost.dispose(),poisoned);
assert.equal(delayedHost.state.heapPtr,delayedHeap);
// Controlled runtime data must initialize before its hook; user globals follow.
const ast=parse(lex('I64 data=7; U0 Hook(){data+=1;} I64 observed=data; I64 Read(){return observed;}','init.hc'));
ast.decls.find(node=>node.name==='data').filename='<prelude>';
const ordered=compile(ast,{lenient:false,exports:['Read'],runtimeInitializers:[{name:'Hook',always:true}]});
const orderHost=createHost(),orderInstance=new WebAssembly.Instance(new WebAssembly.Module(ordered.bytes),{env:orderHost.env});
orderHost.attach(orderInstance);orderInstance.exports.__rt_init();
assert.equal(orderInstance.exports.Read(),8n);orderInstance.exports.__rt_init();assert.equal(orderInstance.exports.Read(),8n);
// Native graphics defaults capture gr.dc after the device hook establishes it.
const drawing='gr.dc->color=RED; GrRect(,0,0,20,20); GrPlot(,639,479);';
for(const cooperative of [false,true]) {
  const result=compileHolyC(drawing+(cooperative?' GetKey;':''),{lenient:false});
  const gfx=new Framebuffer(null),indices=gfx.indices;
  const host=(cooperative?createTaskHost:createHost)({gfx});
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
  host.attach(instance);
  const running=cooperative?host.run():instance.exports.__main();
  for(let y=0;y<480;y++) for(let x=0;x<640;x++)
    assert.equal(indices[y*640+x],x<20 && y<20 || x===639 && y===479?4:0,
      `omitted CDC must draw before waiting at ${x},${y}`);
  if(cooperative) {assert(host.postMessage(2,27,1));await running;await host.dispose();}
}
const empty=compileHolyC('I64 Value(){return 1;}',{noPrelude:true,lenient:false,exports:['Value']});
assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(empty.bytes)),[]);
console.log('Runtime initialization: prelude data/hook/default/user order, omitted graphics CDC, OOM before side effects, typed/host/trap/reentrant poison and fresh-instance recovery pass.');
