import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
import {read,hash} from './doc-layout/cases.mjs';
const original=read('NativeLayout.HC');
const split=original.slice(original.indexOf('CDocEntry *DocSplitTag'),original.indexOf('CDocEntry *DocWordWrapAdd')).replaceAll('DocSplitTag','DocSplitTagOriginal');
const source=read('Common.HC')+split+read('LayoutFault.HC').replaceAll('DocSplitTag(','DocSplitTagOriginal(')+'\nRaw(OFF);\n';
const r=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports:['LayoutFault']});assert.deepEqual(r.warnings,[]);
const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{}}),live=new Set();
let armed=false,fail=false,calls=0,before,after;
for(const name of ['__malloc','__malloc_for','__malloc_kernel']) {
 const alloc=host.env[name];host.env[name]=(...args)=>{if(armed && ++calls===2 && fail)return 0n;const p=alloc(...args);if(p>0n)live.add(p);return p;};
}
const free=host.env.__free;host.env.__free=p=>{free(p);live.delete(p);};
host.env.LayoutFaultMark=phase=>{if(!phase){before=live.size;calls=0;armed=true;}else{after=live.size;armed=false;}};
host.attach(new WebAssembly.Instance(new WebAssembly.Module(r.bytes),{env:host.env}));
try {
 await host.run();const initial=live.size;fail=true;
 assert.equal(await host.run('LayoutFault',0n,0n),0x6D654D74754Fn);
 assert.equal(after-before,1);assert.equal(live.size-initial,1);
} finally {armed=false;await host.dispose();}
assert.equal(live.size,0);
console.log('Negative control: original DocSplitTag loses one unpublished clone when its suffix allocation fails; the staged port passes the same ownership gate.');
if(process.argv.includes('--record'))writeFileSync(new URL('doc-layout/LayoutSplit.before.json',import.meta.url),JSON.stringify({
 originalSha256:hash(Buffer.from(original,'latin1')),inputSha256:hash(Buffer.from(source,'latin1')),
 fault:'Second allocation in original DocSplitTag: clone succeeds, suffix fails.',leakedAllocations:1,
 scope:'Actual host allocator injection of original native source; this is not native QEMU allocator injection.'},null,2)+'\n');
else {
 const proof=JSON.parse(readFileSync(new URL('doc-layout/LayoutSplit.before.json',import.meta.url)));
 assert.equal(proof.originalSha256,hash(Buffer.from(original,'latin1')));assert.equal(proof.inputSha256,hash(Buffer.from(source,'latin1')));
 assert.equal(proof.leakedAllocations,1);
}
