import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const deadline=setTimeout(()=>{throw new Error('Break checks did not settle');},20000);
const read=file=>readFileSync(new URL(file,import.meta.url),'latin1');
const sha=value=>createHash('sha256').update(value,'latin1').digest('hex');
function native(name) {
  const source=read(name+'.HC'),output=read(name+'.out'),evidence=JSON.parse(read(name+'.native.json'));
  assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
  assert.equal(sha(source),evidence.sourceSha256);assert.equal(sha(output),evidence.outputSha256);
  return {source,output};
}
function load(source,options={},hostOptions={}) {
  const compiled=compileHolyC(source,{lenient:false,...options});assert.deepEqual(compiled.warnings,[]);
  const host=createTaskHost(hostOptions),instance=new WebAssembly.Instance(new WebAssembly.Module(compiled.bytes),{env:host.env});
  host.attach(instance);
  const get=name=>new DataView(instance.exports.memory.buffer).getBigInt64(compiled.globals.get(name).addr,true);
  return {host,fn:instance.exports,get};
}
const wait=async predicate=>{for(let i=0;!predicate();i++) {assert(i<5000,'interrupted task made no progress');await new Promise(resolve=>setTimeout(resolve,1));}};
for(const name of ['v503/Break','probes/BreakRequest']) {
  const fixture=native(name);let text='';
  // The native private CtrlAltC callback sets a scheduler flag. The host has
  // no IRQ scheduler, so enter its equivalent request boundary explicitly.
  const source=fixture.source.replace('extern U0 CtrlAltC(I64);','').replaceAll('CtrlAltC(0)','TaskHostBreak');
  const {host,fn}=load(source,{}, {ansi:false,onText:value=>text+=value});
  for(let i=0;i<10;i++) {
    text='';await host.run();assert.equal(text,fixture.output,name);
    assert.equal(fn.__sp.value,16777216n);assert.equal(host.state.heapPtr,16777248);
    assert.deepEqual(host.state.tasks.map(t=>[t.status,t.allocations]),[['dead',0]]);
  }
  await host.dispose();
}
// An actual rejected JSPI wait must enter the existing HolyC catch, release
// its owned allocation, and leave the same continuation able to wait again.
const repeated=load(`
I64 ready=0,caught=0;
U0 Run() {
  I64 i,j,canary[16];
  U8 *buf;
  for(i=0;i<100;i++) {
    for(j=0;j<16;j++) canary[j]=i*16+j;
    buf=MAlloc(37);
    try {ready=i+1;GetKey;}
    catch {
      Free(buf);Fs->catch_except=TRUE;
      if(Fs->except_ch!='Break') throw('Wrong');
      for(j=0;j<16;j++) if(canary[j]!=i*16+j) throw('Stack');
      caught++;
      Yield;
    }
  }
}
`,{exports:['Run']});
const running=repeated.host.run('Run');
for(let i=1;i<=100;i++) {
  await wait(()=>repeated.get('ready')===BigInt(i) && repeated.host.state.tasks[0].status==='waiting');
  assert(repeated.host.breakTask());
  await wait(()=>repeated.get('caught')===BigInt(i));
}
await running;assert.equal(repeated.fn.__sp.value,16777216n);
assert.equal(repeated.host.state.heapPtr,16777248);await repeated.host.dispose();

// Device requests cannot target dead/unknown tasks or inhibited focus.
const inhibited=load(`
I64 ready=0;
U0 Enable() {Btr(&Fs->win_inhibit,WIf_SELF_FOCUS);}
U0 Run() {
  Bts(&Fs->win_inhibit,WIf_SELF_FOCUS);ready=1;
  try {Sleep(100000);}
  catch {if(Fs->except_ch!='Break') throw('Wrong');Fs->catch_except=TRUE;}
}
`,{exports:['Run','Enable','TaskHostBreak']});
const sleeping=inhibited.host.run('Run');await wait(()=>inhibited.get('ready')===1n);
assert.equal(inhibited.host.breakTask(123n),false);assert.equal(inhibited.host.breakTask(),false);
inhibited.fn.Enable();assert(inhibited.host.breakTask());await sleeping;
assert.equal(inhibited.host.breakTask(),false);await inhibited.host.dispose();

// A request does not override an explicit task suspension.
const suspended=load(`
I64 ready=0,caught=0;
U0 Resume() {Suspend(Fs,FALSE);}
U0 Run() {
  Suspend(Fs);ready=1;
  try {Yield;}
  catch {caught=Fs->except_ch;Fs->catch_except=TRUE;}
}
`,{exports:['Run','Resume','TaskHostBreak']});
const pausing=suspended.host.run('Run');await wait(()=>suspended.get('ready')===1n);
assert(suspended.host.breakTask());await new Promise(resolve=>setTimeout(resolve,30));
assert.equal(suspended.get('caught'),0n);suspended.fn.Resume();await pausing;
assert.equal(suspended.get('caught'),0x6B61657242n);await suspended.host.dispose();

// The default physical Ctrl-Alt-C route uses the same request and typed catch.
const keys=load(`I64 Run() {I64 res=0;try {GetKey;} catch {res=Fs->except_ch;Fs->catch_except=TRUE;} return res;}`,
  {exports:['Run']});
const typing=keys.host.run('Run');
await wait(()=>keys.host.state.tasks[0].status==='waiting');
keys.host.keyBytes([0x1D]);keys.host.keyBytes([0x38]);keys.host.keyBytes([0x2E]);
assert.equal(await typing,0x6B61657242n);await keys.host.dispose();

// Uncaught interruptions remain observable errors, with normal task cleanup.
const uncaught=load('U0 Run() {MAlloc(31);Sleep(100000);}',{exports:['Run','TaskHostBreak']});
const failed=uncaught.host.run('Run');
await wait(()=>uncaught.host.state.tasks[0].status==='waiting');
assert(uncaught.host.breakTask());
const isBreak=error=>error instanceof WebAssembly.Exception && error.is(uncaught.fn.__exception_tag) &&
  error.getArg(uncaught.fn.__exception_tag,0)===0x6B61657242n;
await assert.rejects(failed,isBreak);await assert.rejects(uncaught.host.dispose(),isBreak);
assert.equal(uncaught.host.state.heapPtr,16777248);
clearTimeout(deadline);
console.log('Break: original lock/request/Shift-Esc behavior, 100 catch/recovery cycles, sleeping and suspended tasks, physical Ctrl-Alt-C and uncaught cleanup pass.');
