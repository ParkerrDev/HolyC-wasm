import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {compile} from '../src/codegen.js';
import {parse} from '../src/parser.js';
import {lex} from '../src/lexer.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const poisoned=/initialization failed or reentered; create a fresh module instance/;
function load(source,configure=()=>{}) {
  const result=compileHolyC(source,{lenient:false});assert.deepEqual(result.warnings,[]);
  const host=createHost({onText:()=>{}});let instance;
  configure(host,()=>instance?.exports);
  instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  return {result,host,fn:instance.exports};
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
// Controlled runtime data must initialize before its hook; user globals follow.
const ast=parse(lex('I64 data=7; U0 Hook(){data+=1;} I64 observed=data; I64 Read(){return observed;}','init.hc'));
ast.decls.find(node=>node.name==='data').filename='<prelude>';
const ordered=compile(ast,{lenient:false,exports:['Read'],runtimeInitializers:[{name:'Hook',always:true}]});
const orderHost=createHost(),orderInstance=new WebAssembly.Instance(new WebAssembly.Module(ordered.bytes),{env:orderHost.env});
orderHost.attach(orderInstance);orderInstance.exports.__rt_init();
assert.equal(orderInstance.exports.Read(),8n);orderInstance.exports.__rt_init();assert.equal(orderInstance.exports.Read(),8n);
const empty=compileHolyC('I64 Value(){return 1;}',{noPrelude:true,lenient:false,exports:['Value']});
assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(empty.bytes)),[]);
console.log('Runtime initialization: prelude/hook/user order, OOM before side effects, typed/host/trap/reentrant poison and fresh-instance recovery pass.');
