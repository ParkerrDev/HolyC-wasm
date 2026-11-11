// Compiles and runs each program in tests/v503 and compares what it prints
// with NAME.out, the output TempleOS V5.03 gave for the same file. A program
// with NAME.err must fail to compile, with that text in the message.
//   node tests/run.mjs [NAME...]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { createHash } from "node:crypto";
import { compileHolyC } from "../src/compiler.js";
import { createHost } from "../src/runtime/host.js";
import {createTaskHost} from "../src/runtime/tasks.js";

if (!isMainThread) {
  let out = "";
  const module=new WebAssembly.Module(workerData);
  const tasks=WebAssembly.Module.imports(module).some(entry=>entry.name==='__task_require');
  const host = (tasks?createTaskHost:createHost)({ ansi: false, onText: (s) => { out += s; } });
  const instance = new WebAssembly.Instance(module,{ env: host.env });
  host.attach(instance);
  try {
    if(tasks) await host.run();else instance.exports.__main();
  } catch (e) { out += `[trap ${e.message}]\n`; }
  if(tasks) await host.dispose();
  parentPort.postMessage(out);
  process.exit(0);
}

const DIR = new URL("./v503/", import.meta.url).pathname;
const want = new Set(process.argv.slice(2));
const names = readdirSync(DIR).filter((f) => f.endsWith(".HC")).map((f) => f.slice(0, -3))
  .filter((n) => !want.size || want.has(n)).sort();
for (const name of want)
  if (!names.includes(name)) throw new Error("Unknown test: " + name);
if (!names.length) throw new Error("No compiler tests found");

// Runs the program in a worker, so one that never ends fails after 10 s.
function run(bytes) {
  return new Promise((done) => {
    const w = new Worker(new URL(import.meta.url), { workerData: bytes });
    const t = setTimeout(() => { w.terminate(); done("[timeout]\n"); }, 10000);
    w.on("message", (out) => { clearTimeout(t); done(out); });
    w.on("error", (e) => { clearTimeout(t); done(`[error ${e.message}]\n`); });
  });
}

function compile(name) {
  const src = readFileSync(DIR + name + ".HC", "latin1");
  return compileHolyC(src, { filename: name + ".HC", lenient: false });
}

async function check(name) {
  const evidenceFile = DIR + name + ".native.json";
  if (!existsSync(evidenceFile)) return "missing native oracle evidence";
  const evidence = JSON.parse(readFileSync(evidenceFile));
  const hash = bytes => createHash("sha256").update(bytes).digest("hex");
  if (evidence.backend?.engine !== "qemu") return "expected independent QEMU oracle evidence";
  if (hash(readFileSync(DIR + name + ".HC")) !== evidence.sourceSha256)
    return "source changed since native oracle recording";
  const errFile = DIR + name + ".err";
  if (existsSync(errFile)) {
    if (evidence.except !== "Compiler") return "native compiler did not reject this fixture";
    const msg = readFileSync(errFile, "latin1").trim();
    try { compile(name); } catch (e) {
      return String(e.message).includes(msg) ? null : `wrong error: ${e.message}`;
    }
    return `compiled, expected error: ${msg}`;
  }
  if (evidence.except || hash(readFileSync(DIR + name + ".out")) !== evidence.outputSha256)
    return "expected output changed since native oracle recording";
  let r;
  try { r = compile(name); } catch (e) { return `compile error: ${e.message}`; }
  const got = await run(r.bytes);
  const exp = readFileSync(DIR + name + ".out", "latin1");
  if (got === exp) return null;
  const g = got.split("\n"), x = exp.split("\n");
  let i = 0;
  while (i < g.length && g[i] === x[i]) i++;
  return `line ${i + 1}: got ${JSON.stringify(g[i])}, V5.03 ${JSON.stringify(x[i])}`;
}

let failed = 0;
for (const n of names) {
  const why = await check(n);
  if (why) failed++;
  console.log(`${why ? "FAIL" : "ok  "} ${n}${why ? ": " + why : ""}`);
}
console.log(`${names.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
