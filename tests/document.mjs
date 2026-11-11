import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compileHolyC} from "../src/compiler.js";
import {createHost} from "../src/runtime/host.js";

async function Run(source)
{
  let out="";
  const host=createHost({ansi:false,onText:text=>out+=text});
  const {bytes}=compileHolyC(source,{lenient:false});
  const {instance}=await WebAssembly.instantiate(bytes,{env:host.env});
  host.attach(instance);
  instance.exports.__main();
  return out;
}

for (const name of ["DolDoc","Encoding","Controls"]) {
  const bytes=readFileSync(new URL(`v503/${name}.HC`,import.meta.url));
  const expected=readFileSync(new URL(`v503/${name}.out`,import.meta.url),"latin1");
  assert.equal(await Run(bytes),expected,`${name}: byte input matches native output`);
  if (name==="DolDoc") {
    const base=compileHolyC(bytes,{lenient:false});
    const dead=Buffer.from('U8 *DeadLiteral(){return "'+ 'unused'.repeat(4096)+'";}\n');
    const added=compileHolyC(Buffer.concat([dead,bytes]),{lenient:false});
    assert.equal(added.dataEnd,base.dataEnd,'unused text cannot move binary literals');
    assert.deepEqual(added.bytes,base.bytes,'binary record addresses relocate without changing contents');
    assert.throws(()=>compileHolyC(bytes.subarray(0,bytes.length-1),{lenient:false}),
      /invalid DolDoc binary record/,"truncated sprite must not become a valid pointer");
    assert.throws(()=>compileHolyC(bytes.subarray(0,bytes.indexOf(0)),{lenient:false}),
      /DolDoc binary 1 is missing/,"text-only editor source must not lose its sprites silently");
  }
}
const unicode='"%d %d\\n",\'π\',\'Θ\';';
assert.equal(await Run(unicode),"227 233\n","Unicode Greek literals use CP437 bytes");
assert.throws(()=>compileHolyC('"😀";',{lenient:false}),/not in TempleOS CP437/);
console.log("DolDoc and CP437: native byte input, binary integrity and Unicode Greek passed.");
