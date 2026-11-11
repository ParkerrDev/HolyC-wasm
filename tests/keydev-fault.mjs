import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';
function build(source,exports=[]) {
  const result=compileHolyC(source,{lenient:false,runtimeProfile:'keydev',exports});
  assert.deepEqual(result.warnings,[]);return new WebAssembly.Module(result.bytes);
}
function tracked(module,options={}) {
  let calls=0,failAt=0;
  const host=createTaskHost({gfx:new Framebuffer(null),onText:()=>{},...options}),live=new Set();
  for(const name of ['__malloc','__malloc_kernel','__malloc_for']) {
    const alloc=host.env[name];host.env[name]=(...args)=>{
      if(++calls===failAt)return 0n;
      const ptr=alloc(...args);if(ptr>0n)live.add(ptr);return ptr;
    };
  }
  const free=host.env.__free;host.env.__free=ptr=>{free(ptr);live.delete(ptr);};
  const instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
  return {host,fn:instance.exports,live,get calls(){return calls;},arm(n=0){calls=0;failAt=n;}};
}
const source=readFileSync(new URL('keydev/KeyFault.HC',import.meta.url),'latin1');
const module=build(source,['Setup','State','Trial','Overlap','CallbackFault','CallbackYield','BoundsFault','PriorityFault']);
let now=0,checks=0,active;
const device=new Framebuffer(null);
const run=tracked(module,{gfx:device,timeMs:()=>{
  if(active && active.State(3n)) {
    assert.equal(active.State(4n),1n);assert.equal(active.State(5n),0n);
    assert(device.indices.some(pixel=>pixel===15));checks++;
  }
  return now+=0.25;
}});active=run.fn;
try {
  await run.host.run('Setup');const baseline=run.live.size;
  run.arm();assert.equal(await run.host.run('Trial',0n),0n);const sites=run.calls;
  assert(sites>0);assert.equal(run.live.size,baseline);
  assert(run.host.state.gfx.indices.some(pixel=>pixel===15));
  for(let n=1;n<=sites;n++) {
    const before=[active.State(0n),active.State(1n),active.State(2n)];run.arm(n);
    assert.equal(await run.host.run('Trial',0n),0x6D654D74754Fn,'Allocation '+n);
    assert.deepEqual([active.State(0n),active.State(1n),active.State(2n)],before);
    assert.equal(run.live.size,baseline);
  }
  device.indices.fill(0);run.arm();await run.host.run('Overlap');assert(checks>20);assert.equal(run.live.size,baseline);
  const flags=[active.State(0n),active.State(1n)];
  assert.equal(await run.host.run('CallbackFault'),0x6C69614679654Bn);
  assert.deepEqual([active.State(0n),active.State(1n)],flags);assert.equal(run.live.size,baseline);
  assert.equal(await run.host.run('BoundsFault'),0x646E756F42776152n);
  assert.deepEqual([active.State(0n),active.State(1n)],flags);assert.equal(run.live.size,baseline);
  await run.host.run('CallbackYield');assert.equal(run.live.size,baseline);
  for(const priority of [0n,-1n,-0x8000000000000000n]) {
    run.arm();assert.equal(await run.host.run('PriorityFault',priority),0x726F69725079654Bn);
    assert.equal(run.calls,0);assert.equal(run.live.size,baseline);
  }
  for(const bad of [()=>{throw new Error('timer unavailable');},()=>NaN,()=>Infinity,()=>-Infinity,()=>1n]) {
    for(const failAfter of [0,3]) {
      let reads=0;
      run.host.state.timeMs=()=>reads++<failAfter?++now:bad();
      assert.equal(await run.host.run('Trial',8n),0x6B636F6C43n);
      assert(run.host.state.timerError);assert.deepEqual([active.State(0n),active.State(1n)],flags);
      assert.equal(run.live.size,baseline);
    }
  }
  let reads=0;run.host.state.timeMs=()=>reads++?10:20;
  assert.equal(await run.host.run('Trial',8n),0x6B636F6C43n);
  assert.deepEqual([active.State(0n),active.State(1n)],flags);assert.equal(run.live.size,baseline);
  run.host.state.timeMs=()=>now+=0.25;
  assert.equal(await run.host.run('Trial',8n),0n);assert.equal(run.host.state.timerError,null);
  assert.equal(run.live.size,baseline);
  console.log(sites,'RawPrint allocation failures, throwing/yielding callbacks, raw bounds and failed/nonfinite/backward clocks preserve ownership and flags; standard-chain busy output does not run a ready child.');
} finally {await run.host.dispose();}
assert.equal(run.live.size,0);assert.equal(run.host.state.tasks[0].allocations,0);
const startup=build(`I64 started=0; started=1; if(keydev.put_key_head.priority || kbd.scan_code&SCF_SCROLL)throw('Sentinel');`);
const normal=tracked(startup);await normal.host.run();const allocations=normal.calls;
await normal.host.dispose();assert.equal(normal.live.size,0);
for(let n=1;n<=allocations;n++) {
  const trial=tracked(startup);trial.arm(n);
  try {
    await assert.rejects(trial.host.run());
    trial.arm();await assert.rejects(trial.host.run(),/fresh.*instance/);
  } finally {await assert.rejects(trial.host.dispose(),/fresh.*instance/);}
  assert.equal(trial.live.size,0,'Initialization allocation '+n);
}
const unavailable=createTaskHost({gfx:new Framebuffer(null)});delete unavailable.env.__time_ms_checked;
assert.throws(()=>new WebAssembly.Instance(module,{env:unavailable.env}),WebAssembly.LinkError);
console.log(allocations,'initialization allocation failures require a fresh instance and release partial session state on disposal.');
