import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {QemuRun} from './oracle/Qemu.mjs';
import {Hash,manifest} from './oracle/Prepare.mjs';

const source=readFileSync(new URL('TaskSettings.HC',import.meta.url)),
  run=Buffer.concat([source,Buffer.from('\n"Settings:%d\\n",SettingsTest;\n')]),
  native=await QemuRun([run],{timeout:90}),result=native.results[0],
  record={manifest,backend:native.backend,evidence:native.evidence,
    sourceSha256:Hash(source),runSha256:Hash(run),
    runnerSha256:Hash(readFileSync(new URL('oracle/Qemu.mjs',import.meta.url))),
    captureSha256:Hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url))),
    ...result,outputSha256:Hash(Buffer.from(result.out,'latin1'))};
assert.equal(result.except,'');assert(result.out.endsWith('Settings:1\n'));
if (process.argv.includes('--record'))
  writeFileSync(new URL('TaskSettings.native.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
else {
  const saved=JSON.parse(readFileSync(new URL('TaskSettings.native.json',import.meta.url)));
  assert.equal(record.sourceSha256,saved.sourceSha256);assert.equal(result.out,saved.out);
}
console.log(result.out.trim());
