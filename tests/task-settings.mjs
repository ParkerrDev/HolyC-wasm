import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {createHost} from '../src/runtime/host.js';
import {Hash} from './oracle/Prepare.mjs';
import {Framebuffer} from '../src/runtime/graphics.js';

const source=readFileSync(new URL('TaskSettings.HC',import.meta.url)),
  native=JSON.parse(readFileSync(new URL('TaskSettings.native.json',import.meta.url)));
assert.equal(Hash(source),native.sourceSha256);
assert.equal(Hash(Buffer.concat([source,Buffer.from('\n"Settings:%d\\n",SettingsTest;\n')])),native.runSha256);
assert.equal(Hash(readFileSync(new URL('oracle/Qemu.mjs',import.meta.url))),native.runnerSha256);
assert.equal(Hash(readFileSync(new URL('oracle/QemuCapture.HC',import.meta.url))),native.captureSha256);
assert.equal(Hash(Buffer.from(native.out,'latin1')),native.outputSha256);
assert.equal(native.backend.engine,'qemu');assert.equal(native.except,'');
assert(native.out.endsWith('Settings:1\n'));

const deadline=setTimeout(()=>{throw Error('Task settings did not settle');},20000);
try {
  for (const runtimeProfile of ['console','keydev']) {
    const plain=compileHolyC('I64 Add(I64 x) {return x+1;}',{exports:['Add'],runtimeProfile,lenient:false});
    assert.deepEqual(plain.requiredCapabilities,[],'Unused settings do not require a task scheduler');
    const plainHost=createHost(),plainInst=new WebAssembly.Instance(new WebAssembly.Module(plain.bytes),{env:plainHost.env});
    plainHost.attach(plainInst);assert.equal(plainInst.exports.Add(41n),42n);
    const result=compileHolyC(source.toString('latin1'),
      {exports:['SettingsTest'],runtimeProfile,lenient:false});
    assert.deepEqual(result.warnings,[]);
    const errors=[],gfx=new Framebuffer(null);
    let redFrame=false;
    gfx.flip=function () {if (gfx.indices.includes(4)) redFrame=true;};
    const host=createTaskHost({gfx,onText:()=>{},onTaskError:error=>{errors.push(error);host.stop();}}),
      inst=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
    host.attach(inst);
    let heap,allocations;
    for (let i=0;i<4;i++) {
      assert.equal(await host.run('SettingsTest'),1n,runtimeProfile);
      assert.deepEqual(errors,[]);
      assert(redFrame,'WinMgr presents the draw_it pixels');
      assert.deepEqual(host.state.tasks.map(task=>task.status),['dead']);
      if (allocations!==undefined) assert.equal(host.state.tasks[0].allocations,allocations);
      allocations=host.state.tasks[0].allocations;
      if (heap!==undefined) assert(host.state.heapPtr<=heap,'Repeated programs release settings, aliases and child tasks');
      heap??=host.state.heapPtr;
    }
    await host.dispose();
  }
} finally {clearTimeout(deadline);}
console.log('Task settings: both profiles restore windows, directories, callbacks and nested song/animation tasks; drawing and cleanup repeat without leaks.');
