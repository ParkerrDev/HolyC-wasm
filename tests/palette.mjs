import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {Framebuffer} from '../src/runtime/graphics.js';
function nativeFixture(name) {
  const source=readFileSync(new URL('probes/'+name+'.HC',import.meta.url),'latin1');
  const output=readFileSync(new URL('probes/'+name+'.out',import.meta.url),'latin1');
  const evidence=JSON.parse(readFileSync(new URL('probes/'+name+'.native.json',import.meta.url)));
  const hash=value=>createHash('sha256').update(value,'latin1').digest('hex');
  assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
  assert.equal(hash(source),evidence.sourceSha256);assert.equal(hash(output),evidence.outputSha256);
  return {source,output};
}
const {source:test,output:expected}=nativeFixture('Palette');
const pixels=nativeFixture('PaletteScreen').output.trim().slice('PalettePixels:'.length);
assert.match(pixels,/^[0-9A-F]{256}$/);
const result=compileHolyC(test,{lenient:false,exports:['GrPaletteColorGet','GrPaletteColorSet']});
assert.deepEqual(result.warnings,[]);
let output='';
const module=new WebAssembly.Module(result.bytes),absent=createHost({ansi:false,onText:()=>{}});
assert.throws(()=>new WebAssembly.Instance(module,{env:absent.env}),WebAssembly.LinkError);
let shown;
const context={createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4),width,height}),putImageData:image=>{shown=Array.from(image.data);}};
const palette=new Uint32Array(new SharedArrayBuffer(256*4));
const fb=new Framebuffer(context,256,1,1,null,palette);
const host=createHost({ansi:false,onText:text=>output+=text,gfx:{palette:(index,bgr)=>fb.palette(index,bgr)}});
const instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);instance.exports.__main();
for(let i=0;i<256;i++){
 const r=i*257,g=(255-i)*257,b=(i*173+61)&65535;
 const input=(BigInt(r)<<32n)|(BigInt(g)<<16n)|BigInt(b);
 instance.exports.GrPaletteColorSet(BigInt(i-256),input);
 const component=value=>Math.floor(65535*(value>>>10)/63)>>>8;
 const expected=(0xff000000|component(r)|(component(g)<<8)|(component(b)<<16))>>>0;
 assert.equal(palette[i],expected,'quantized BGR reaches the shared display palette');
 fb.indices[i]=i;
}
fb.present();
for(let i=0;i<256;i++) {
 const color=palette[parseInt(pixels[i],16)];
 assert.deepEqual(shown.slice(i*4,i*4+4),[color&255,(color>>>8)&255,(color>>>16)&255,255]);
}
assert.equal(output,expected);
console.log(output.trim(),'native DAC get/set, all 256 shared entries, original low-nibble screen conversion and missing-device rejection pass');
