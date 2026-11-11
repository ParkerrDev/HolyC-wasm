import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
import {Module,Func,VT} from '../src/wasm/emitter.js';
import {FONT} from '../src/runtime/font.js';

async function run(source,options={}) {
  const result=compileHolyC(source,{lenient:false,...options});
  const module=new WebAssembly.Module(result.bytes),text=[];
  const host=createHost({onText:value=>text.push(value)});
  const instance=new WebAssembly.Instance(module,{env:host.env});
  host.attach(instance);
  instance.exports.__main();
  return {...result,module,instance,text};
}
const imports=module=>WebAssembly.Module.imports(module).map(entry=>entry.name);

// Omission changes the host contract: an unreachable imported function need not
// exist, while a function referenced only from a retained callback must exist.
{
  const result=await run(`
import I64 MissingHost();
U0 Dead() { MissingHost; "unreachable-string-sentinel"; GrCircle(gr.dc,1,2,3); }
I64 Read() { I64 gr=42; return gr; }
`,{exports:['Read']});
  assert.equal(result.instance.exports.Read(),42n);
  assert.deepEqual(imports(result.module),['__rt_init_failed','__gr_width','__gr_height']);
  assert(!Buffer.from(result.bytes).includes(Buffer.from('unreachable-string-sentinel')));
  assert(!Buffer.from(result.bytes).includes(Buffer.from(FONT)),
    'unused font data is not linked');
  assert.throws(()=>compileHolyC('U0 Dead() { Absent; }',{lenient:false}),/undefined symbol/);
  assert.throws(()=>compileHolyC('U0 Dead() { asm { NOP } }',{lenient:false}),/assembly/);
  const callback=compileHolyC('import I64 MissingHost(); I64 (*cb)()=&MissingHost;',
    {lenient:false});
  assert.throws(()=>new WebAssembly.Instance(new WebAssembly.Module(callback.bytes),
    {env:createHost().env}),/MissingHost|function import/);
}

// Unread user globals still initialize in source order, once, including side
// effects. A callback stored in a global is reachable without a direct call.
{
  const result=await run(`
I64 count=0;
I64 Count() { return ++count; }
I64 unused=Count;
U8 *live="retained-string-sentinel";
I64 Target(I64 n) { return n+count; }
I64 (*callback)(I64)=&Target;
I64 Apply(I64 n) { return callback(n); }
I64 Other(I64 n) { if (n) return Apply(n); return 0; }
`,{exports:['Other']});
  assert.equal(result.instance.exports.Other(41n),42n);
  result.instance.exports.__rt_init();result.instance.exports.__main();
  assert.equal(result.instance.exports.Other(41n),42n);
  const address=result.globals.get('live').addr;
  const memory=new DataView(result.instance.exports.memory.buffer);
  const string=Number(memory.getBigUint64(address,true));
  assert.equal(Buffer.from(memory.buffer,string,24).toString(),'retained-string-sentinel');
}

// Runtime dependencies include global initializer expressions and defaults,
// not just explicit drawing calls in main.
{
  const result=await run(`
I64 width=gr.dc->width;
I64 Width(CDC *dc=gr.dc) { return dc->width+width; }
I64 Thick() { return gr.dc->thick; }
`,{exports:['Width','Thick']});
  const memory=new DataView(result.instance.exports.memory.buffer);
  assert.equal(memory.getBigInt64(result.globals.get('width').addr,true),640n);
  const screen=memory.getBigUint64(result.globals.get('gr').addr,true);
  assert.equal(result.instance.exports.Width(screen),1280n);
  assert.equal(result.instance.exports.Thick(),1n,'DCRst dependency retained');
}

// Crossing LEB128 widths during linkage changes every later byte offset. The
// imported callback, direct calls, start entry and element segment all remap.
{
  const module=new Module();
  for(let i=0;i<140;i++)module.importFunc('env','unused'+i,[],[]);
  const imported=module.importFunc('env','answer',[],[VT.i64]);
  const dead=module.func([],[], 'dead'),target=module.func([],[VT.i64],'target');
  const entry=module.func([],[VT.i64],'entry'),start=module.func([],[],'start');
  dead.setBody([],new Func());
  target.setBody([],new Func().call(imported));
  const body=new Func().call(target.index).append(new Func().call(imported)).op('i64_add');
  entry.setBody([],body);start.setBody([],new Func().call(entry.index).drop());
  module.setTable(2);module.addElement(1,[target.index]);module.exportTable('table');
  module.exportFunc('entry',entry.index);module.setStart(start.index);
  module.linkFunctions(new Set([imported,target.index,entry.index,start.index]));
  const instance=new WebAssembly.Instance(new WebAssembly.Module(module.emit()),{env:{answer:()=>21n}});
  assert.equal(instance.exports.entry(),42n);
  assert.equal(instance.exports.table.get(1)(),21n);
  assert.equal(module.importFuncs.length,1);
  assert.equal(module.funcs.length,3);
}

