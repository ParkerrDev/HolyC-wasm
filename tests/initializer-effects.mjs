import assert from 'node:assert/strict';
import {lex} from '../src/lexer.js';
import {parse} from '../src/parser.js';
import {compile} from '../src/codegen.js';
import {createHost} from '../src/runtime/host.js';
const prelude=`
class CState {I64 counter;U8 *table;I64 spare[1];}; CState state,extra;
I64 extra_seen;
import U0 Zero(U8 *ptr,I64 size);
import U8 *Allocate(); import U8 *AllocateExtra();
U0 Clear(){Zero(&state,sizeof(CState));}
U0 Tables(){state.table=Allocate;}
U0 Extra(){extra.table=AllocateExtra;}
U0 Touch(){extra_seen=extra.table;}
`;
function load(source,{effect=true,observe=false}={}) {
  const pre=observe?prelude.replace('Zero(&state,sizeof(CState));}', 'Zero(&state,sizeof(CState));Touch;}'):prelude;
  const tokens=[...lex(pre,'<prelude>').filter(token=>token.type!=='eof'),...lex(source,'effect.hc')];
  const ast=parse(tokens),result=compile(ast,{lenient:false,exports:['Read'],runtimeInitializers:[
    {name:'Extra',fields:['extra.table']},
    {name:'Clear',globals:['state'],writeOnlyGlobals:effect?['state']:[]},
    {name:'Tables',fields:['state.table']},
  ]});
  const host=createHost();let instance,calls=0,extraCalls=0;
  host.env.Zero=(ptr,size)=>new Uint8Array(instance.exports.memory.buffer).fill(0,Number(ptr),Number(ptr+size));
  host.env.Allocate=()=>{calls++;return 0x4000n;};
  host.env.AllocateExtra=()=>{extraCalls++;return 0x5000n;};
  instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  instance.exports.__rt_init();return {result,instance,calls,extraCalls};
}
const plain='I64 Read(){return state.counter;}';
assert.equal(load(plain).calls,0,'A trusted reset does not read or escape table contents.');
assert.equal(load(plain,{effect:false}).calls,1,'Negative control: an unannotated whole-object reset conservatively initializes tables.');
for(const source of [
  'I64 Read(){return state.table;}',
  'CState *alias=&state;I64 Read(){return alias->table;}',
  'I64 Read(){U8 *ptr=&state;return *(ptr+offset(CState.table))(U8 **);}',
  'I64 Read(){return &state;}',
  'I64 Read(){U8 *ptr=&state.counter;return *(ptr+offset(CState.table))(U8 **);}',
  'I64 Read(){U8 *ptr=state.spare;ptr-=offset(CState.spare);return *(ptr+offset(CState.table))(U8 **);}',
]) {
  const test=load(source);assert.equal(test.calls,1,'Ordinary field/alias/raw-offset escapes remain dependencies.');
  assert(test.instance.exports.Read());
}
const untrusted=load('U0 Clear(){Zero(&state,sizeof(CState));}'+plain);
assert.equal(untrusted.calls,1,'A user replacement cannot inherit trusted initializer effects.');
const callee=load(plain,{observe:true});
assert.equal(callee.calls,0);assert.equal(callee.extraCalls,1,'Callee dependencies are not suppressed.');
const memory=new DataView(callee.instance.exports.memory.buffer);
assert.equal(memory.getBigInt64(callee.result.globals.get('extra_seen').addr,true),0x5000n);
console.log('Initializer effects preserve caller escapes, raw offsets, user replacements and callee dependencies; reset-only fields do not force unrelated allocation.');
