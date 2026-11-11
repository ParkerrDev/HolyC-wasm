import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {hash} from './integer-promotion/cases.mjs';
const url=new URL('probes/NarrowRegister.HC',import.meta.url),source=readFileSync(url),proofUrl=new URL('probes/NarrowRegister.native.json',import.meta.url);
const identity={sourceSha256:hash(source),captureSha256:hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url)))};
let output='';const result=compileHolyC(source.toString('latin1'),{lenient:false});assert.deepEqual(result.warnings,[]);
const host=createHost({onText:s=>output+=s}),instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);instance.exports.__main();
if(process.argv.includes('--record')){
 const {QemuRun}=await import('./oracle/Qemu.mjs'),{manifest}=await import('./oracle/Prepare.mjs'),native=await QemuRun([source]),r=native.results[0];
 assert.equal(r.except,'');
 writeFileSync(proofUrl,JSON.stringify({manifest,backend:native.backend,evidence:native.evidence,...identity,except:r.except,out:r.out,outputSha256:hash(Buffer.from(r.out,'latin1')),wasm:output,scope:'Native register-local allocation can retain 64 bits in narrow declarations; memory stores truncate. This is separate from arithmetic raw_type selection.'},null,2)+'\n');
}
const proof=JSON.parse(readFileSync(proofUrl));
for(const [key,value] of Object.entries(identity))assert.equal(proof[key],value);
assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.except,'');
assert.equal(proof.outputSha256,hash(Buffer.from(proof.out,'latin1')));
assert.equal(output,proof.out);
console.log('Original native register/memory/product witness matched.');
