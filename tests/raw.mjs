import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {Framebuffer} from '../src/runtime/graphics.js';

const fb=new Framebuffer(null,13,3),host=createHost({gfx:fb}),
  memory=new WebAssembly.Memory({initial:1,maximum:2});
host.attach({exports:{memory}});
const bytes=new Uint8Array(memory.buffer),base=128;
bytes.set([0x81,0xA8,0x55,0x50,0xF0,0x08],base);
const update=(...args)=>host.env.__gr_update_mono(...args.map(BigInt));
update(base,2,0,0,13,3);
assert.deepEqual(Array.from(fb.indices),[
  15,0,0,0,0,0,0,15,15,0,15,0,15,
  0,15,0,15,0,15,0,15,0,15,0,15,0,
  15,15,15,15,0,0,0,0,0,0,0,0,15,
]);
fb.indices.fill(6);update(base,2,7,0,3,2);
assert.deepEqual(Array.from(fb.indices),[
  6,6,6,6,6,6,6,15,15,0,6,6,6,
  6,6,6,6,6,6,6,15,0,15,6,6,6,
  6,6,6,6,6,6,6,6,6,6,6,6,6,
]);
fb.indices.fill(6);update(base,2,-7,-1,9,2);
assert.deepEqual(Array.from(fb.indices),[15,0,...Array(37).fill(6)]);
const saved=fb.indices.slice();
for(const args of [[65531,2,0,0,13,4],[base,1,0,0,13,3],
  [-1,2,0,0,13,3],[base,0,0,0,13,3],[base,2,0,0,-1,3],
  [base,2,0,0,13,-1],[base,2,Number.MAX_SAFE_INTEGER,0,13,3]]){
  assert.throws(()=>update(...args),RangeError);
  assert.deepEqual(fb.indices,saved,'Rejected update must not partly modify the screen.');
}
update(base,2,20,0,4,3);update(base,2,0,0,0,3);
assert.deepEqual(fb.indices,saved);
memory.grow(1);new Uint8Array(memory.buffer).set([0x80,0],65536);
update(65536,2,0,0,1,1);assert.equal(fb.indices[0],15);
assert(!('__gr_update_mono' in createHost().env),'Absent device remains an unresolved import.');
assert(!('__gr_update_mono' in createHost({gfx:{sprite(){}}}).env));

async function nativeFixture(name){
 const source=await readFile(new URL('probes/'+name+'.HC',import.meta.url),'latin1'),
   output=await readFile(new URL('probes/'+name+'.out',import.meta.url),'latin1'),
   evidence=JSON.parse(await readFile(new URL('probes/'+name+'.native.json',import.meta.url)));
 const hash=s=>createHash('sha256').update(s,'latin1').digest('hex');
 assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
 assert.equal(hash(source),evidence.sourceSha256);assert.equal(hash(output),evidence.outputSha256);
 return {source,output};
}
const native=await nativeFixture('RawRasterChk'),font=await nativeFixture('RawFontChk');
const vga=await nativeFixture('RawVgaChk');assert.match(vga.output,/RawVga:[0-9A-F]{16}:0\n/);
const fixture=native.source
    .replace('text.raw_flags=flags;','__gr_update_mono(image,80,0,0,640,480);\n      text.raw_flags=flags;')
    .replace('for (j=0;j<GR_WIDTH*GR_HEIGHT/8;j++)','RawDeviceChk(image);\n      for (j=0;j<GR_WIDTH*GR_HEIGHT/8;j++)');
const result=compileHolyC('import U0 RawDeviceChk(U8 *image);\n'+fixture,{lenient:false});
assert.deepEqual(result.warnings,[]);
let output='',checks=0;
const screen=new Framebuffer(null),device=createHost({gfx:screen,ansi:false,onText:s=>output+=s});
device.env.RawDeviceChk=addr=>{
  const packed=new Uint8Array(device.state.mem.buffer,Number(addr),38400);
  // Repack observed device pixels and compare with the independently checked
  // native raw-screen cache, including unchanged regions after each glyph.
  const observed=new Uint8Array(38400);
  for(let i=0;i<screen.indices.length;i++){
    assert(screen.indices[i]===0 || screen.indices[i]===15);
    if(screen.indices[i])observed[Math.floor(i/8)]+=2**(7-i%8);
  }
  assert.deepEqual(observed,packed);checks++;
};
const module=new WebAssembly.Module(result.bytes),instance=new WebAssembly.Instance(module,{env:device.env});
device.attach(instance);instance.exports.__main();
assert.equal(output,native.output);assert.equal(checks,64);
console.log('Packed graphics: literal pixel patterns, clipped/partial writes, rejected ranges, memory growth and 64 native raw-screen states pass.');

output='';
const fontResult=compileHolyC(font.source,{lenient:false});assert.deepEqual(fontResult.warnings,[]);
const fontHost=createHost({gfx:new Framebuffer(null),ansi:false,onText:s=>output+=s});
const fontInstance=new WebAssembly.Instance(new WebAssembly.Module(fontResult.bytes),{env:fontHost.env});fontHost.attach(fontInstance);fontInstance.exports.__main();
assert.equal(output,font.output);
const missing=compileHolyC("RawPutChar('F');",{lenient:false});
assert.throws(()=>new WebAssembly.Instance(new WebAssembly.Module(missing.bytes),{env:createHost().env}),WebAssembly.LinkError);
console.log(font.output.trim(),'both native fonts, public initialization and missing graphics-device refusal pass.');
