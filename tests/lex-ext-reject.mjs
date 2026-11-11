import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {read} from './lex-ext/cases.mjs';
const r=compileHolyC(read('ExtReject.HC'),{lenient:false,exports:['ExtReject']});assert.deepEqual(r.warnings,[]);
const host=createHost(),live=new Set();let armed=false,calls=0;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']){
 const alloc=host.env[name];host.env[name]=(...args)=>{if(armed)calls++;const p=alloc(...args);if(p>0n)live.add(p);return p;};
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};host.env.ExtFaultMark=phase=>{armed=!phase;if(armed)calls=0;};
const instance=new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env});host.attach(instance);
try{instance.exports.__main();const count=live.size;for(let mode=0n;mode<3n;mode++){
 assert.equal(instance.exports.ExtReject(mode),mode===2n?0x657461745378654Cn:0x65646F4D78654Cn);assert.equal(calls,0);assert.equal(live.size,count);
}}finally{armed=false;for(const p of [...live])host.env.__free(p);}
assert.equal(live.size,0);console.log('Prompt/document/missing-stream rejection precedes string transfer or allocation and preserves control, source, size and exception state.');
