import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileHolyC} from '../src/compiler.js';
import {compile} from '../src/codegen.js';
import {parse} from '../src/parser.js';
import {lex} from '../src/lexer.js';
import {createHost} from '../src/runtime/host.js';
import {createTaskHost} from '../src/runtime/tasks.js';
import {MS_ADDR} from '../src/abi.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function load(result,env={}) {
  assert.deepEqual(result.warnings,[]);
  const tasks=result.requiredCapabilities?.includes('task-continuations');
  let out='';const host=(tasks?createTaskHost:createHost)({onText:text=>out+=text});Object.assign(host.env,env);
  const module=new WebAssembly.Module(result.bytes),instance=new WebAssembly.Instance(module,{env:host.env});
  host.attach(instance);if(tasks)await host.run();else instance.exports.__main();
  return {fn:instance.exports,out,imports:WebAssembly.Module.imports(module).map(entry=>entry.name)};
}
const stem=new URL('./probes/GlobalInclude',import.meta.url).pathname;
const source=readFileSync(stem+'.HC'),header=readFileSync(new URL('./probes/Shadow.HH',import.meta.url));
const evidence=JSON.parse(readFileSync(stem+'.native.json'));
assert.equal(evidence.backend.engine,'qemu');assert.equal(evidence.except,'');
assert.equal(evidence.sourceSha256,hash(source));
assert.equal(evidence.dependencies['Shadow.HH'],hash(header));
const expected=readFileSync(stem+'.out','latin1');assert.equal(evidence.outputSha256,hash(Buffer.from(expected,'latin1')));
if(process.argv.includes('--native')) {
  const {QemuRun}=await import('./oracle/Qemu.mjs');
  const native=await QemuRun([source],{files:[{name:'SHADOW.HH',bytes:header}]});
  assert.equal(native.results[0].except,'');assert.equal(native.results[0].out,expected);
  console.log('Native include binding:',native.evidence);
}
const included=compileHolyC(source,{lenient:false,includeResolver:name=>{
  assert.equal(name,'C:/ORACLE/SHADOW.HH');return {filename:name,source:header};
}});
assert.equal((await load(included)).out,expected);

// A later user name must neither steal an earlier runtime binding nor activate
// the device hook associated with that runtime symbol.
const sourceNames='I64 gr=42,kbd=7,ms=11; I64 Value(){return gr+kbd+ms;}';
const plain=compileHolyC(sourceNames,{lenient:false,exports:['Value']});
const basic=compileHolyC('I64 Value(){return 60;}',{lenient:false,exports:['Value']});
assert.deepEqual(plain.requiredCapabilities,[]);
assert.deepEqual((await load(plain)).imports,(await load(basic)).imports);
assert.equal((await load(plain)).fn.Value(),60n);
assert.notEqual(plain.globals.get('ms').addr,MS_ADDR);
assert([...plain.globals.keys()].every(name=>!name.startsWith('#')));
const graphics=compileHolyC('I64 Width(){return gr.dc->width;} I64 Pens(){return gr.pen_brushes[3]->width;} I64 gr=42;',
  {lenient:false,exports:['Width','Pens']});
const drawing=await load(graphics);assert.equal(drawing.fn.Width(),640n);assert.equal(drawing.fn.Pens(),3n);

// Keep an initializer keyed to the prelude symbol even when all user names are
// different types. This models a real CTextGlbls text followed by U8 text[].
const prelude=`import I64 Device(); I64 text=7;
U0 Init(){text=Device;} I64 Earlier(){return text;}`;
const user='U8 text[5]="abcd"; I64 Read(){return text[0];}';
const ast=parse([...lex(prelude,'<prelude>').filter(token=>token.type!=='eof'),...lex(user,'user.hc')]);
const options={lenient:false,runtimeInitializers:[{name:'Init',globals:['text']}]};
const hidden=compile(ast,{...options,exports:['Read']});
assert.equal((await load(hidden)).fn.Read(),97n);assert(!(await load(hidden)).imports.includes('Device'));
let calls=0;
const retained=compile(ast,{...options,exports:['Read','Earlier']});
const live=await load(retained,{Device:()=>{calls++;return 80n;}});
assert.equal(live.fn.Earlier(),80n);assert.equal(live.fn.Read(),97n);assert.equal(calls,1);
// A runtime function naming a global the runtime declares after it binds to
// that declaration, never to a later program global of the same name.
const forward=parse([...lex('I64 Late(){return late;} I64 late=5;','<prelude>')
  .filter(token=>token.type!=='eof'),...lex('U8 late[4]="xyz"; I64 Mine(){return late[0];}','user.hc')]);
const bound=await load(compile(forward,{lenient:false,exports:['Late','Mine']}));
assert.equal(bound.fn.Late(),5n);assert.equal(bound.fn.Mine(),120n);
console.log('Global bindings: native include storage, runtime hook identity, hidden earlier storage and pinned mouse isolation pass.');
