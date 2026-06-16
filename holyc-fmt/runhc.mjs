// runhc.mjs — compile a HolyC source string with holyc-wasm and run __main headless,
// returning everything it printed. Used to test HolyCFmt.HC end-to-end.
import { compileHolyC } from "../src/compiler.js";
import { createHost } from "../src/runtime/host.js";

export async function runHolyC(source, { filename = "prog.HC" } = {}) {
  const { bytes, warnings } = compileHolyC(source, { filename, lenient: true, resilient: true });
  let out = "";
  const host = createHost({ onText: (s) => { out += s; }, ansi: false });
  const mod = await WebAssembly.compile(bytes);
  const inst = await WebAssembly.instantiate(mod, { env: host.env });
  host.attach?.(inst);
  inst.exports.__main();
  return { out, warnings };
}

// CLI: node runhc.mjs file.HC
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import("node:fs");
  const f = process.argv[2];
  const { out, warnings } = await runHolyC(fs.readFileSync(f, "latin1"), { filename: f });
  if (warnings?.length) console.error("warnings:", warnings.length);
  process.stdout.write(out);
}
