import assert from "node:assert/strict";
import { compileHolyC } from "./compiler.js";
import { createHost } from "./runtime/host.js";
// A program states its host contract with `import` prototypes (the way HEMU/src/host.HC does).
const src = `import I64 __probe(I64 a, F64 b);\nimport U0 __note(U8 *s);\nI64 Go(I64 x) { __note("hi"); return __probe(x, 2.5); }`;
{ // strict: they are real WASM imports from "env" - the host must supply them, and a missing one fails to link
  const r = compileHolyC(src, { lenient: false, exports: ["Go"] });
  assert.equal(r.warnings.length, 0);
  assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(r.bytes)).filter(i => /^__(probe|note)$/.test(i.name)).map(i => i.module + "." + i.name), ["env.__probe", "env.__note"]);
  const seen = [], host = createHost();
  const { instance } = await WebAssembly.instantiate(r.bytes, { env: { ...host.env, __probe: (a, b) => { seen.push(["probe", a, b]); return a * 2n; }, __note: (p) => { seen.push(["note", typeof p]); } } });
  host.attach(instance); instance.exports.__rt_init();
  assert.equal(instance.exports.Go(21n), 42n);
  assert.deepEqual(seen, [["note", "bigint"], ["probe", 21n, 2.5]]);
  await assert.rejects(WebAssembly.instantiate(r.bytes, { env: host.env }), /__probe|__note|import/i);
}
{ // lenient (editor, formatter): unchanged - stubbed with a warning and links against the plain runtime
  const r = compileHolyC(src, { lenient: true, exports: ["Go"] });
  assert.ok(r.warnings.some(w => /'__probe' has no body; stubbed/.test(w)), r.warnings);
  assert.equal(WebAssembly.Module.imports(new WebAssembly.Module(r.bytes)).filter(i => /^__(probe|note)$/.test(i.name)).length, 0);
  const host = createHost(); const { instance } = await WebAssembly.instantiate(r.bytes, { env: host.env }); host.attach(instance); instance.exports.__rt_init();
  assert.equal(instance.exports.Go(21n), 0n);
}
console.log("Source-declared imports: strict mode links `import` prototypes to env; lenient mode still stubs them.");
