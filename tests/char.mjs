import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const deadline=setTimeout(()=>{throw new Error('Character input checks did not settle');},15000);
const read=file=>readFileSync(new URL(file,import.meta.url),'latin1');
const source=read('probes/CharEcho.HC'),expected=read('probes/CharEcho.out');
const evidence=JSON.parse(read('probes/CharEcho.native.json'));
const sha=value=>createHash('sha256').update(value,'latin1').digest('hex');
assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
assert.equal(sha(source),evidence.sourceSha256);assert.equal(sha(expected),evidence.outputSha256);
const compiled=compileHolyC(source,{lenient:false});assert.deepEqual(compiled.warnings,[]);
assert.deepEqual(compiled.requiredCapabilities,['task-continuations']);
const module=new WebAssembly.Module(compiled.bytes);
assert(!WebAssembly.Module.imports(module).some(entry=>entry.name==='__get_char'));
let raw='',text='',instance;
const host=createTaskHost({ansi:false,onText:value=>text+=value});
const puts=host.env.__puts;
host.env.__puts=address=>{
  const bytes=new Uint8Array(instance.exports.memory.buffer);let at=Number(address);
  while(bytes[at]) raw+=String.fromCharCode(bytes[at++]);
  puts(address);
};
instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
await host.run();assert.equal(raw,expected,'native echo/prompt control sequences');
assert.equal(text,'A\n65\nPRESS A KEY\n98\n');await host.dispose();

// A task session never calls legacy blocking character callbacks.
for(const call of ['ScanChar','KeyGet']) {
  let called=0;
  const result=compileHolyC(`I64 TaskMode(){return GetKey;} ${call};`,{lenient:false,exports:['TaskMode']});
  const runtime=createTaskHost({scanChar:()=>{called++;return 1;},getChar:()=>{called++;return 1;}});
  runtime.attach(new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:runtime.env}));
  await assert.rejects(runtime.run(),/Legacy character adapters/);
  await assert.rejects(runtime.dispose(),/Legacy character adapters/);assert.equal(called,0);
}
// Note duration belongs to the scheduler, never to a blocking legacy note callback.
const sound=compileHolyC(`
I64 progressed=0;
U0 Other(U8 *) {Sleep(1);progressed=1;}
Spawn(&Other,,,,Fs);
__play_note(440.0,20);
if(!progressed) throw('Blocked');
`,{lenient:false});
const tones=[];
const audio=createTaskHost({snd:{tone:frequency=>tones.push(frequency),note:()=>{throw new Error('legacy blocking note called');}}});
audio.attach(new WebAssembly.Instance(new WebAssembly.Module(sound.bytes),{env:audio.env}));
await audio.run();assert.deepEqual(tones,[440,0]);await audio.dispose();
let blockedNoteCalls=0;
const noteOnly=createTaskHost({snd:{note:()=>blockedNoteCalls++}});
noteOnly.attach(new WebAssembly.Instance(new WebAssembly.Module(sound.bytes),{env:noteOnly.env}));
await assert.rejects(noteOnly.run(),/nonblocking tone adapter/);
await assert.rejects(noteOnly.dispose(),/nonblocking tone adapter/);
assert.equal(blockedNoteCalls,0);assert.equal(noteOnly.state.heapPtr,16777248);
clearTimeout(deadline);
console.log('Character input: native GetChar/PressAKey echo and return values match; task sessions reject legacy input and keep note waits cooperative.');
