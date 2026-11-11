import {readFileSync,writeFileSync} from "node:fs";
import {QemuRun} from "./oracle/Qemu.mjs";
import {SCALE_BYTES} from "../src/float-scale.js";
import {Hash,manifest} from "./oracle/Prepare.mjs";

const source=readFileSync(new URL("oracle/Pow10.HC",import.meta.url));
const result=await QemuRun([source]),native=result.results[0];
if (native.except) throw new Error(JSON.stringify(native));
const words=native.out.trim().split("\n");
if (words.length!==617 || words.some(word=>!/^[0-9A-F]{16}$/.test(word)))
  throw new Error("Incomplete native power-of-ten table");
const bytes=Buffer.alloc(words.length*8);
words.forEach((word,index)=>bytes.writeBigUInt64LE(BigInt("0x"+word),index*8));
const base64=bytes.toString("base64");
if (process.argv.includes("--record")) {
  writeFileSync(new URL("../src/float-scale.js",import.meta.url),
    '//V5.03 Pow10I64(-308..308), reproduced by tests/oracle-scale.mjs.\n'+
    `export const SCALE_BYTES="${base64}";\n`);
  writeFileSync(new URL("oracle/Pow10.native.json",import.meta.url),
    JSON.stringify({manifest,backend:result.backend,sourceSha256:Hash(source),
      tableSha256:Hash(bytes)},null,2)+"\n");
} else if (base64!==SCALE_BYTES) throw new Error("Native power-of-ten table differs");
console.log(`617 native floating scales match (${result.backend.accelerator}).`);
