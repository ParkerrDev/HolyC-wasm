import {HemuPath} from "./Paths.js";
import {readFileSync,writeFileSync,mkdirSync,realpathSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {compileHolyC} from "../../../src/compiler.js";

export function DiskCompile() {
  return compileHolyC(readFileSync(HemuPath("Kernel/DiskHost.HC"),"latin1"),{
    filename:"DiskHost.HC",lenient:false,includeResolver:name=>name==="Disk"?
      readFileSync(HemuPath("Kernel/Disk.HC"),"latin1"):null,exports:["DskInfo","DskOffset","DskTmp","DskTmpDel","FatLst","FatRead","FatWrite"]});
}

export function DiskBuild(out) {
  const compiled=DiskCompile();
  if(compiled.warnings.length)throw Error(compiled.warnings.join("\n"));
  mkdirSync(out,{recursive:true});writeFileSync(resolve(out,"disk.wasm"),compiled.bytes);
  console.log(`disk.wasm: ${compiled.bytes.length} bytes`);
}

if(process.argv[1]&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url))
  DiskBuild(resolve(process.argv[2]||"build"));
