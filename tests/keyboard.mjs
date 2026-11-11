import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost} from '../src/runtime/tasks.js';
const native=readFileSync(new URL('probes/KeyboardState.HC',import.meta.url),'latin1');
const expected=readFileSync(new URL('probes/KeyboardState.out',import.meta.url),'latin1');
const evidence=JSON.parse(readFileSync(new URL('probes/KeyboardState.native.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value,'latin1').digest('hex');
assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
assert.equal(sha(native),evidence.sourceSha256);assert.equal(sha(expected),evidence.outputSha256);
const bytes=native.match(/U8 key_packets\[\d+\]=\{([^}]+)\}/)[1].split(',').filter(value=>value.trim()).map(Number);
const packets=[];for(let i=0;i<bytes.length;) {const length=bytes[i++];packets.push(bytes.slice(i,i+=length));}
const dump=native.slice(native.indexOf('    "%X %X %d '),native.indexOf("    '\\n';")+10).replace(/,task\)/g,')');
const source=`
I64 step=0,stop=0;
I64 ForceTasks() {return GetKey;}
I64 Clear() {I64 i;for(i=0;i<8;i++) if(kbd.down_bitmap[i] || kbd.down_bitmap2[i]) return FALSE;return TRUE;}
I64 Flags() {return kbd.scan_code;}
I64 Count() {return kbd.cnt;}
U0 Input() {
  I64 j,code,ch,sc;
  while(!stop) {
    while(!step && !stop) Sleep(1);
    if(stop) break;
${dump}
    step=0;
  }
}
`;
const result=compileHolyC(source,{lenient:false,exports:['Input','ForceTasks','Clear','Flags','Count']});
assert.deepEqual(result.warnings,[]);
const module=new WebAssembly.Module(result.bytes);
let output='';const leds=[],actions=[];
const host=createTaskHost({ansi:false,onText:text=>output+=text,onKeyboardLeds:sc=>leds.push(sc),onControlAlt:(...args)=>actions.push(args)});
const instance=new WebAssembly.Instance(module,{env:host.env});host.attach(instance);
const fn=instance.exports,memory=new DataView(fn.memory.buffer);
const address=name=>result.globals.get(name).addr;
const set=(name,value)=>memory.setBigInt64(address(name),BigInt(value),true);
const get=name=>memory.getBigInt64(address(name),true);
const deadline=setTimeout(()=>{throw new Error('Keyboard checks did not settle');},15000);
const wait=async predicate=>{for(let i=0;!predicate();i++) {assert(i<5000,'keyboard task made no progress');await new Promise(resolve=>setTimeout(resolve,1));}};
const running=host.run('Input');
await wait(()=>host.state.tasks[0].status==='waiting');
for(const packet of packets) {
  assert(host.keyBytes(packet));set('step',1);await wait(()=>get('step')===0n);
}
assert.equal(output,expected,'full original KbdHndlr/KbdMsgsQue state and messages');
assert.equal(actions.length,0);assert(leds.length>=4,'lock-key LED device notifications');
assert(fn.Clear());
const before=fn.Count();
for(const packet of [[],[1,256],[1,-1],[1,1.5],Array(9).fill(1)]) assert.throws(()=>host.keyBytes(packet),RangeError);
assert.equal(fn.Count(),before,'validation precedes all packet effects');
host.keyBytes([0x2A]);host.keyBytes([0xE0,0x4B]);assert.equal(fn.Clear(),0n);
host.keyBytes([0xE0]);
assert(host.resetInput());assert.equal(fn.Clear(),1n);assert.equal(fn.Flags()&0xE00n,0n);
host.keyBytes([0x1D]);host.keyBytes([0x38]);host.keyBytes([0x1E]);
assert.equal(actions.length,1);assert.equal(actions[0][1],0);assert.equal(actions[0][2],false);
host.resetInput();assert.equal(fn.Clear(),1n);
// Aborted injected-message frames must not consume the suspended task's stack.
// Imports are captured at instantiation; use a second host for allocation faults.
set('stop',1);await running;await host.dispose();assert.equal(host.state.heapPtr,16777248);
let fail=false;
const broken=createTaskHost({onText:()=>{}}),original=broken.env.__malloc_kernel;
broken.env.__malloc_kernel=size=>fail?0n:original(size);
const second=new WebAssembly.Instance(module,{env:broken.env});broken.attach(second);
const active=broken.run('Input');await wait(()=>broken.state.tasks[0].status==='waiting');
const initial=second.exports.__sp.value;fail=true;
for(let i=0;i<100;i++) assert.throws(()=>broken.postMessage(2,1,2),WebAssembly.Exception);
assert.equal(second.exports.__sp.value,initial);
fail=false;assert(broken.postMessage(2,97,30));
const secondMemory=new DataView(second.exports.memory.buffer);
secondMemory.setBigInt64(address('step'),1n,true);
await wait(()=>secondMemory.getBigInt64(address('step'),true)===0n);
assert.equal(second.exports.__sp.value,initial,'resuming after injected faults preserves the suspended stack');
// Without a registered system adapter Ctrl-Alt actions refuse explicitly.
broken.keyBytes([0x1D]);broken.keyBytes([0x38]);
assert.throws(()=>broken.keyBytes([0x1E]),/keyboard device adapter/);
broken.resetInput();await broken.stop();await active;await broken.dispose();
assert.equal(broken.state.heapPtr,16777248);
const pollResult=compileHolyC('I64 Poll() {while(!Bt(kbd.down_bitmap,SC_CURSOR_LEFT)) Sleep(1);return kbd.last_down_scan_code;}',
  {lenient:false,exports:['Poll']});
assert.deepEqual(pollResult.requiredCapabilities,['task-continuations']);
const pollHost=createTaskHost(),pollInstance=new WebAssembly.Instance(new WebAssembly.Module(pollResult.bytes),{env:pollHost.env});
assert.equal(typeof pollInstance.exports.KbdHostByte,'function');pollHost.attach(pollInstance);
const polling=pollHost.run('Poll');await wait(()=>pollHost.state.tasks[0].status==='waiting');
assert(pollHost.keyBytes([0xE0,0x4B]));assert.equal((await polling)&255n,0x4Bn);await pollHost.dispose();
const unused=compileHolyC('I64 Unused() {return kbd.scan_code;}',{lenient:false});
assert.deepEqual(unused.requiredCapabilities,[],'unreachable keyboard access adds no task requirement');
clearTimeout(deadline);
console.log(`Keyboard: ${packets.length} original handler packets, full bitmaps/messages, device effects, reset and injected allocation failure recovery pass.`);
