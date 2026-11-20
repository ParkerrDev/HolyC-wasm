// Runs tests/source-file/MAIN.HC in V5.03 with its two companion files and,
// with --record, keeps what it printed as the evidence source-file.mjs checks.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {QemuRun} from './oracle/Qemu.mjs';
import {Hash,manifest} from './oracle/Prepare.mjs';
const args=process.argv.slice(2),record=args.includes('--record');
if(args.some(arg=>arg!=='--record'))throw new Error('Use --record to update native evidence.');
const dir=new URL('source-file/',import.meta.url),read=name=>readFileSync(new URL(name,dir));
const main=read('MAIN.HC'),files=['INC.HC','LINKED.HC'].map(name=>({name,bytes:read(name)}));
const native=await QemuRun([main],{files});
const [result]=native.results;
assert.equal(result.except,'');
if(record) {
  writeFileSync(new URL('MAIN.out',dir),result.out,'latin1');
  writeFileSync(new URL('MAIN.native.json',dir),JSON.stringify({manifest,backend:native.backend,
    sources:Object.fromEntries([['MAIN.HC',Hash(main)],...files.map(f=>[f.name,Hash(f.bytes)])]),
    outputSha256:Hash(Buffer.from(result.out,'latin1'))},null,2)+'\n');
} else assert.equal(result.out,read('MAIN.out').toString('latin1'));
console.log(result.out.trim());
