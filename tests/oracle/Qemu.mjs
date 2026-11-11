import {readFileSync} from "node:fs";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Prepare} from "./Prepare.mjs";

export async function QemuRun(sources,options={})
{
  const cache=await Prepare(),files=[],names=new Set();
  const put=(name,bytes)=>{
    if (!/^[A-Z0-9_]{1,8}(?:\.[A-Z0-9_]{1,3})?$/.test(name))
      throw new Error("Expected an uppercase 8.3 oracle file name: "+name);
    if (names.has(name)) throw new Error("Duplicate oracle file: "+name);
    names.add(name);
    files.push({name,bytes:Buffer.from(bytes).toString("base64")});
  };
  put("CAPTURE.HC",readFileSync(new URL("QemuCapture.HC",import.meta.url)));
  let run="";
  sources.forEach((source,index)=>{
    const name=index.toString().padStart(4,"0");
    put(`F${name}.HC`,source);
    put(`W${name}.HC`,`#define ORACLE_NUM ${index}\n`+
      `#define ORACLE_FILE "C:/ORACLE/F${name}.HC"\n`+
      '#include "C:/ORACLE/CAPTURE.HC"\n');
    run+=`PopUp("#include \\"C:/ORACLE/W${name}.HC\\";",Fs);\n`;
  });
  run+="OutU8(0xE9,4);\n";
  put("RUN.HC",run);
  for (const file of options.files||[]) put(file.name,file.bytes);
  const config={cache,files,count:sources.length};
  if (options.timeout!==undefined) config.timeout=options.timeout;
  if (process.env.ORACLE_ACCEL) config.accelerator=process.env.ORACLE_ACCEL;
  return new Promise((resolve,reject)=>{
    const proc=spawn("python3",[fileURLToPath(new URL("Qemu.py",import.meta.url))],
      {stdio:["pipe","pipe","pipe"]});
    let out="",errors="";
    proc.stdout.on("data",bytes=>out+=bytes);
    proc.stderr.on("data",bytes=>errors=(errors+bytes).slice(-8192));
    proc.on("error",reject);
    proc.on("exit",code=>{
      if (code) reject(new Error(errors.trim().split("\n").at(-1) ||
        `QEMU oracle exited ${code}`));
      else {
        try {resolve(JSON.parse(out));} catch (error) {reject(error);}
      }
    });
    proc.stdin.end(JSON.stringify(config));
  });
}
