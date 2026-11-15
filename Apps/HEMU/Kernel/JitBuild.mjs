import {HemuPath} from "./Paths.js";
import {readFileSync,writeFileSync} from "node:fs";
import {compileHolyC} from "../../../src/compiler.js";

const root=HemuPath("Kernel/"),source=readFileSync(new URL("JitCore.HC",root),"utf8"),
  result=compileHolyC(source,{filename:"JitCore.HC",noPrelude:true,lenient:false,defines:{TRUE:"1",FALSE:"0"},
    exports:["JitConfig","JitInput","JitOutput","JitBuild","JitDispatch"],includeResolver:function (path) {
      return readFileSync(new URL(path.includes(".")?path:path+".HC",root),"utf8");
    }}),
  output=new URL("JitCore.wasm",import.meta.url);
if (result.warnings.length) throw Error(result.warnings.join("\n"));
if (process.argv.includes("--check")) {
  if (!readFileSync(output).equals(Buffer.from(result.bytes))) throw Error("Rebuild HolyC JIT with node holyc-wasm/Apps/HEMU/Kernel/JitBuild.mjs");
} else writeFileSync(output,result.bytes);
console.log("HolyC JIT: "+result.bytes.length+" bytes");
