import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {cases,recorded} from './function-bind/cases.mjs';
recorded('FunctionExports');
for(const name of cases) {
  const test=recorded(name),result=compileHolyC(test.source.toString('latin1'),{lenient:false});
  assert.deepEqual(result.warnings,[]);let output='';
  const host=createHost({ansi:false,onText:s=>output+=s});
  const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
  instance.exports.__main();assert.equal(output,test.output,name);console.log(test.output.trim());
}
const source=`
I64 replaced=0;
U8 *MemSet(U8 *dst,I64 val,I64 cnt){replaced++;if(cnt==sizeof(CCmpGlbls))throw('Wrong');__memfill(dst,val,cnt);return dst+cnt;}
I64 Read(){return cmp.compiled_lines;}
U8 buf[4];
MemSet(buf,3,4);
`;
const result=compileHolyC(source,{lenient:false,exports:['Read']}),host=createHost();
let allocations=0;const alloc=host.env.__malloc_kernel;
host.env.__malloc_kernel=size=>{allocations++;return alloc(size);};
const module=new WebAssembly.Module(result.bytes),instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
instance.exports.__main();assert.equal(instance.exports.Read(),0n);assert.equal(allocations,0);
assert(!WebAssembly.Module.imports(module).some(entry=>entry.name==='__malloc_kernel'));
const data=new DataView(instance.exports.memory.buffer);
assert.equal(data.getBigInt64(result.globals.get('replaced').addr,true),1n);
assert.equal(data.getUint32(result.globals.get('buf').addr,true),0x03030303);
assert.throws(()=>compileHolyC('I64 Defined(){return 1;} extern I64 Defined(); Defined;',{lenient:false}),/Unresolved function/);
console.log('Earlier prelude reset calls stay on original MemSet; explicit new calls use the replacement without allocating compiler tables.');

const core=compileHolyC('I64 OldCore(){return MyCore;} I64 MyCore(){return 77;} I64 ReadCore(){return OldCore*100+MyCore;}',{lenient:false,exports:['ReadCore']});
const coreHost=createHost(),coreInstance=new WebAssembly.Instance(new WebAssembly.Module(core.bytes),{env:coreHost.env});
coreHost.attach(coreInstance);coreInstance.exports.__core.value=5n;coreInstance.exports.__rt_init();
assert.equal(coreInstance.exports.ReadCore(),577n,'MyCore remains an explicitly host-only intrinsic before its user definition.');
assert.throws(()=>compileHolyC('extern F64 Forward(); F64 Read(){return Forward;} I64 Forward(){return 1;} Read;',{lenient:false}),/Function header changes WASM ABI/);
assert.throws(()=>compileHolyC('U8 *MAlloc(I64 n,CTask *task=NULL){return 0;} DirCur;',{lenient:false,exports:['MAlloc']}),/Conflicting runtime and user function export: MAlloc/);
