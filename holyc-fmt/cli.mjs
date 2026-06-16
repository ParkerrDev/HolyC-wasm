#!/usr/bin/env node
// cli.mjs — run the REAL HolyCFmt.HC formatter on a file, faithfully.
//
// The file bytes are written straight into the compiled program's WASM linear memory
// (at a high fixed address, above the heap) and the HolyC reads them from there — so,
// unlike feeding source through a string literal, DolDoc "$$" is never touched.
//
//   node cli.mjs path/to/File.HC            # print formatted source
//   node cli.mjs path/to/File.HC -w         # rewrite the file in place
//   node cli.mjs path/to/File.HC --tabs     # indent with tabs instead of 2 spaces
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileHolyC } from "../src/compiler.js";
import { createHost } from "../src/runtime/host.js";

const DIR = dirname(fileURLToPath(import.meta.url));
const CORE = readFileSync(join(DIR, "HolyCFmt.HC"), "latin1");
const INP = 28 * 1024 * 1024;   // 28 MiB: above the heap (16 MiB), below initial mem (32 MiB)

export async function formatSource(source, { tabs = false, indent = 2 } = {}) {
  const cfg = `g_use_tabs=${tabs ? "TRUE" : "FALSE"};\ng_indent_w=${indent};\n`;
  const prog = CORE + `\n${cfg}U8 *__inp=${INP};\nHolyCFmtPrint(__inp);\n`;
  const { bytes } = compileHolyC(prog, { filename: "HolyCFmt.HC", lenient: true, resilient: true });
  let out = "";
  const host = createHost({ onText: (s) => { out += s; }, ansi: false });
  const inst = await WebAssembly.instantiate(await WebAssembly.compile(bytes), { env: host.env });
  host.attach?.(inst);
  const mem = new Uint8Array(inst.exports.memory.buffer);
  if (INP + source.length + 1 > mem.length) throw new Error("file too large for this CLI");
  for (let i = 0; i < source.length; i++) mem[INP + i] = source.charCodeAt(i) & 0xff;
  mem[INP + source.length] = 0;
  inst.exports.__main();
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("-"));
  if (!file) { console.error("usage: node cli.mjs FILE.HC [-w] [--tabs]"); process.exit(2); }
  const opts = { tabs: args.includes("--tabs") };
  const src = readFileSync(file, "latin1");
  if (src.includes("\0")) { console.error("refusing: " + file + " has embedded binary (DolDoc) — edit it in TempleOS's Ed"); process.exit(1); }
  const out = await formatSource(src, opts);
  if (args.includes("-w")) { writeFileSync(file, out, "latin1"); console.error("formatted " + file); }
  else process.stdout.write(out);
}
