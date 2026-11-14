import assert from "node:assert/strict";
import {appendFileSync,cpSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,dirname} from "node:path";
import {pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";

const root=new URL("../",import.meta.url),temp=mkdtempSync(join(tmpdir(),"holyc-source-"));
try {
  for (const path of ["Kernel","Compiler","Adam","Misc/RuntimeMk.mjs",
    "src/runtime/font.js","src/float-scale.js","src/runtime-source.js"]) {
    mkdirSync(dirname(join(temp,path)),{recursive:true});
    cpSync(new URL(path,root),join(temp,path),{recursive:true});
  }
  writeFileSync(join(temp,"package.json"),'{"type":"module"}');
  const run=(...args)=>spawnSync(process.execPath,[join(temp,"Misc/RuntimeMk.mjs"),...args],
    {encoding:"utf8"});
  let result=run("--check");
  assert.equal(result.status,0,result.stderr);
  const addition='\n// Source transport: ` ${untouched} \\n π ì\n';
  appendFileSync(join(temp,"Kernel/RuntimeC.HC"),addition);
  result=run("--check");
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Runtime source is stale/);
  result=run();
  assert.equal(result.status,0,result.stderr);
  result=run("--check");
  assert.equal(result.status,0,result.stderr);
  const source=await import(pathToFileURL(join(temp,"src/runtime-source.js")));
  assert.ok(source.RUNTIME_TAIL_SRC.endsWith(addition));
  appendFileSync(join(temp,"Kernel/Str.HC"),"/*POW10_I64*/");
  result=run();
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/expected exactly one table insertion/);
} finally {
  rmSync(temp,{recursive:true,force:true});
}
console.log("Runtime source: stale build rejection, regeneration, text transport and unique tables pass.");
