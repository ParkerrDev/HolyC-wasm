// _sweep.mjs — run the real HolyC formatter over many TempleOS files; assert it is
// idempotent and token-preserving (only whitespace/layout changes).
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { runHolyC } from "./runhc.mjs";
const CORE = readFileSync("./HolyCFmt.HC", "latin1");
const Q = String.fromCharCode(34);
const esc = s => { let r = ""; for (const c of s) { if (c === "\\") r += "\\\\"; else if (c === Q) r += "\\" + Q; else if (c === "\n") r += "\\n"; else if (c === "\t") r += "\\t"; else if (c === "\r") continue; else r += c; } return r; };
const dn = s => s.replace(/[ \t]+/g, "").replace(/\n+/g, "\n").trim();
const dnO = s => dn(s.replace(/\$\$/g, "$"));
const fmt = async (s) => (await runHolyC(CORE + `\nU8 *__inp="${esc(s)}";\nHolyCFmtPrint(__inp);\n`, { filename: "HolyCFmt.HC" })).out;

const TOS = "/home/aphunt/Dev/Projects/TempleOS-wasm/reference/TempleOS";
const all = execSync(`find ${TOS} -iname '*.HC'`).toString().trim().split("\n");
// spread across the tree, cap size (string-literal path), take a sample
const N = +(process.argv[2] || 60);
// skip DolDoc files with embedded BINARY (sprites etc.) — a NUL byte means it is not
// plain-text HolyC; those are edited in TempleOS's DolDoc editor, out of scope here.
const pick = all.filter(f => { try { const b = readFileSync(f); return b.length < 14000 && !b.includes(0); } catch { return false; } });
const step = Math.max(1, (pick.length / N) | 0);
const files = pick.filter((_, i) => i % step === 0).slice(0, N);

let ok = 0, idemBad = 0, tokBad = 0, err = 0;
for (const f of files) {
  const rel = f.slice(TOS.length + 1);
  let orig;
  try { orig = readFileSync(f, "latin1"); } catch { continue; }
  try {
    const once = await fmt(orig);
    const twice = await fmt(once);
    let bad = false;
    // whitespace-preserving idempotency, tolerant of the harness's DolDoc "$$"->"$" re-encoding
    const c$ = s => s.replace(/\$\$/g, "$");
    if (c$(once) !== c$(twice)) { idemBad++; bad = true; console.log("IDEM ✗", rel); }
    if (dn(once) !== dnO(orig)) {
      tokBad++; bad = true;
      const a = dn(once), b = dnO(orig); let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
      console.log("TOK  ✗", rel, "@", i, "\n   fmt:", JSON.stringify(a.slice(Math.max(0, i - 30), i + 30)), "\n   org:", JSON.stringify(b.slice(Math.max(0, i - 30), i + 30)));
    }
    if (!bad) ok++;
  } catch (e) { err++; console.log("ERR  ", rel, String(e.message).slice(0, 80)); }
}
console.log(`\n${files.length} files: ${ok} clean, ${idemBad} idem-fail, ${tokBad} token-fail, ${err} error`);
