import {readFileSync,writeFileSync,readdirSync,existsSync} from "node:fs";
import {basename} from "node:path";
import {GuestNew} from "./oracle/Guest.mjs";
import {QemuRun} from "./oracle/Qemu.mjs";
import {Hash,manifest} from "./oracle/Prepare.mjs";

const args=process.argv.slice(2);
const record=args.includes("--record"),check=args.includes("--check");
const hemu=args.includes("--engine=hemu");
const files=args.filter(a=>!a.startsWith("--"));
if (args.some(a=>a.startsWith("--") &&
    !["--record","--check","--engine=qemu","--engine=hemu"].includes(a)) || record && check)
  throw new Error("usage: node tests/oracle.mjs [--check | --record] [--engine=qemu|hemu] [FILE.HC...]");
if (!files.length) {
  const dir=new URL("./v503/",import.meta.url);
  files.push(...readdirSync(dir).filter(n=>n.endsWith(".HC")).sort()
    .map(n=>new URL(n,dir).pathname));
}
const sources=files.map(file=>readFileSync(file));
let results,backend;
if (hemu) {
  const oracle=await GuestNew();
  results=[];
  for (const source of sources) results.push(await oracle(source));
  backend={engine:"hemu",engineSha256:manifest.engineSha256};
} else {
  const result=await QemuRun(sources);
  ({results,backend}=result);
  console.log(`Native oracle: ${backend.version} (${backend.accelerator})`);
  console.log(`Evidence: ${result.evidence}`);
}
let failed=0;
for (let index=0;index<files.length;index++) {
  const file=files[index],bytes=sources[index],stem=file.replace(/\.HC$/i,"");
  const result=results[index];
  if (check) {
    const expectedError=existsSync(stem+".err");
    const pass=expectedError ? result.except==="Compiler" :
      !result.except && result.out===readFileSync(stem+".out","latin1");
    console.log(`${pass?"ok":"FAIL"} V5.03 ${basename(file)}`);
    if (!pass) {failed++;console.log(JSON.stringify(result));}
  } else {
    console.log(`== ${basename(file)}\n${result.out}`+
      (result.except?`[except ${result.except}]`:""));
    if (record) {
      if (!result.except) writeFileSync(stem+".out",result.out,"latin1");
      writeFileSync(stem+".native.json",JSON.stringify({manifest,backend,
        sourceSha256:Hash(bytes),outputSha256:Hash(Buffer.from(result.out,"latin1")),
        except:result.except},null,2)+"\n");
    }
  }
}
process.exitCode=failed?1:0;
