import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
const read=(name,encoding='utf8')=>readFile(new URL('probes/'+name,import.meta.url),encoding);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=await read('FontAddress.HC',null),expected=await read('FontAddress.out');
const evidence=JSON.parse(await read('FontAddress.native.json'));
assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
assert.equal(hash(source),evidence.sourceSha256);assert.equal(hash(Buffer.from(expected)),evidence.outputSha256);
const result=compileHolyC(source,{lenient:false});
assert.deepEqual(result.warnings,[]);assert.deepEqual(result.requiredCapabilities,[]);
let output='';const host=createHost({onText:s=>output+=s,ansi:false});
const module=new WebAssembly.Module(result.bytes),instance=new WebAssembly.Instance(module,{env:host.env});
host.attach(instance);instance.exports.__main();assert.equal(output,expected);
const imports=WebAssembly.Module.imports(module).map(x=>x.name);
const consoleOnly=compileHolyC('"ok\\n";',{lenient:false});
assert.deepEqual(imports,WebAssembly.Module.imports(new WebAssembly.Module(consoleOnly.bytes)).map(x=>x.name),
  'Reading font data must not add device or scheduler imports to ordinary console output.');

const rejections=JSON.parse(await read('FontAddressReject.native.json'));
assert.equal(rejections.backend.engine,'qemu');
for(const probe of rejections.cases){
  assert.equal(probe.except,'Compiler');
  assert.equal(hash(Buffer.from(probe.source)),probe.sourceSha256);
  assert.equal(hash(Buffer.from(probe.out)),probe.outputSha256);
  const diagnostic=probe.name==='sizeof'?/Size not defined/:
    probe.name.endsWith('index')?/Not array or ptr/:/Invalid lval|not an lvalue/;
  assert.throws(()=>compileHolyC(probe.source,{lenient:false}),diagnostic,probe.name);
}
// The host receives an address value, explicitly distinguished from a mutable
// global cell. Reading the glyph via a postfix cast must preserve that value.
const plain=compileHolyC('U64 Glyph(){return sys_font_std(U64 *)[\'A\'];}',
  {lenient:false,exports:['Glyph']});
assert.equal(plain.globals.get('sys_font_std').kind,'exportedAddress');
const fontHost=createHost(),fontInst=new WebAssembly.Instance(new WebAssembly.Module(plain.bytes),{env:fontHost.env});
fontHost.attach(fontInst);fontInst.exports.__main();
assert.equal(fontInst.exports.Glyph(),0x006666667E66663Cn);
console.log('Font addresses: native byte/cast/address arithmetic, both complete fonts, declaration/local/default binding and seven native compiler rejections pass.');