// Hosts can initialize an exported library without entering its __main. Native
// defaults capture the declaration's environment once, including side effects.
{
  const result=compileHolyC(`
I64 option=2,count=0;
I64 Next() { return ++count; }
I64 Unused(I64 n=Next) { return n; }
I64 Target(I64 n=option) { return n; }
I64 Read() { return Target+count*10; }
U0 Change() { option=9; }
`,{lenient:false,exports:['Read','Change']});
  const host=createHost(),instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});
  host.attach(instance);
  instance.exports.__rt_init();
  assert.equal(instance.exports.Read(),12n);
  instance.exports.Change();
  assert.equal(instance.exports.Read(),12n);
  instance.exports.__rt_init();
  assert.equal(instance.exports.Read(),12n);
  assert(![...result.globals.keys()].some(name=>name.startsWith('#default:')));
}

// Brush tables are a dependency of the fields that expose them. Unrelated
// graphics reads stay allocation-free; escaping the whole object is conservative.
{
  const plain=await run('I64 Width() { return gr.dc->width; }',{exports:['Width']});
  assert.equal(plain.instance.exports.Width(),640n);
  if (!process.env.NOFOLD)
    assert(!imports(plain.module).includes('__malloc'),
      'folded screen-dimension reads omit the unreachable brush allocator');
  const direct=await run('I64 Pen() { return gr.pen_brushes[9]->width; }',{exports:['Pen']});
  assert.equal(direct.instance.exports.Pen(),9n);
  const alias=await run('CGr *alias=&gr; I64 Pen() { return alias->pen_brushes[7]->width; }',
    {exports:['Pen']});
  assert.equal(alias.instance.exports.Pen(),7n);
}
// Unreachable literals must not reserve address space or move live bytes. This
// catches padding that a search for the omitted string in the binary misses.
{
  const source=`
U8 *Live() {return "live-address";}
U8 copy[5]="abcd";
U8 *default_ptr="default";
U8 *Default(U8 *ptr=default_ptr) {return ptr;}
I64 Read() {return *Live+copy[3]+*Default;}
`;
  const options={exports:['Live','Read']};
  const plain=await run(source,options);
  const dead='U8 *Dead() {return "'+ 'unused-padding'.repeat(8192)+'";}\n';
  for (const changed of [dead+source,source+dead]) {
    const result=await run(changed,options);
    assert.equal(result.dataEnd,plain.dataEnd,'dead literals have no storage');
    assert.equal(result.instance.exports.Live(),plain.instance.exports.Live());
    assert.equal(result.instance.exports.Read(),308n,'i32 array-copy and i64 pointer literals');
    assert.deepEqual(result.bytes,plain.bytes,'unused code cannot perturb live layout');
  }
  const identity=await run(`
U8 *First() {return "same";}
U8 *Second() {return "same";}
I64 Check() {return First!=Second;}
`,{exports:['Check']});
  assert.equal(identity.instance.exports.Check(),1n,'distinct mutable literals keep distinct storage');
}

// Operand widths change in both directions: addresses grow and call indices
// shrink. Appended bodies and stack-guard positions must survive either order.
for (const order of ['DLG','DGL','LDG','LGD','GDL','GLD']) {
  const module=new Module();
  for(let i=0;i<140;i++) module.importFunc('env','unused'+i,[],[]);
  const answer=module.importFunc('env','answer',[],[VT.i64]);
  const checked=module.importFunc('env','checked',[],[]);
  const entry=module.func([],[VT.i64],'entry');
  const wide={addr:0x80000001},narrow={addr:63};
  const tail=new Func().dataAddress(narrow).call(answer).op('i64_add').stackCheck(2);
  const body=new Func().dataAddress(wide,32).op('i64_extend_i32_u')
    .call(answer).op('i64_add').stackCheck(1).append(tail).op('i64_add');
  entry.setBody([],body);module.exportFunc('entry',entry.index);
  for (const op of order) {
    if (op==='D') body.resolveDataAddresses();
    if (op==='L') module.linkFunctions(new Set([answer,checked,entry.index]));
    if (op==='G') body.guardStack(()=>new Func()
      .call(module.importFuncs.findIndex(item=>item.name==='checked')));
  }
  let checks=0;
  const instance=new WebAssembly.Instance(new WebAssembly.Module(module.emit()),
    {env:{answer:()=>21n,checked:()=>checks++}});
  assert.equal(instance.exports.entry(),0x80000001n+63n+42n,order);
  assert.equal(checks,2,order);
}
{
  const module=new Module(),fn=module.func([],[VT.i64],'unresolved');
  fn.setBody([],new Func().dataAddress({}));
  assert.throws(()=>module.emit(),/Unresolved data address/);
  assert.throws(()=>module.funcs[0].body.resolveDataAddresses(),/Unlinked data address/);
}
console.log('Linkage: unused imports/code/data omitted; eager diagnostics, initializer order, callbacks, exports, literal layout, relocated calls and stack guards preserved.');
