import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,readFileSync,writeFileSync,mkdirSync,renameSync,
  createReadStream,createWriteStream} from "node:fs";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {pipeline} from "node:stream/promises";
import {createGunzip} from "node:zlib";

export const manifest=JSON.parse(readFileSync(new URL("Manifest.json",import.meta.url)));
export const cache=fileURLToPath(new URL("../.oracle/",import.meta.url));

export function Hash(bytes)
{
  return createHash("sha256").update(bytes).digest("hex");
}

function Repo(env,name,file)
{
  const paths=[process.env[env],resolve(cache,"../../../",name),
    resolve(cache,"../../../../",name)];
  const path=paths.find(p=>p && existsSync(join(p,file)));
  if (!path) throw new Error(`Set ${env} to the ${name} checkout (${file} is needed).`);
  return path;
}

function Archive(repo,rev,part,dst)
{
  mkdirSync(dst,{recursive:true});
  const bytes=execFileSync("git",["-C",repo,"archive",rev,part],
    {maxBuffer:32*1024*1024});
  execFileSync("tar",["-xf","-","-C",dst],{input:bytes});
}

function Verify(file,hash)
{
  if (Hash(readFileSync(file))!==hash)
    throw new Error(`Oracle input differs from Manifest.json: ${file}`);
}

async function Expand(src,dst)
{
  await pipeline(createReadStream(src),createGunzip(),createWriteStream(dst+".tmp"));
  renameSync(dst+".tmp",dst);
}

export async function Prepare()
{//Freeze the oracle independently of the compiler under test.
  const key=Hash(Buffer.from(JSON.stringify(manifest)));
  const marker=join(cache,"ready");
  const engine=join(cache,"web/build/hemu.wasm");
  if (existsSync(marker) && readFileSync(marker,"utf8")===key &&
      existsSync(engine) && existsSync(join(cache,"live.bin")) &&
      existsSync(join(cache,"templeos.raw"))) {
    Verify(engine,manifest.engineSha256);
    Verify(join(cache,"live.bin"),manifest.rawSnapshotSha256);
    Verify(join(cache,"templeos.raw"),manifest.rawDiskSha256);
    return cache;
  }
  const web=Repo("TEMPLEOS_WEB","TempleOS-Web","engine/compile.js");
  const hemu=Repo("HEMU_REPO","HEMU","live.bin.gz");
  const compiler=Repo("HOLYC_ORACLE_COMPILER","HolyC-wasm","src/compiler.js");
  const snapshot=join(hemu,"live.bin.gz");
  const disk=join(web,"vendor/images/templeos-hd.qcow2.gz");
  Verify(snapshot,manifest.snapshotSha256);
  Verify(disk,manifest.diskSha256);
  mkdirSync(cache,{recursive:true});
  writeFileSync(join(cache,"package.json"),'{"type":"module"}\n');
  Archive(web,manifest.web,"engine",join(cache,"web"));
  Archive(compiler,manifest.compiler,"src",join(cache,"web/holyc-wasm"));
  Archive(hemu,manifest.hemu,"src",join(cache,"web/hemu"));
  const env={...process.env};
  delete env.HEMU_SRC;
  delete env.SITE;
  execFileSync(process.execPath,["engine/build.mjs"],
    {cwd:join(cache,"web"),env,stdio:"inherit"});
  Verify(engine,manifest.engineSha256);
  await Expand(snapshot,join(cache,"live.bin"));
  await Expand(disk,join(cache,"templeos.qcow2"));
  execFileSync("qemu-img",["convert","-O","raw",join(cache,"templeos.qcow2"),
    join(cache,"templeos.raw.tmp")]);
  renameSync(join(cache,"templeos.raw.tmp"),join(cache,"templeos.raw"));
  Verify(join(cache,"live.bin"),manifest.rawSnapshotSha256);
  Verify(join(cache,"templeos.raw"),manifest.rawDiskSha256);
  writeFileSync(marker,key);
  return cache;
}
