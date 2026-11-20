// codegen.js - lowers the HolyC AST to a WebAssembly module.
const NOFOLD = typeof process !== "undefined" && process.env && process.env.NOFOLD;  // bisect toggle (Node-only)
//
// Value model:
//   - ints & pointers -> wasm i64
//   - F64             -> wasm f64
//   - aggregates (array/class) are represented by their address (i64)
//
// Memory:
//   - static data (globals + interned strings) from DATA_BASE upward
//   - a shadow stack growing DOWN from STACK_TOP (global __sp), for addressable
//     locals (those whose address is taken, number-union accessed, or aggregates)
//   - a runtime heap above HEAP_BASE for MAlloc
import { Module, Func, VT, EMPTY_BLOCK } from "./wasm/emitter.js";
import {
  T, BASE_TYPES, ptrTo, arrayOf, funcPtr, isFuncPtr, isInt, isFloat, isPtr, isArray, isVoid,
  isClass, isAggregate, isScalar, sizeof, elemType, wasmValType, loadOp, storeOp,
  binResultType, typeName, UNION_MEMBERS,
} from "./types.js";
import {
  HOST_IMPORTS, DATA_BASE, STACK_TOP, HEAP_BASE, MEM_INITIAL_PAGES,
  MEM_MAX_PAGES, MS_ADDR, JUNK_ADDR,
  COLOR_NAMES, GR_WIDTH, GR_HEIGHT,
} from "./abi.js";
import { foldConstInt, foldDim } from "./fold.js";
import { usesGoto, Gotos } from "./goto.js";
import {nativeRegisters} from "./local-storage.js";
import {Names,StrWords,Walk} from "./names.js";
// A product rounds to x87's 64-bit significand before native FISTTP.
export const FLOAT_MUL_I64="#mul-f64-i64";

const PINNED_GLOBALS = { ms: MS_ADDR };
const REPEATED_MEMBERS=new Set(["pad","reserved","_anon_"]);

export class CodegenError extends Error {}

export function compile(programAst, opts = {}) {
  return new Codegen(programAst, opts).run();
}

// Code compiled while the program runs (src/jit.js), as V5.03 compiles each
// top-level statement after the one before it has run: a later part of the
// program, text from ExePutS, or one expression. jit is the program's symbol
// table so far (Jit in jit.js); program holds the part's own decls and items.
export function compileJit(program, jit, expr=null) {
  return new Codegen(program,{lenient:false,jit}).runSegment(expr);
}

class Codegen {
  constructor(program, opts) {
    this.program = program;
    const binding=name=>program.runtimeBindings?.[name]??name;
    const functionBinding=name=>program.runtimeFunctionBindings?.[name]??name;
    this.runtimeExportNames=new Map();
    const bind=api=>({...api,name:functionBinding(api.name),check:functionBinding(api.check),
      exports:api.exports?.map(name=>{
        const bound=functionBinding(name);this.runtimeExportNames.set(bound,name);return bound;
      }),globals:api.globals?.map(binding),
      writeOnlyGlobals:api.writeOnlyGlobals?.map(binding),
      fields:api.fields?.map(name=>{const [root,...path]=name.split(".");return [binding(root),...path].join(".");})});
    this.opts={...opts,runtimeInitializers:opts.runtimeInitializers?.map(bind),
      runtimeInterfaces:opts.runtimeInterfaces?.map(bind)};
    this.runtimeAddresses=new Map((opts.runtimeAddresses||[])
      .map(({name,storage,offset})=>[binding(name),{storage:binding(storage),offset}]));
    this.m = new Module();
    this.classes = new Map();   // name -> ClassDecl node
    this.classLayouts = new Map(); // name -> {size, align, fields:Map}
    this.functionAddresses=new Map();
    this.functions = new Map(); // name -> fn record
    this.globals = new Map();   // name -> {addr, type}
    this.globalInitializers=new Map();
    this.declarationInitializers=new Map();
    this.defaultValues=new WeakMap();
    this.staticLocals=new WeakMap();
    this.constEnv = {};         // name -> bigint, for #define-like enum constants
    this.data = [];             // {addr, bytes}
    this.literals = new WeakMap();
    this.cursor = DATA_BASE;
    this.warnings = [];
    this.localRegisters=opts.traceLocals?new Map():undefined;
    // Lenient mode (default ON): unknown kernel symbols/fields/calls become safe
    // fallbacks so whole programs compile & run, with unsupported features as
    // documented no-ops. Strict tests pass {lenient:false} to surface real bugs.
    this.lenient = opts.lenient !== false;
    this.unknownSyms = new Set();
    this.jit=opts.jit??null;
    this.forwardStubs=new Set();
  }

  warn(msg) { this.warnings.push(msg); }

  // Allocate (once) a backing I64 cell for an unknown kernel symbol so lenient
  // code can read/write it without colliding with anything real.
  lenientGlobal(name) {
    if (this.globals.has(name)) return this.globals.get(name).addr;
    const addr = this.alloc(8, 8);
    this.globals.set(name, { addr, type: T.I64, init: null, synthetic: true });
    if (!this.unknownSyms.has(name)) { this.unknownSyms.add(name); this.warn(`unknown symbol '${name}' modeled as I64 global`); }
    return addr;
  }
  errAt(node, msg) { throw new CodegenError(`line ${node && node.line}: ${msg}`); }

  alloc(size, align = 8) {
    if (this.jit) return this.jit.alloc(size,align);
    if (!Number.isFinite(size)) { if (this.lenient) { this.warn("non-finite alloc size; using 8"); size = 8; } else throw new CodegenError("non-finite alloc size " + size); }
    if (!Number.isFinite(align) || align < 1) align = 8;
    this.cursor = align8(this.cursor, align);
    const a = this.cursor;
    this.cursor += size;
    return a;
  }

  literalBytes(node,owner) {
    if (this.literals.has(node)) {
      const data=this.literals.get(node);data.owners.add(owner);return data;
    }
    const bytes = node.kind === "BinLit" ? node.bytes : [...node.bytes, 0];
    const data={bytes,owners:new Set([owner]),str:node.kind==="StrLit"};
    this.data.push(data);
    this.literals.set(node,data);
    return data;
  }

  // ============================================================ run
  run() {
    // host imports first
    const memory=this.opts.memory??{},initial=memory.initial??MEM_INITIAL_PAGES,
      maximum=memory.maximum===null?undefined:memory.maximum??MEM_MAX_PAGES,
      shared=memory.shared??!!this.opts.sharedMemory;
    if (!Number.isInteger(initial) || initial<0 || initial>65536 ||
        shared && maximum===undefined || maximum!==undefined &&
        (!Number.isInteger(maximum) || maximum<initial || maximum>65536))
      throw new CodegenError("Invalid WebAssembly memory page limits");
    if (memory.imported || shared)
      this.m.importMemory("env","mem",initial,maximum,shared);
    else this.m.setMemory(initial,maximum);
    this.imports = {};
    for (const [name, sig] of Object.entries(HOST_IMPORTS)) {
      const idx = this.m.importFunc("env", name, sig.params, sig.results);
      this.imports[name] = { index: idx, sig };
    }
    // globals for stack pointer & heap pointer
    this.spGlobal = this.m.addGlobal(VT.i64, true, new Func().i64_const(STACK_TOP));
    this.excGlobal = this.m.addGlobal(VT.i64, true, new Func().i64_const(0)); // thrown value
    this.coreGlobal = this.m.addGlobal(VT.i64, true, new Func().i64_const(0)); // SMP: per-instance core index, read via MyCore(); host sets it per worker (default 0)

    // PASS 1: collect classes, function signatures, globals
    this.collectClasses();
    this.collectConsts();
    this.collectGlobals();
    this.collectStatics();
    this.collectInitializers();
    this.collectSourceImports();
    this.collectFunctions();

    // reserve __rt_init and __main
    this.rtInit = this.m.func([], []);
    this.mainFn = this.m.func([], []);
    this.boot=[];this.unresolved=new Map();

    // PASS 2: generate bodies
    for (const fn of this.functions.values()) {
      if (fn.isImport || fn.isAlias) continue;
      if (fn.node && fn.node.body) {
        this.adam(fn.node,fn.index,()=>this.genFunctionBody(fn),()=>fn.slot.setBody([],new Func().unreachable()));
        continue;
      }
      //Unused prototypes reserve a slot; strict references to them are errors.
      if (fn.slot) this.genStubBody(fn);
    }
    const initContext=this.genGlobalInitializers();
    this.genMain();
    // Code compiled at run time names the program's functions as V5.03's
    // symbol table holds them: the later parts' names, every function of the
    // program's own files and the names in its strings stay linked. Text is
    // compiled only when the program's own code reaches the compiler: what the
    // host may call (a task's Break, say) runs only the jobs the program made.
    const own=this.reachable({own:true});
    const later=this.opts.jitMain,compiles=["__jit_exe","__jit_expr","__jit_rest","__call_ext"]
      .some(name=>own.functions.has(this.imports[name]?.index));
    let linked=this.reachable();
    if (compiles) {
      const user=this.program.items.filter(item=>item.filename!=="<prelude>");
      //FileRead is how V5.03's Lex reads an #include (Compiler/Lex.HC:707).
      const words=new Set([...later?.names??[],...StrWords(user),
        "Print","PutChars","FileRead",FLOAT_MUL_I64]);
      for (const fn of this.functions.values())
        if (fn.node?.filename && fn.node.filename!=="<prelude>") words.add(fn.name);
      this.jitExports=[...words].filter(name=>this.functions.get(name)?.slot &&
        !this.unresolved.has(this.functions.get(name).index));
      linked=this.reachable({strings:true});
      this.jitExports.push(...linked.named);
    }
    for (const [key,error] of this.unresolved)
      if (linked.functions.has(key) || linked.globals.has(key)) throw error;
    this.genRtInit(initContext,linked);

    if (this.functionAddresses.size || compiles) {
      this.m.setTable(this.functionAddresses.size+1);
      for (const [index,address] of this.functionAddresses)
        if (linked.functions.has(index) && !this.forwardStubs.has(index)) {
          const entry=this.tableEntry(index);
          linked.functions.add(entry);this.m.addElement(address,[entry]);
        }
      this.m.exportTable("__functions");
    }
    if (compiles) {
      this.exceptionTag();
      this.m.exportGlobal("__exception",this.excGlobal);
    }

    // Strictly validate every body before assigning storage to live literals.
    // Global storage keeps its declaration identity, even when unread.
    for (const d of this.data)
      if ([...d.owners].some(owner=>linked.bodies.has(owner))) {
        if (d.addr===undefined) d.addr=this.alloc(d.bytes.length,1);
        this.m.addData(d.addr,d.bytes);
      }
    for (const index of linked.functions)
      this.m.funcs[index-this.m.importFuncs.length]?.body.resolveDataAddresses();
    this.rootStk(linked);

    // exports
    this.m.exportMemory("memory");
    this.m.exportFunc("__main", this.mainFn.index);
    this.m.exportFunc("__rt_init", this.rtInit.index);
    this.m.exportGlobal("__sp", this.spGlobal);
    this.m.exportGlobal("__core", this.coreGlobal);   // SMP: host sets each worker's core index here
    // functions the host calls back into (a runtime JIT's memory/step hooks, guest-execution entry points,
    // test probes): named by the caller via opts.exports - the compiler has no built-in list.
    const published=new Map();
    for (const nm of new Set([...(this.opts.exports || []),...linked.exports,...this.jitExports??[]])) {
      const fn = this.functions.get(nm);
      if (fn && fn.slot) {
        if (!this.lenient && !fn.node) throw new CodegenError("Unresolved exported function: " + nm);
        const name=linked.exports.has(nm)?this.runtimeExportNames.get(nm)??nm:nm;
        if (published.has(name) && published.get(name)!==fn.slot.index)
          throw new CodegenError("Conflicting runtime and user function export: "+name);
        if (!published.has(name)) this.m.exportFunc(name,fn.slot.index);
        published.set(name,fn.slot.index);
      }
    }

    if (linked.interfaces.size) {
      if (this.cursor>=STACK_TOP) throw new CodegenError("Task runtime data exceeds the root shadow stack");
      const limit=this.m.addGlobal(VT.i64,true,new Func().i64_const(this.cursor));
      this.m.exportGlobal("__stack_limit",limit);
      if (!compiles) this.m.exportGlobal("__exception",this.excGlobal);
      const fault=this.imports.__task_stack_fail.index;
      for (const slot of this.m.funcs)
        slot.body.guardStack(size=>new Func().global_get(this.spGlobal)
          .global_get(limit).i64_const(size).op("i64_add").op("i64_lt_u")
          .if_().call(fault).unreachable().end());
      linked.functions.add(fault);
      const start=this.m.func([],[]),body=new Func();
      for (const api of linked.interfaces) body.call(this.functions.get(api.check).index);
      start.setBody([],body);this.m.setStart(start.index);
      linked.functions.add(start.index);
    }
    this.m.linkFunctions(linked.functions);
    const bytes = this.m.emit();
    const globals=new Map([...this.globals].filter(([,g])=>!g.node?.internal));
    return { bytes, warnings: this.warnings, dataEnd: this.cursor, globals,
      memory:{initial,maximum,shared},
      ...(compiles?{symbols:this.symbols(published,linked)}:{}),
      requiredCapabilities:[...linked.interfaces].map(api=>api.name),
      ...(this.localRegisters?{localRegisters:this.localRegisters}:{}) };
  }

  // V5.03 TaskStkNew gives Adam a CTaskStk with its stack after it. The root
  // task's stack is the shadow stack, from here up to STACK_TOP, so its
  // CTaskStk goes at the foot of it and fs_storage.stk points at it, in a
  // program that reads a task's stk.
  rootStk(linked) {
    const root=this.globals.get("fs_storage");
    if (this.jit || !root || !linked.fields.has("CTask.stk") || !this.classes.has("CTask") || !this.classes.has("CTaskStk")) return;
    const fields=this.layoutClass("CTaskStk").fields,stk=this.alloc(fields.get("stk_base").offset,8);
    const head=new DataView(new ArrayBuffer(fields.get("stk_base").offset));
    head.setBigInt64(fields.get("stk_size").offset,BigInt(STACK_TOP-this.cursor),true);
    this.m.addData(stk,new Uint8Array(head.buffer));
    const at=new DataView(new ArrayBuffer(8));
    at.setBigInt64(0,BigInt(stk),true);
    this.m.addData(root.addr+this.layoutClass("CTask").fields.get("stk").offset,new Uint8Array(at.buffer));
  }

  // What code compiled at run time links to (Jit in jit.js): every global,
  // the constants, the published functions and the function addresses.
  symbols(published,linked) {
    const byIndex=new Map([...this.functions.values()].filter(fn=>fn.slot).map(fn=>[fn.slot.index,fn]));
    const exported=new Map([...published].map(([name,index])=>[index,name]));
    const functions=new Map(),addresses=new Map();
    for (const fn of this.functions.values()) {
      if (!fn.slot || !exported.has(fn.slot.index)) continue;
      functions.set(fn.name,{params:fn.params,retType:fn.retType,isVarArgs:fn.isVarArgs,
        exportName:exported.get(fn.slot.index),defined:!!fn.node && !this.forwardStubs.has(fn.index)});
    }
    for (const [index,address] of this.functionAddresses)
      if (linked.functions.has(index) && byIndex.has(index)) {
        const fn=byIndex.get(index);
        addresses.set(fn.name,address);
        //One not exported is still called through its table entry, not copied.
        if (!exported.has(index) && !this.forwardStubs.has(index) && fn.node)
          functions.set(fn.name,{params:fn.params,retType:fn.retType,isVarArgs:fn.isVarArgs,
            exportName:null,address,defined:true});
      }
    //The prelude's statements, for the ones a file reached later needs (src/jit.js).
    const boot=this.boot.map(({item,file,uses,names,index})=>({item,file,uses,names,ran:linked.functions.has(index)}));
    return {globals:new Map(this.globals),constEnv:{...this.constEnv},functions,addresses,boot,
      stackLimit:linked.interfaces.size>0,tableSize:this.functionAddresses.size+1,
      linkedGlobals:new Set(linked.globals),preludeFiles:this.opts.preludeFiles??[]};
  }

  // A part of the program, text or one expression, compiled against the
  // symbols so far. The module imports the program's memory, stack pointer,
  // core, exception and stack limit globals, its table and exception tag,
  // and the functions it names; its own globals and literals go where
  // jit.alloc puts them. __main runs its statements in order and returns the
  // last expression statement's 64 bits; with expr, __main is that value.
  runSegment(expr) {
    const jit=this.jit,{initial,maximum,shared}=jit.memory;
    this.m.importMemory("env","mem",initial,maximum,shared);
    this.imports={};
    for (const [name,sig] of Object.entries(HOST_IMPORTS))
      this.imports[name]={index:this.m.importFunc("env",name,sig.params,sig.results),sig};
    const defined=new Set(this.program.decls.filter(d=>d.kind==="FuncDecl" && d.body).map(d=>d.name));
    const prototypes=this.program.decls.filter(d=>d.kind==="FuncDecl" && !d.body).map(d=>d.name);
    for (const name of [...Names(expr?[expr]:this.program.items),...prototypes,"Print","PutChars",FLOAT_MUL_I64]) {
      const fn=jit.functions.get(name);
      if (!fn || defined.has(name) || this.functions.has(name)) continue;
      const sig=this.wasmSig(fn.params,fn.retType,fn.isVarArgs);
      this.functions.set(name,{name,isImport:true,index:this.m.importFunc("fn",name,sig.params,sig.results),
        params:fn.params,retType:fn.retType,isVarArgs:fn.isVarArgs});
    }
    this.spGlobal=this.m.importGlobal("env","__sp",VT.i64,true);
    this.coreGlobal=this.m.importGlobal("env","__core",VT.i64,true);
    this.excGlobal=this.m.importGlobal("env","__exception",VT.i64,true);
    const limit=jit.stackLimit?this.m.importGlobal("env","__stack_limit",VT.i64,true):null;
    this.m.importTable("env","__functions",0);
    this.exceptionTagIndex=this.m.importTag("env","__exception_tag",[VT.i64]);
    for (const [name,g] of jit.globals) this.globals.set(name,g);
    //A declaration makes new storage; an extern one names what is there.
    for (const d of this.program.decls)
      for (const v of d.kind==="VarDecl"?[d]:d.kind==="ClassDecl"?d.vars??[]:[])
        if (!v.storage?.some(s=>s==="extern" || s==="_extern")) this.globals.delete(v.name);
    this.collectClasses();
    this.collectConsts();
    Object.assign(this.constEnv,jit.constEnv);
    this.collectGlobals();
    this.collectStatics();
    this.collectInitializers();
    this.collectFunctions();
    this.mainFn=this.m.func([],[VT.i64],"__main");
    const own=[...this.functions.values()].filter(fn=>fn.slot && !fn.isImport && !fn.isAlias);
    for (const fn of own) {
      if (fn.node?.body) this.genFunctionBody(fn);
      else this.genStubBody(fn);
      const address=jit.addresses.get(fn.name);
      if (fn.node?.body && address!==undefined && jit.functions.get(fn.name)?.defined===false)
        this.m.addElement(address,[this.tableEntry(fn.index)]);
    }
    if (expr) {
      const ctx=new FnCtx(this,{name:"__main",params:[],retType:T.I64,node:{body:null}});
      const type=this.resolveType(ctx.genExpr(expr));
      if (isFloat(type)) ctx.f.op("i64_reinterpret_f64");
      else if (isVoid(type)) ctx.f.i64_const(0);
      this.mainFn.setBody(ctx.localDecls(),ctx.f);
      this.exprType=type;
    } else this.genMain();
    const live=new Set(),visit=index=>{
      if (live.has(index)) return;
      live.add(index);
      for (const callee of this.m.funcs[index-this.m.importFuncs.length]?.body.references??[])
        visit(callee);
    };
    visit(this.mainFn.index);
    for (const fn of own) visit(fn.index);
    for (const element of this.m.elements) element.funcIndices.forEach(visit);
    for (const d of this.data) {
      if (d.addr===undefined) d.addr=this.alloc(d.bytes.length,1);
      this.m.addData(d.addr,d.bytes);
    }
    for (const index of live)
      this.m.funcs[index-this.m.importFuncs.length]?.body.resolveDataAddresses();
    if (limit!==null) {
      const fault=this.imports.__task_stack_fail.index;
      for (const slot of this.m.funcs)
        slot.body.guardStack(size=>new Func().global_get(this.spGlobal)
          .global_get(limit).i64_const(size).op("i64_add").op("i64_lt_u")
          .if_().call(fault).unreachable().end());
      live.add(fault);
    }
    this.m.exportFunc("__main",this.mainFn.index);
    const functions=new Map();
    for (const fn of own) {
      this.m.exportFunc(fn.name,fn.slot.index);
      functions.set(fn.name,{params:fn.params,retType:fn.retType,isVarArgs:fn.isVarArgs,
        exportName:fn.name,defined:!!fn.node?.body});
    }
    this.m.linkFunctions(live);
    const classes=this.program.decls.filter(d=>d.kind==="ClassDecl");
    return {bytes:this.m.emit(),type:this.exprType,warnings:this.warnings,
      symbols:{globals:this.globals,constEnv:this.constEnv,functions,classes}};
  }

  exceptionTag() {
    if (this.exceptionTagIndex===undefined) {
      this.exceptionTagIndex=this.m.addTag([VT.i64]);
      this.m.exportTag("__exception_tag",this.exceptionTagIndex);
    }
    return this.exceptionTagIndex;
  }

  //V5.03 calls a function pointer with the args its type gives and reads RAX
  //after: Call on a U0 function, JobQue's I64 (*)(U8 *) on U0 MPUpdateWin. A
  //wasm call_indirect traps unless the types match, so the table holds each
  //function at one type for its count of args: each an I64, giving an I64.
  tableSig(sig) {
    return {params:sig.params.map(()=>VT.i64),results:[VT.i64]};
  }
  tableEntry(index) {
    const fn=[...this.functions.values()].find(fn=>fn.index===index);
    const sig=this.wasmSig(fn.params,fn.retType,fn.isVarArgs),table=this.tableSig(sig);
    if (JSON.stringify(sig)===JSON.stringify(table)) return index;
    this.tableThunks??=new Map();
    if (!this.tableThunks.has(index)) {
      const slot=this.m.func(table.params,table.results,"@"+fn.name),f=new Func();
      sig.params.forEach((vt,i)=>{f.local_get(i);if (vt===VT.f64) f.op("f64_reinterpret_i64");});
      f.call(index);
      if (!sig.results.length) f.i64_const(0);
      else if (sig.results[0]===VT.f64) f.op("i64_reinterpret_f64");
      slot.setBody([],f);
      this.tableThunks.set(index,slot.index);
    }
    return this.tableThunks.get(index);
  }

  functionAddress(fn) {
    if (this.jit) {
      let address=this.jit.addresses.get(fn.name);
      if (address===undefined) {
        address=this.jit.reserve(fn.name);
        this.m.addElement(address,[this.tableEntry(fn.index)]);
      }
      return address;
    }
    if (!this.functionAddresses.has(fn.index))
      this.functionAddresses.set(fn.index,this.functionAddresses.size+1);
    return this.functionAddresses.get(fn.index);
  }

  // ============================================================ classes
  collectClasses() {
    const add=node=>{
      if (node.kind!=="ClassDecl") return;
      if (node.name) this.classes.set(node.name,node);
      for (const child of node.nestedClasses??[]) add(child);
    };
    [...this.program.classes??[],...this.program.decls].forEach(add);
    const names=new Map(),active=new Set();
    const members=name=>{
      if (names.has(name)) return names.get(name);
      if (active.has(name)) throw new CodegenError("Recursive class inheritance: "+name);
      active.add(name);
      const node=this.classes.get(name),result=new Set(node?.base?members(node.base):[]);
      for (const member of node?.members??[])
        for (const field of member.anonymous?members(member.type.name):[member.name]) {
          if (result.has(field) && !REPEATED_MEMBERS.has(field))
            throw new CodegenError(`Duplicate member: ${name}.${field}`);
          result.add(field);
        }
      active.delete(name);names.set(name,result);return result;
    };
    for (const name of this.classes.keys()) members(name);
  }

  layoutClass(name) {
    if (this.classLayouts.has(name)) return this.classLayouts.get(name);
    const node = this.classes.get(name);
    if (!node) throw new CodegenError("unknown class " + name);
    const fields = new Map();
    const own=new Set();
    const addField=(member,field)=>{
      if (!own.has(member)) fields.set(member,field);
      own.add(member);
    };
    let off = 0, maxSize = 0;
    // base class members first
    if (node.base && this.classes.has(node.base)) {
      const base = this.layoutClass(node.base);
      for (const [fn, fi] of base.fields) fields.set(fn, { ...fi });
      off = base.size;
    }
    // mark as in-progress to allow self-referential pointers
    this.classLayouts.set(name, { size: 0, align: 1, fields, incomplete: true });
    for (const mem of node.members) {
      //V5.03 PrsVar.HC: $ in a member is the class's size so far.
      Walk([mem.type],n=>{if (n.kind==="ClassOffset") {n.kind="IntLit";n.value=BigInt(node.isUnion?0:off);}});
      let ty = this.resolveType(mem.type);
      if (ty && ty.kind === "class" && !this.classes.has(ty.name)) {
        if (this.lenient) { this.warn(`unknown class '${ty.name}' as member ${name}.${mem.name}; treated as I64`); ty = T.I64; }
        else throw new CodegenError(`class ${name}: member '${mem.name}' has unknown class type '${ty.name}'`);
      }
      const sz = this.typeSize(ty);
      const offset=node.isUnion?(mem.anonymous?maxSize:0):off;
      if (mem.anonymous) {
        for (const [name,field] of this.layoutClass(ty.name).fields)
          addField(name,{...field,offset:offset+field.offset});
      } else addField(mem.name,{type:ty,offset});
      if (node.isUnion) {
        maxSize = Math.max(maxSize,offset+sz);
      } else {
        off += sz;
      }
    }
    // V5.03 packs members (Compiler/PrsVar.HC), including a class's tail.
    const layout = { size: node.isUnion ? maxSize : off, align: 1, fields, incomplete: false };
    if (node.scalarBase && layout.size!==sizeof(this.resolveType(node.scalarBase))) {
      const message="Scalar class "+name+" has a different layout and storage width";
      if (!this.lenient) throw new CodegenError(message+"; not yet supported");
      this.warn(message);
    }
    this.classLayouts.set(name, layout);
    return layout;
  }

  // Resolve classref types to {kind:'class', name} but keep pointers shallow.
  resolveType(t,locals) {
    if (!t) return T.I64;
    switch (t.kind) {
      case "classref": {
        const base=this.classes.get(t.name)?.scalarBase;
        return base?{...this.resolveType(base),name:t.name}:{kind:"class",name:t.name};
      }
      case "ptr": return ptrTo(this.resolveType(t.to,locals));
      case "funcptr": return funcPtr(this.resolveType(t.retType),
        t.params.map(p=>({...p,type:this.resolveType(p.type)})),t.isVarArgs);
      case "array": {
        const of = this.resolveType(t.of,locals);
        let count;
        try { count = t.count == null ? 0 : foldDim(t.count,this.constEnv,node=>this.layoutQuery(node,locals)); }
        catch (e) {
          //V5.03 runs a dimension's expression when it compiles the declaration.
          if (this.jit) {
            count=this.jit.dimension(t.count);
            t.count={kind:"IntLit",value:BigInt(count),line:t.count.line,filename:t.count.filename};
          } else if (this.lenient) { count = 1; this.warn("non-constant array dimension; assumed [1]"); } else throw e;
        }
        return arrayOf(of, count);
      }
      case "ClassDecl": return { kind: "class", name: t.name || ("__anon" + (t.line || 0)) };
      default: return t;
    }
  }

  typeSize(t) {
    t = this.resolveType(t);
    if (isClass(t)) {
      if (!this.classes.has(t.name)) return 8; // opaque/forward class -> one word
      return this.layoutClass(t.name).size;
    }
    if (t.kind === "array") { const c = Number.isFinite(t.count) ? t.count : 1; return this.typeSize(t.of) * c; }
    const s = sizeof(t);
    return Number.isFinite(s) ? s : 8;
  }
  typeAlign(t) {
    t = this.resolveType(t);
    if (isClass(t)) return this.layoutClass(t.name).align;
    if (t.kind === "array") return this.typeAlign(t.of);
    if (isFloat(t)) return 8;
    return Math.min(sizeof(t), 8);
  }
  classField(classType, name) {
    const layout = this.layoutClass(classType.name);
    let f = layout.fields.get(name);
    if (!f) {
      if (this.lenient) {
        // Unknown field: synthesize one at the end so reads/writes are valid and
        // don't collide with real fields. Grows the layout.
        this.warnOnceCg(`class ${classType.name} has no field '${name}'; synthesized`);
        const off = align8(layout.size, 8);
        f = { type: T.I64, offset: off, synthetic: true };
        layout.fields.set(name, f);
        layout.size = off + 8;
      } else {
        throw new CodegenError(`class ${classType.name} has no field '${name}'`);
      }
    }
    return f;
  }
  warnOnceCg(msg) { if (!this._cgWarned) this._cgWarned = new Set(); if (!this._cgWarned.has(msg)) { this._cgWarned.add(msg); this.warn(msg); } }

  // ============================================================ consts
  collectConsts() {
    // numeric-constant globals declared with simple constant initializers can
    // act as enum-ish constants for array dims. Also color names.
    for (const [k, v] of Object.entries(COLOR_NAMES)) this.constEnv[k] = BigInt(v);
    this.constEnv["GR_WIDTH"] = BigInt(GR_WIDTH);
    this.constEnv["GR_HEIGHT"] = BigInt(GR_HEIGHT);
  }

  layoutQuery(node,locals) {
    if ((node.globalType || !locals?.has(node.name)) &&
        this.globals.get(node.name)?.kind==="exportedAddress")
      this.errAt(node,"Size not defined: "+node.name);
    let type=node.globalType || locals?.get(node.name)?.type || this.globals.get(node.name)?.type ||
      BASE_TYPES[node.name] ||
      (this.classes.has(node.className??node.name)?{kind:"classref",name:node.className??node.name}:null);
    if (!type) throw new CodegenError(`${node.filename}:${node.line}: Invalid class or variable in ${node.kind}: ${node.name}`);
    type=this.resolveType(type,locals);
    let offset=0;
    for (const name of node.fields) {
      while (isArray(type)) type=this.resolveType(type.of,locals);
      if (!type.name || !this.classes.has(type.name))
        throw new CodegenError(`${node.filename}:${node.line}: Invalid member '${name}' in ${node.kind}`);
      const field=this.layoutClass(type.name).fields.get(name);
      if (!field) throw new CodegenError(`${node.filename}:${node.line}: Invalid member '${name}' in ${node.kind}`);
      offset+=field.offset;
      type=field.type;
    }
    return node.kind==="Offset"?offset:node.stars?8:this.typeSize(type);
  }

  fold(node,locals,env=this.constEnv) {
    return foldConstInt(node,env,query=>this.layoutQuery(query,locals));
  }

  // ============================================================ globals
  collectGlobals() {
    for (const d of this.program.decls) {
      if (d.kind === "VarDecl") this.declareGlobal(d);
      if (d.kind === "ClassDecl" && d.vars) for (const v of d.vars) this.declareGlobal(v);
    }
  }
  collectStatics() {
    let index=0;
    const children=node=>Object.entries(node).filter(([key])=>
      !["type","globalType","functionType","retType"].includes(key))
      .flatMap(([,value])=>Array.isArray(value)?value:value?.kind?[value]:[]);
    const hasStatic=node=>node && typeof node==="object" &&
      (node.kind==="VarDecl" && node.storage?.includes("static") || children(node).some(hasStatic));
    for (const fn of this.program.decls) {
      if (fn.kind!=="FuncDecl" || !hasStatic(fn.body)) continue;
      const scope=new Map(fn.params.filter(p=>p.name).map(p=>
        [p.name,{kind:"unavailable",type:this.resolveType(p.type)}]));
      if (fn.isVarArgs) {
        scope.set("argc",{kind:"unavailable",type:T.I64});
        scope.set("argv",{kind:"unavailable",type:arrayOf(T.I64,127)});
      }
      const walk=node=>{
        if (!node || typeof node!=="object") return;
        if (node.kind==="DeclStmt") {
          for (const d of node.decls) {
            const type=this.resolveType(d.type,scope);
            if (d.storage?.includes("static")) {
              const name="#static:"+index++;
              const global={addr:this.alloc(Math.max(8,align8(this.typeSize(type),8)),8),
                type,init:d.init,node:{...d,name,type,internal:true}};
              this.globals.set(name,global);
              const entry={kind:"static",name,type,global,registerHint:"none"};
              scope.set(d.name,entry);
              global.initScope=new Map(scope);
              this.staticLocals.set(d,entry);
            } else scope.set(d.name,{kind:"unavailable",type});
          }
          return;
        }
        children(node).forEach(walk);
      };
      walk(fn.body);
    }
  }
  collectInitializers() {
    const constant=node=>{
      if (!node) return true;
      if (["IntLit","CharLit","FloatLit","StrLit","BinLit","LastClass"].includes(node.kind))
        return true;
      if (node.kind==="Unary") return !["++","--"].includes(node.op) && constant(node.operand);
      if (node.kind==="Cast") return constant(node.operand);
      if (["Binary","Logical"].includes(node.kind)) return constant(node.left) && constant(node.right);
      if (node.kind==="Chain") return node.operands.every(constant);
      return false;
    };
    //The prelude's globals initialize before the hooks (DirHostInit builds on
    //dir_host_*), its statements at boot after them; only the program's defer.
    let index=0,deferred=false,prelude=true;
    const statements=new Set(this.program.topStmts),externs=new Set();
    for (const item of this.program.items) {
      if (prelude && !["<prelude>","<compiler>"].includes(item.filename)) {prelude=false;deferred=!!this.jit;}
      if (statements.has(item)) {if (!prelude) deferred=true;continue;}
      const names=[],seen=new Set();
      const walk=node=>{
        if (!node || typeof node!=="object" || seen.has(node)) return;
        seen.add(node);
        for (const [key,value] of Object.entries(node)) {
          if (key==="functionType") continue;
          if (key==="params") for (const param of value) {
            walk(param.type);
            if (!param.default || constant(param.default)) continue;
            const name="#default:"+index++,init=param.default;
            this.declareGlobal({kind:"VarDecl",name,type:param.type,init,
              filename:item.filename,line:init.line,internal:true,defaultCapture:true});
            names.push(name);
            this.defaultValues.set(init,{kind:"Ident",name,filename:init.filename,line:init.line});
          } else if (Array.isArray(value)) value.forEach(walk);
          else if (value && typeof value==="object") walk(value);
        }
        const local=this.staticLocals.get(node);
        if (local) names.push(local.name);
      };
      walk(item);
      const globals=item.kind==="VarDecl"?[item]:item.vars||[];
      for (const node of globals) {
        if (this.globals.get(node.name)?.node===node) names.push(node.name);
        if (node.storage?.some(s=>s==="extern" || s==="_extern")) externs.add(node.name);
      }
      //Only code that named the global by an extern before it can see it before its
      //initializer runs; otherwise its constant data can be there from the start.
      for (const name of names) Object.assign(this.globals.get(name),{deferred,seenEarly:externs.has(name)});
      this.declarationInitializers.set(item,names);
    }
  }
  declareGlobal(d) {
    if (d.forwardGlobal || this.globals.has(d.name)) return;
    const ty = this.resolveType(d.type);
    const {storage,offset}=this.runtimeAddresses.get(d.name)??{};
    if (storage) {
      const backing=this.globals.get(storage);
      if (!backing || d.filename!=="<prelude>" || d.init)
        this.errAt(d,"Invalid runtime address binding: "+d.name);
      //A label at an offset in its storage is a typed global there (V5.03's
      //_extern SYS_PROGRESS1 I64 progress1); a bare label is only its address.
      if (offset!==undefined) this.globals.set(d.name,{addr:backing.addr+offset,type:ty,init:null,node:d,storage});
      else this.globals.set(d.name,{kind:"exportedAddress",addr:backing.addr,
        type:ty,init:null,node:d,storage});
      return;
    }
    let addr;
    const runtimeName=d.sourceName??d.name;
    if (d.storage?.some(s=>s==="extern" || s==="_extern")) addr=0;
    else if (d.filename==="<prelude>" && runtimeName in PINNED_GLOBALS) addr=PINNED_GLOBALS[runtimeName];
    else addr = this.alloc(this.typeSize(ty), this.typeAlign(ty));
    this.globals.set(d.name, { addr, type: ty, init: d.init, node: d });
    // record simple integer constant for const-folding of later dims
    const c = d.init && this.fold(d.init);
    if (c != null) this.constEnv[d.name] = c;
  }

  // Emit a constant integer-array global (sprite/bitmap data, lookup tables) as a
  // single wasm DATA SEGMENT at the global's address, instead of thousands of
  // per-element stores in __rt_init. Returns true if handled; returns false (so
  // the caller falls back to runtime stores) for float arrays, nested lists, or
  // any non-constant element. wasm memory is zero-initialized, so a partial
  // initializer leaves the remainder 0, matching C semantics.
  tryStaticConstArray(g,owner) {
    const ty = this.resolveType(g.type);
    if (!isArray(ty)) return false;
    const et = this.resolveType(ty.of);
    if (!isInt(et)) return false;
    const esz = this.typeSize(et);
    if (esz !== 1 && esz !== 2 && esz !== 4 && esz !== 8) return false;
    const init = g.init;
    if (!init || init.kind !== "InitList") return false;
    const cap = this.typeSize(ty);                  // reserved bytes for this global
    const bytes = [];
    for (const el of init.elements) {
      if (el.kind === "InitList") return false;      // nested aggregate: fall back
      const c = this.fold(el,undefined,{});
      if (c == null) return false;                   // non-constant element: fall back
      let v = BigInt.asUintN(64, c);
      for (let b = 0; b < esz; b++) { bytes.push(Number(v & 0xffn)); v >>= 8n; }
    }
    if (bytes.length > cap) bytes.length = cap;       // never write past the global
    this.data.push({addr:g.addr,bytes,owners:new Set([owner])});         // -> m.addData(addr, bytes)
    return true;
  }

  // ============================================================ functions
  collectFunctions() {
    // host intrinsics visible as callable HolyC functions
    for (const [name, info] of Object.entries(this.imports)) {
      const sig = info.sig;
      this.functions.set(name, {
        name, isImport: true, index: info.index,
        params: info.declaration?info.declaration.params.map(p=>({...p,type:this.resolveType(p.type)})):
          sig.params.map((vt) => ({ type: vt === VT.f64 ? T.F64 : T.I64 })),
        isVarArgs:info.declaration?.isVarArgs,
        retType: sig.results.length ? (sig.results[0] === VT.f64 ? T.F64 : T.I64) : T.U0,
      });
    }
    for (const d of this.program.decls) {
      if (d.kind !== "FuncDecl") continue;
      if (!d.body) {
        if (d.functionAlias) {
          const target=this.functions.get(d.functionAlias);
          if (!target) throw new CodegenError("Missing exported function: "+d.sourceName);
          const params=d.params.map(p=>({...p,type:this.resolveType(p.type)})),retType=this.resolveType(d.retType);
          const a=this.wasmSig(params,retType,d.isVarArgs),b=this.wasmSig(target.params,target.retType,target.isVarArgs);
          if (JSON.stringify(a)!==JSON.stringify(b))
            throw new CodegenError("Exported function header changes WASM ABI: "+d.sourceName);
          this.functions.set(d.name,{...target,name:d.name,isAlias:true,params,retType,isVarArgs:d.isVarArgs});
          continue;
        }
        // prototype/extern/import: register signature if not present
        if (!this.functions.has(d.name)) this.registerFuncSig(d, null);
        continue;
      }
      this.registerFuncSig(d, d);
    }
  }
  // Source-declared host imports. A body-less function declared with the `import` storage class -
  //   import U0 __present(U8 *fb, I64 w, I64 h);
  // - becomes a WASM import from "env" in strict mode: that is how a program states its own host
  // contract (HEMU/src/host.HC) instead of the compiler carrying a table for it. Lenient mode keeps
  // stubbing such prototypes (kernel code pasted into the editor must not fail to link on a stray
  // `import`). Names the runtime already imports (HOST_IMPORTS) and names that also have a body in
  // this program are left to those. Must run before any function slot is allocated: WASM numbers
  // imported functions ahead of defined ones.
  collectSourceImports() {
    if (this.lenient) return;
    const defined = new Set();
    for (const d of this.program.decls) if (d.kind === "FuncDecl" && d.body) defined.add(d.name);
    if (this.jit) return;
    for (const d of this.program.decls) {
      if (d.kind !== "FuncDecl" || d.body || !d.storage?.includes("import")) continue;
      if (this.imports[d.name] || defined.has(d.name)) continue;
      if (d.sourceName && this.imports[d.sourceName]) {
        this.imports[d.name]={...this.imports[d.sourceName],declaration:d};
        continue;
      }
      const params = d.params.map((p) => ({ type: this.resolveType(p.type), name: p.name, default: p.default, registerHint:p.registerHint }));
      const sig = this.wasmSig(params, this.resolveType(d.retType),d.isVarArgs);
      const idx = this.m.importFunc("env", d.sourceName??d.name, sig.params, sig.results);
      this.imports[d.name] = { index: idx, sig, declaration:d };
    }
  }
  registerFuncSig(d, bodyNode) {
    const params = d.params.map((p) => ({
      type: this.resolveType(p.type), name: p.name, default: p.default, registerHint:p.registerHint,
    }));
    const retType = this.resolveType(d.retType);
    const sig = this.wasmSig(params, retType,d.isVarArgs);
    let index;
    const existing = this.functions.get(d.name);
    if (existing && !existing.isImport && existing.slot) {
      index = existing.slot.index;
    } else {
      const slot = this.m.func(sig.params, sig.results, d.name);
      index = slot.index;
      this.functions.set(d.name, {
        name: d.name, isImport: false, index, slot, params, retType, isVarArgs:d.isVarArgs, node: bodyNode,
      });
      return;
    }
    if (bodyNode) {
      existing.node=bodyNode;existing.params=params;existing.retType=retType;
      existing.isVarArgs=d.isVarArgs;
    }
  }
  wasmSig(params, retType,isVarArgs=false) {
    return {
      params: [...params.map((p) => (isFloat(this.resolveType(p.type)) ? VT.f64 : VT.i64)),
        ...(isVarArgs?[VT.i64]:[])],
      results: isVoid(retType) ? [] : [isFloat(retType) ? VT.f64 : VT.i64],
    };
  }

  // ============================================================ function body
  genFunctionBody(fn) {
    const ctx = new FnCtx(this, fn);
    const f = ctx.f;
    ctx.beginFrame();
    if (fn.node.body) ctx.genStmt(fn.node.body);
    ctx.endFrameFallthrough();
    fn.slot.setBody(ctx.localDecls(), f);
  }

  // Stub body for a prototype/extern function: ignore args, return 0 (or void).
  genStubBody(fn) {
    const f = new Func();
    if ((this.opts.jitMain ?? this.jit)?.laterBodies?.has(fn.name)) {
      //V5.03 resolves a prototype when a later statement defines its body.
      const sig=this.wasmSig(fn.params,fn.retType,fn.isVarArgs),table=this.tableSig(sig);
      sig.params.forEach((vt,i)=>{f.local_get(i);if (vt===VT.f64) f.op("i64_reinterpret_f64");});
      f.i32_const(this.functionAddress(fn)).call_indirect(this.m.typeIndex(table.params,table.results));
      if (!sig.results.length) f.drop();
      else if (sig.results[0]===VT.f64) f.op("f64_reinterpret_i64");
      this.forwardStubs.add(fn.index);fn.forward=true;
      fn.slot.setBody([],f);
      return;
    }
    if (!this.lenient) {
      f.unreachable();
      fn.slot.setBody([], f);
      return;
    }
    if (!isVoid(fn.retType)) { isFloat(fn.retType) ? f.f64_const(0) : f.i64_const(0); }
    fn.slot.setBody([], f);
    this.warn(`extern/prototype '${fn.name}' has no body; stubbed (returns 0)`);
  }

  genGlobalInitializers() {
    const ctx=new FnCtx(this,{name:"__rt_init",params:[],retType:T.U0,node:{body:null}});
    for (const names of this.declarationInitializers.values())
      for (const name of names) {
        const g=this.globals.get(name);
        if (g.init==null || g.deferred) continue;
        ctx.f=new Func();
        this.adam(g.node,name,()=>ctx.genGlobalInit(g),()=>ctx.f=new Func().unreachable());
        this.globalInitializers.set(name,ctx.f);
      }
    return ctx;
  }

  //V5.03 compiles Adam once, in order, so every name in it is defined by then.
  //Here Adam is compiled with each program, so a name in Adam that does not
  //resolve fails only a program that links the code using it.
  adam(node,key,gen,stub) {
    if (node?.filename!=="<prelude>") return gen();
    try {return gen();}
    catch (error) {
      if (!(error instanceof CodegenError)) throw error;
      this.unresolved.set(key,error);stub();
    }
  }

  preludeFile(line) {//The index of the Adam file holding this prelude line.
    const starts=this.opts.preludeFiles??[];
    let lo=0,hi=starts.length-1;
    while (lo<hi) {
      const mid=(lo+hi+1)>>1;
      if (starts[mid]<=line) lo=mid;
      else hi=mid-1;
    }
    return lo;
  }

  reachable({own=false,strings=false}={}) {
    const functions=new Set(),globals=new Set(),fields=new Set(),bodies=new Set(),hooks=new Set();
    const interfaces=new Set(),exports=new Set(),named=new Set(),scanned=new Set(),words=new Set();
    const writeOnly=new Map(),byIndex=new Map([...this.functions.values()].map(fn=>[fn.index,fn]));
    const trusted=(index,seen=new Set())=>{
      if (seen.has(index)) return true;
      seen.add(index);
      const fn=byIndex.get(index),body=this.m.funcs[index-this.m.importFuncs.length]?.body;
      return fn?.node?.filename==="<prelude>" && body && !body.indirectCalls &&
        [...body.references].every(callee=>trusted(callee,seen));
    };
    for (const hook of this.opts.runtimeInitializers || []) {
      const fn=this.functions.get(hook.name);
      if (fn && hook.writeOnlyGlobals?.length && trusted(fn.index))
        writeOnly.set(fn.index,new Set(hook.writeOnlyGlobals));
    }
    const visitBody=(body,initialized)=>{
      if (!body || bodies.has(body)) return;
      bodies.add(body);
      for (const index of body.references) visitFunction(index);
      for (const name of body.globalUses || []) visitGlobal(name);
      // A trusted initializer's direct writes need no prior field contents.
      // Callee dependencies and all ordinary caller escapes remain visible.
      for (const name of body.fieldUses || [])
        if (!initialized?.has(name.split('.')[0])) fields.add(name);
    };
    //The files of Adam this program reaches, as V5.03 loads them.
    const files=new Set(),fileOf=node=>node?.filename==="<prelude>"?this.preludeFile(node.line):undefined;
    const visitFunction=index=>{
      if (functions.has(index)) return;
      functions.add(index);
      files.add(fileOf(byIndex.get(index)?.node));
      visitBody(this.m.funcs[index-this.m.importFuncs.length]?.body,writeOnly.get(index));
    };
    const visitGlobal=name=>{
      if (globals.has(name)) return;
      globals.add(name);
      files.add(fileOf(this.globals.get(name)?.node));
      const storage=this.globals.get(name)?.storage;
      if (storage) visitGlobal(storage);
      visitBody(this.globalInitializers.get(name));
    };
    visitFunction(this.mainFn.index);
    visitFunction(this.rtInit.index);
    for (const name of [...this.opts.exports || [],...this.jitExports || []]) {
      const fn=this.functions.get(name);
      if (fn) visitFunction(fn.index);
    }
    // A later part of the program reads these globals and fields.
    const later=this.opts.jitMain?.names??new Set();
    for (const name of later) if (this.globals.has(name)) visitGlobal(name);
    // User globals are observable through the returned address map, and their
    // initializers may have side effects even when no function reads the value.
    for (const [name,g] of this.globals)
      if (g.node?.filename!=="<prelude>") visitGlobal(name);
    const Word=word=>{
      if (words.has(word)) return false;
      words.add(word);
      const fn=strings && this.functions.get(word);
      if (fn?.slot && !this.unresolved.has(fn.index)) {named.add(word);visitFunction(fn.index);}
      return true;
    };
    for (const word of this.opts.jitMain?.words??[]) Word(word);
    let changed=true;
    while (changed) {
      changed=false;
      for (const api of this.opts.runtimeInterfaces || []) {
        if (interfaces.has(api) ||
            !(api.imports||[]).some(name=>functions.has(this.imports[name]?.index)) &&
            !(api.globals||[]).some(name=>globals.has(name))) continue;
        interfaces.add(api);
        for (const name of [api.check,...own?[]:api.exports]) {
          const fn=this.functions.get(name);
          if (!fn) throw new CodegenError("Missing runtime interface: "+name);
          visitFunction(fn.index);
        }
        for (const name of api.exports) exports.add(name);
        changed=true;
      }
      for (const hook of this.opts.runtimeInitializers || []) {
        if (hooks.has(hook.name)) continue;
        if (!hook.always && !(hook.globals||[]).some(name=>globals.has(name)) &&
            !(hook.fields||[]).some(name=>fields.has(name) || fields.has(name.split('.')[0]+'.*') ||
              later.has(name.slice(name.lastIndexOf('.')))))
          continue;
        const fn=this.functions.get(hook.name);
        if (!fn) throw new CodegenError("Missing runtime initializer: "+hook.name);
        hooks.add(hook.name);
        visitFunction(fn.index);
        for (const name of own?[]:hook.exports || []) {
          const exported=this.functions.get(name);
          if (!exported) throw new CodegenError("Missing runtime initializer export: "+name);
          visitFunction(exported.index);exports.add(name);
        }
        changed=true;
      }
      //A prelude statement runs when the program has its file, uses what it
      //sets or names what it makes (a string of its that is one name).
      for (const stmt of this.boot) {
        if (functions.has(stmt.index) || !files.has(stmt.file) &&
            ![...stmt.uses].some(name=>globals.has(name)) && ![...stmt.names].some(name=>words.has(name)) &&
            !stmt.fields.some(name=>fields.has(name) || later.has(name.slice(name.lastIndexOf('.')))))
          continue;
        visitFunction(stmt.index);
        changed=true;
      }
      //A name in a string is reached: text the program compiles can call it
      //(ExePrint), and a define list is found by its name (DefineSub).
      for (const d of this.data) {
        if (!d.str || scanned.has(d) || ![...d.owners].some(owner=>bodies.has(owner))) continue;
        scanned.add(d);
        const text=String.fromCharCode(...d.bytes.slice(0,4096));
        for (const word of text.match(/[A-Za-z_][A-Za-z0-9_]*/g)??[]) changed=Word(word)||changed;
      }
    }
    return {functions,globals,fields,bodies,hooks,interfaces,exports,named};
  }

  //A prelude statement that only stores a number or a function's address in a
  //field of a global, as GrComposites.HC's gr.fp_draw_ms=&DrawStdMs;, is for
  //the code that reads that field: its keys are the field and the whole global.
  fieldStore(item) {
    const e=item.kind==="ExprStmt"?item.expr:null;
    if (e?.kind!=="Assign" || e.op!=="=" || e.target.kind!=="Member") return;
    let root=e.target,first;
    while (root.kind==="Member" && !root.arrow) {first=root.name;root=root.base;}
    const g=root.kind==="Ident"?this.globals.get(root.name):null,cls=g&&this.resolveType(g.type),v=e.value;
    if (!g || g.node?.filename!=="<prelude>" || !isClass(cls) || root===e.target) return;
    if (!["IntLit","FloatLit","CharLit"].includes(v.kind) && !(v.kind==="Unary" && v.op==="&" &&
        v.operand.kind==="Ident" && this.functions.has(v.operand.name))) return;
    return [cls.name+'.'+first,root.name+'.*'];
  }

  genRtInit(ctx,linked) {
    const f=ctx.f=new Func();
    const initializers=[...this.globalInitializers].filter(([name])=>linked.globals.has(name));
    const boot=this.boot.filter(stmt=>linked.functions.has(stmt.index));
    if (linked.hooks.size || initializers.length || boot.length || linked.interfaces.size || this.rtGuard!==undefined) {
      const guard=this.rtGuard??=this.alloc(8,8),fault=this.imports.__rt_init_failed.index;
      const state=()=>f.i64_const(guard).op("i32_wrap_i64");
      state().load("i64_load",0,3).i64_const(2).op("i64_ne").if_();
      state().load("i64_load",0,3).op("i64_eqz").op("i32_eqz").if_();
      f.call(fault).unreachable().end();
      state().i64_const(1).store("i64_store",0,3);
      // Failed or reentered initialization remains poisoned. Repeating side
      // effects or continuing into main with partial globals is not safe.
      for (const [name,body] of initializers)
        if (this.globals.get(name).node?.filename==="<prelude>" &&
            !this.globals.get(name).node.defaultCapture) f.append(body);
      for (const hook of this.opts.runtimeInitializers || [])
        if (linked.hooks.has(hook.name)) f.call(this.functions.get(hook.name).index);
      //The prelude's statements this program reaches, as V5.03 runs them at boot.
      for (const stmt of boot) f.call(stmt.index);
      //A task host owns what the boot made to the instance, not to a session.
      if (linked.interfaces.size) {
        f.call(this.imports.__rt_booted.index);linked.functions.add(this.imports.__rt_booted.index);
      }
      for (const [name,body] of initializers)
        if (this.globals.get(name).node?.filename!=="<prelude>" ||
            this.globals.get(name).node.defaultCapture) f.append(body);
      state().i64_const(2).store("i64_store",0,3);
      f.end();
      linked.functions.add(fault);
    }
    ctx.endFrameFallthrough();
    this.rtInit.setBody(ctx.localDecls(),f);
  }

  genMain() {
    const stmts=[],boot=[],statements=new Set(this.program.topStmts);
    for (const item of this.program.items) {
      //The prelude's statements run once, in __rt_init, as V5.03 runs them at
      //boot. A host that calls __main every frame (HEMU) reruns only the program's.
      const to=item.filename==="<prelude>"?boot:stmts;
      if (statements.has(item)) to.push(item);
      else {
        const names=(this.declarationInitializers.get(item)||[])
          .filter(name=>this.globals.get(name).deferred && this.globals.get(name).init!=null);
        //__rt_init's own guard covers the boot's.
        if (names.length) to.push({kind:"GlobalInit",names,boot:to===boot});
      }
    }
    const block=list=>({kind:"Block",stmts:this.jit?list.map(s=>s.kind==="ExprStmt"?
      {...s,kind:"Result"}:s):list});
    //Each prelude statement is its own function, linked by reachable().
    for (const item of this.boot?boot:[]) {
      const bootBlock=block([item]),bootCtx=new FnCtx(this,{name:"__boot",params:[],retType:T.U0,node:{body:bootBlock}});
      const fn=this.m.func([],[]),node=item.kind==="GlobalInit"?this.globals.get(item.names[0]).node:item;
      this.adam({filename:"<prelude>"},fn.index,()=>{
        bootCtx.beginFrame();bootCtx.genStmt(bootBlock);bootCtx.endFrameFallthrough();
        fn.setBody(bootCtx.localDecls(),bootCtx.f);
      },()=>{bootCtx.f=new Func().unreachable();fn.setBody([],bootCtx.f);});
      const names=new Set(this.data.filter(d=>d.str && d.owners.has(bootCtx.f))
        .map(d=>String.fromCharCode(...d.bytes.slice(0,-1))).filter(text=>/^[A-Za-z_]\w*$/.test(text)));
      const store=this.fieldStore(item);
      this.boot.push({item,index:fn.index,file:this.preludeFile(node.line),
        uses:store?new Set():bootCtx.f.globalUses??new Set(),names,fields:store??[]});
    }
    const bodyBlock = block(stmts);
    const fakeFn = { name: "__main", params: [], retType: T.U0, node: { body: bodyBlock } };
    const ctx = new FnCtx(this, fakeFn);
    const f = ctx.f;
    if (this.jit) ctx.result=ctx.newWLocal(VT.i64);
    else f.call(this.rtInit.index);
    ctx.beginFrame();
    ctx.genStmt(bodyBlock);
    //The next part of the program compiles once this one has run.
    const next=(this.opts.jitMain ?? this.jit)?.next;
    if (next) f.i64_const(next).call(this.imports.__jit_rest.index);
    ctx.endFrameFallthrough();
    if (this.jit) f.local_get(ctx.result);
    this.mainFn.setBody(ctx.localDecls(), f);
  }
}

function align8(n, a = 8) { return Math.ceil(n / a) * a; }

// ============================================================ per-function ctx
class FnCtx {
  constructor(cg, fn) {
    this.cg = cg;
    this.fn = fn;
    this.f = new Func();
    this.ctrl = [];                 // structured-control markers (for branch depth)
    this.loops = [];                // {brk, cont}
    this.locals = new Map();        // name -> descriptor
    this.wlocalTypes = [];          // extra wasm local valtypes (beyond params)
    this.frameSize = 0;
    this.scratch = {};              // cached scratch local indices
    this.noZeroCompare = new WeakSet();
    this.paramCount = fn.params.length+(fn.isVarArgs?1:0);

    // params occupy wasm locals 0..n-1
    this.nextWLocal = this.paramCount;

    // analyze + assign storage
    this.addrTaken = new Set();
    if (fn.node && fn.node.body) this.findAddrTaken(fn.node.body, this.addrTaken);
    this.assignParams();
    if (fn.node && fn.node.body) this.collectLocals(fn.node.body);
    const narrowCasts=new Set();
    let carry=false;
    const casts=n=>{
      if (!n || typeof n!=="object") return;
      if (n.kind==="Ident" && n.name==="Carry") carry=true;
      if (n.kind==="Cast" && n.postfix && n.operand.kind==="Ident") {
        const d=this.localBinding(n.operand),type=this.cg.resolveType(n.type);
        if (d && isInt(type) && type.bits<this.cg.typeSize(d.type)*8)
          narrowCasts.add(n.operand.name);
      }
      for (const [key,value] of Object.entries(n)) {
        if (["type","retType","globalType","functionType"].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(casts);
        else if (value && typeof value==="object" && value.kind) casts(value);
      }
    };
    casts(fn.node?.body);
    //V5.03 KernelB.HH IC_CARRY reads the CPU's carry flag. A function that
    //reads it keeps CF in a local: the add, subtract, shift, compare or
    //logic op it ran last sets it as the x86 instruction V5.03 emits does.
    if (carry && !this.cg.functions.get("Carry")?.node?.body)
      this.carry={cf:this.newWLocal(VT.i64),a:this.newWLocal(VT.i64),b:this.newWLocal(VT.i64)};
    const registers=nativeRegisters(fn,this.locals,this.addrTaken,n=>this.cg.fold(n,this.locals));
    for (const {name,d,reg} of registers) {
      d.nativeReg=reg>=0 && reg<16;
      if (d.kind==="local") {
        const memory=isAggregate(d.type) || this.addrTaken.has(name) ||
          !d.nativeReg && (isInt(d.type) && d.type.bits<64 ||
            d.registerHint==="none" || narrowCasts.has(name));
        if (memory) {
          d.kind="slot";
          d.offset=this.allocSlot(this.cg.typeSize(d.type),this.cg.typeAlign(d.type));
        } else {
          d.kind="wlocal";
          d.windex=this.newWLocal(wasmValType(d.type));
        }
      } else if (!d.nativeReg && d.kind==="wlocal" &&
          (isInt(d.type) && d.type.bits<64 ||
            d.registerHint==="none" || narrowCasts.has(name))) {
        d.paramIndex=d.windex;
        d.kind="slot";
        d.offset=this.allocSlot(this.cg.typeSize(d.type),this.cg.typeAlign(d.type));
      }
    }
    if (fn.node && this.cg.localRegisters)
      this.cg.localRegisters.set(fn.name,registers.map(({name,reg})=>({name,reg})));
    this.gotos = fn.node && fn.node.body && usesGoto(fn.node.body) ? new Gotos(this, fn.node.body, fn.name === "__main") : null;
  }

  // ---- diagnostics ----
  err(node, msg) {
    const e=new CodegenError(`${node?.filename??"<source>"}:${node?.line}: ${msg}`);
    if (node?.filename) Object.assign(e,{filename:node.filename,line:node.line,col:node.col});
    throw e;
  }

  // ---- wasm locals ----
  newWLocal(vt) { const idx = this.nextWLocal++; this.wlocalTypes.push(vt); return idx; }
  scratchI32() { return this.scratch.i32 ??= this.newWLocal(VT.i32); }
  scratchI64() { return this.scratch.i64 ??= this.newWLocal(VT.i64); }
  scratchF64() { return this.scratch.f64 ??= this.newWLocal(VT.f64); }
  fpLocal() { return this.scratch.fp ??= this.newWLocal(VT.i64); }

  localDecls() {
    // collapse consecutive equal valtypes
    const out = [];
    for (const vt of this.wlocalTypes) {
      if (out.length && out[out.length - 1].vt === vt) out[out.length - 1].count++;
      else out.push({ count: 1, vt });
    }
    return out;
  }

  // ---- storage assignment ----
  assignParams() {
    this.fn.params.forEach((p, i) => {
      if (!p.name) return;
      const ty = this.cg.resolveType(p.type);
      if (isAggregate(ty)) {
        this.locals.set(p.name, { kind: "reflocal", windex: i, type: ty,registerHint:p.registerHint });
      } else if (this.addrTaken.has(p.name)) {
        const off = this.allocSlot(this.cg.typeSize(ty), this.cg.typeAlign(ty));
        this.locals.set(p.name, { kind: "slot", offset: off, type: ty, paramIndex: i,registerHint:p.registerHint });
      } else {
        this.locals.set(p.name, { kind: "wlocal", windex: i, type: ty,registerHint:p.registerHint });
      }
    });
    if (this.fn.isVarArgs) {
      const windex=this.fn.params.length;
      this.locals.set("argc",{kind:"refslot",windex,offset:0,type:T.I64});
      this.locals.set("argv",{kind:"refslot",windex,offset:8,type:arrayOf(T.I64,127)});
    }
  }
  allocSlot(size, align) {
    this.frameSize = align8(this.frameSize, align) + size;
    return this.frameSize; // offset from base measured DOWN (we use fp+ (frameSize-offset))? simpler: store absolute below
  }
  collectLocals(node) {
    const visitDecl = (vd) => {
      if (this.locals.has(vd.name)) return;
      const storage=this.cg.staticLocals.get(vd);
      if (storage) {this.locals.set(vd.name,{...storage});return;}
      const ty = this.cg.resolveType(vd.type,this.locals);
      this.locals.set(vd.name,{kind:"local",type:ty,init:vd.init,
        registerHint:vd.storage?.includes("static")?"none":vd.registerHint});
    };
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (n.kind === "DeclStmt") { for (const d of n.decls) visitDecl(d); }
      if (n.kind === "For" && n.init && n.init.kind === "DeclStmt") for (const d of n.init.decls) visitDecl(d);
      for (const k in n) {
        const v = n[k];
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object" && v.kind) walk(v);
      }
    };
    walk(node);
  }

  findAddrTaken(node, set) {
    const markRoot = (n) => {
      while (n) {
        if (n.kind === "Ident") {
          if (n.globalBinding===undefined && n.functionBinding===undefined) set.add(n.name);
          return;
        }
        if (n.kind === "Member") { n = n.base; continue; }
        if (n.kind === "Index") { n = n.base; continue; }
        if (n.kind === "Cast" && n.postfix) { n = n.operand; continue; }
        if (n.kind === "Unary" && n.op === "*") { return; } // deref: root is a pointer value, not addressable local
        return;
      }
    };
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (n.kind === "Unary" && n.op === "&") markRoot(n.operand);
      if (n.kind === "Member" && !n.arrow) markRoot(n.base);
      for (const k in n) {
        const v = n[k];
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object" && v.kind) walk(v);
      }
    };
    walk(node);
  }

  // ---- frame prologue/epilogue ----
  beginFrame() {
    if (this.frameSize === 0) return;
    const f = this.f;
    f.stackCheck(this.frameSize);
    f.global_get(this.cg.spGlobal).i64_const(this.frameSize).op("i64_sub").global_set(this.cg.spGlobal);
    f.global_get(this.cg.spGlobal).local_set(this.fpLocal());
    // copy addressable params into their slots
    for (const [name, d] of this.locals) {
      if (d.kind === "slot" && d.paramIndex != null) {
        this.pushSlotAddr(d);                 // i64 addr
        this.f.op("i32_wrap_i64");
        this.f.local_get(d.paramIndex);
        this.emitStore(d.type);
      }
    }
  }
  restoreFrame() {
    if (this.frameSize === 0) return;
    this.f.global_get(this.cg.spGlobal).i64_const(this.frameSize).op("i64_add").global_set(this.cg.spGlobal);
  }
  endFrameFallthrough() {
    this.restoreFrame();
    if (!isVoid(this.fn.retType)) {
      if (isFloat(this.fn.retType)) this.f.f64_const(0); else this.f.i64_const(0);
    }
  }

  pushSlotAddr(d) {
    if (d.kind==="static") {
      (this.f.globalUses??=new Set()).add(d.name);
      this.f.i64_const(d.global.addr);return;
    }
    if (d.kind==="refslot") {
      this.f.local_get(d.windex).i64_const(d.offset).op("i64_add");
      return;
    }
    // address = fp_base + (frameSize - offset)   [slots packed from base upward]
    this.f.local_get(this.fpLocal());
    this.f.i64_const(this.frameSize - d.offset);
    this.f.op("i64_add");
  }

  // ---- control markers ----
  pushCtrl() { const m = {}; this.ctrl.push(m); return m; }
  popCtrl() { this.ctrl.pop(); }
  rel(m) { return this.ctrl.length - 1 - this.ctrl.lastIndexOf(m); }

  // ================================================== statements
  genStmt(s) {
    if (this.gotos && this.gotos.lowers(s)) { this.gotos.region(s); return; }
    switch (s.kind) {
      case "Block": for (const st of s.stmts) this.genStmt(st); return;
      case "Empty": return;
      case "DeclStmt": this.genDeclStmt(s); return;
      case "Result": {
        const t=this.cg.resolveType(this.genExpr(s.expr));
        this.cg.exprType=t;
        if (isVoid(t)) return;
        if (isFloat(t)) this.f.op("i64_reinterpret_f64");
        this.f.local_set(this.result);return;
      }
      case "GlobalInit": {
        if (this.cg.jit) {
          for (const name of s.names) this.genGlobalInit(this.cg.globals.get(name));
          return;
        }
        const guard=this.cg.alloc(8,8),f=this.f;
        const moduleGuard=this.cg.rtGuard??=this.cg.alloc(8,8);
        f.i64_const(guard).op("i32_wrap_i64").load("i64_load",0,3).op("i64_eqz").if_();
        if (!s.boot) f.i64_const(moduleGuard).op("i32_wrap_i64").i64_const(1).store("i64_store",0,3);
        for (const name of s.names) this.genGlobalInit(this.cg.globals.get(name));
        if (!s.boot) f.i64_const(moduleGuard).op("i32_wrap_i64").i64_const(2).store("i64_store",0,3);
        f.i64_const(guard).op("i32_wrap_i64").i64_const(1).store("i64_store",0,3);
        f.end();return;
      }
      case "ExprStmt": { const t = this.genExpr(s.expr); this.dropIfValue(t); return; }
      case "Print": this.genPrint(s); return;
      case "PutChars": this.genPutChars(s); return;
      case "If": this.genIf(s); return;
      case "While": this.genWhile(s); return;
      case "DoWhile": this.genDoWhile(s); return;
      case "For": this.genFor(s); return;
      case "Switch": this.genSwitch(s); return;
      case "Return": this.genReturn(s); return;
      case "Break": { const L = this.loops[this.loops.length - 1]; if (!L) { if (this.cg.lenient) { this.warnOnce("break outside loop/switch; ignored"); return; } this.err(s, "break outside loop"); } this.loopJump(L.cfg, L.brk); return; }
      case "Continue": { const L = this.loops[this.loops.length - 1]; if (!L) { if (this.cg.lenient) { this.warnOnce("continue outside loop; ignored"); return; } this.err(s, "continue outside loop"); } this.loopJump(L.cfg, L.cont); return; }
      case "Throw": this.genThrow(s); return;
      case "TryCatch": this.genTryCatch(s); return;
      case "Label":
        if (this.fn.name === "__main") this.err(s, "No global labels");
        this.cg.warn(`Unused label '${s.name}'`);
        return;
      case "AsmBlock":
        if (!this.cg.lenient) this.err(s, "x86 assembly is not supported by the WASM compiler");
        this.warnOnce("inline asm{} is not supported (x86-64); emitting trap"); this.f.unreachable(); return;
      case "Goto": this.gotos.goto(s); return;
      case "ClassDecl": return; // local class decl: types only
      default: this.err(s, "unsupported statement " + s.kind);
    }
  }

  loopJump(cfg, to) { if (cfg) this.gotos.jump(to); else this.f.br(this.rel(to)); }

  warnOnce(msg) { if (!this._warned) this._warned = new Set(); if (!this._warned.has(msg)) { this._warned.add(msg); this.cg.warn(msg); } }

  genDeclStmt(s) {
    for (const d of s.decls) {
      const desc = this.locals.get(d.name);
      if (!desc || desc.kind==="static") continue;
      if (d.init == null) continue;
      if (desc.kind === "slot") this.genStoreInit(desc);
      else { this.genExprCoerce(d.init, desc.nativeReg && isInt(desc.type)?T.I64:desc.type); this.f.local_set(desc.windex); }
    }
  }

  genStoreInit(desc) {
    // store an initializer into a memory slot/aggregate
    this.storeInitInto(() => this.pushSlotAddr(desc), desc.type, desc.init);
  }
  storeInitInto(pushAddr, type, init) {
    type = this.cg.resolveType(type);
    if (isArray(type) && init.kind === "StrLit" && this.cg.typeSize(type.of) === 1) {
      const size = this.cg.typeSize(type);
      //V5.03 PrsVarInit2 copies the array's count of bytes: a longer string
      //is cut, and a [] array is 0 bytes (Compiler/PrsVar.HC:131-150).
      pushAddr(); this.f.op("i32_wrap_i64");
      this.f.i32_const(0).i32_const(size).memory_fill();
      pushAddr(); this.f.op("i32_wrap_i64");
      this.f.dataAddress(this.cg.literalBytes(init,this.f),32);
      this.f.i32_const(Math.min(size, init.bytes.length + 1)).memory_copy();
      return;
    }
    if (init.kind === "InitList") {
      if (isArray(type)) {
        const et = type.of, esz = this.cg.typeSize(et);
        init.elements.forEach((el, i) => {
          this.storeInitInto(() => { pushAddr(); this.f.i64_const(i * esz).op("i64_add"); }, et, el);
        });
      } else if (isClass(type)) {
        const layout = this.cg.layoutClass(type.name);
        const fieldArr = [...layout.fields.values()];
        init.elements.forEach((el, i) => {
          const fi = fieldArr[i]; if (!fi) return;
          this.storeInitInto(() => { pushAddr(); this.f.i64_const(fi.offset).op("i64_add"); }, fi.type, el);
        });
      }
      return;
    }
    // scalar
    pushAddr(); this.f.op("i32_wrap_i64");
    this.genExprCoerce(init, type);
    this.emitStore(type);
  }

  genGlobalInit(g) {
    const locals=this.locals;
    if (g.initScope) this.locals=g.initScope;
    try { this.genGlobalValue(g); } finally {this.locals=locals;}
  }

  genGlobalValue(g) {
    // Constant integer arrays (sprite/bitmap data, tables) compile to one wasm
    // data segment rather than thousands of per-element stores - instant to emit.
    if ((!g.deferred || this.cg.jit || !g.seenEarly) && g.init.kind === "InitList" && this.cg.tryStaticConstArray(g,this.f)) return;
    const pushAddr = () => this.f.i64_const(g.addr);
    this.storeInitInto(pushAddr, g.type, g.init);
  }

  genReturn(s) {
    if (s.expr) {
      // IC_RETURN_VAL moves integer results to 64-bit RAX. Memory operands
      // already have their load width; the declared result does not truncate.
      this.genExprCoerce(s.expr,isInt(this.fn.retType)?T.I64:this.fn.retType);
      this.restoreFrame();
      this.f.return_();
    } else {
      this.restoreFrame();
      if (!isVoid(this.fn.retType)) { isFloat(this.fn.retType) ? this.f.f64_const(0) : this.f.i64_const(0); }
      this.f.return_();
    }
  }

  genIf(s) {
    this.genCond(s.cond);
    const m = this.pushCtrl(); this.f.if_(EMPTY_BLOCK);
    this.genStmt(s.then);
    if (s.else) { this.f.else_(); this.genStmt(s.else); }
    this.f.end(); this.popCtrl();
  }

  genWhile(s) {
    const brk = this.pushCtrl(); this.f.block();
    const cont = this.pushCtrl(); this.f.loop();
    this.genCond(s.cond); this.f.op("i32_eqz").br_if(this.rel(brk));
    this.loops.push({ brk, cont });
    this.genStmt(s.body);
    this.loops.pop();
    this.f.br(this.rel(cont));
    this.f.end(); this.popCtrl();
    this.f.end(); this.popCtrl();
  }

  genDoWhile(s) {
    const brk = this.pushCtrl(); this.f.block();
    const loop = this.pushCtrl(); this.f.loop();
    const cont = this.pushCtrl(); this.f.block();
    this.loops.push({ brk, cont });
    this.genStmt(s.body);
    this.loops.pop();
    this.f.end(); this.popCtrl(); // cont
    this.genCond(s.cond); this.f.br_if(this.rel(loop));
    this.f.end(); this.popCtrl(); // loop
    this.f.end(); this.popCtrl(); // brk
  }

  genFor(s) {
    if (s.init) this.genStmt(s.init);
    const brk = this.pushCtrl(); this.f.block();
    const loop = this.pushCtrl(); this.f.loop();
    if (s.cond) { this.genCond(s.cond); this.f.op("i32_eqz").br_if(this.rel(brk)); }
    const cont = this.pushCtrl(); this.f.block();
    this.loops.push({ brk, cont });
    this.genStmt(s.body);
    this.loops.pop();
    this.f.end(); this.popCtrl(); // cont
    if (s.step) this.genStmt(s.step);
    this.f.br(this.rel(loop));
    this.f.end(); this.popCtrl(); // loop
    this.f.end(); this.popCtrl(); // brk
  }

  exceptionField(name) {
    if (!this.cg.globals.has("Fs")) return null;
    return {kind:"Member",base:{kind:"Ident",name:"Fs"},name,arrow:true};
  }

  setExceptionField(name,pushValue) {
    const field=this.exceptionField(name);
    if (!field) return;
    const type=this.genAddr(field);
    this.f.op("i32_wrap_i64");
    pushValue();
    this.emitStore(type);
  }

  genThrow(s) {
    if (s.noLog) this.dropIfValue(this.genExpr(s.noLog));
    if (s.expr) this.genExprCoerce(s.expr,T.I64);
    else this.f.i64_const(0);
    this.f.global_set(this.cg.excGlobal);
    this.setExceptionField("except_ch",()=>this.f.global_get(this.cg.excGlobal));
    this.setExceptionField("catch_except",()=>this.f.i64_const(0));
    this.f.global_get(this.cg.excGlobal).throw_(this.cg.exceptionTag());
  }

  genTryCatch(s) {
    const saved=this.newWLocal(VT.i64),tag=this.cg.exceptionTag();
    const loops=this.loops;
    this.loops=[];
    this.f.global_get(this.cg.spGlobal).local_set(saved);
    this.pushCtrl();this.f.try_();
    this.genStmt(s.body);
    this.f.catch_(tag).global_set(this.cg.excGlobal);
    //WASM unwinds its own stack. Restore the addressable HolyC locals too.
    this.f.local_get(saved).global_set(this.cg.spGlobal);
    if (s.handler) this.genStmt(s.handler);
    const caught=this.exceptionField("catch_except");
    if (caught) {
      this.genTruth(caught);
      this.f.op("i32_eqz");
      this.pushCtrl();this.f.if_();
    }
    this.f.global_get(this.cg.excGlobal).throw_(tag);
    if (caught) {this.f.end();this.popCtrl();}
    this.f.end();this.popCtrl();
    this.loops=loops;
  }

  genSwitch(s) {
    const { labels, segs } = this.switchPlan(s);
    if (labels.length === 0) return;
    const disc = this.switchDisc(s);
    const brk = this.pushCtrl(); this.f.block();   // break target (outermost)
    // open one block per segment, innermost = seg0
    const segMarks = [];
    for (let i = segs.length - 1; i >= 0; i--) { segMarks[i] = this.pushCtrl(); this.f.block(); }
    const defLabel = labels.filter(l=>l.isDefault).at(-1);
    this.switchDispatch(disc, labels, (i) => segMarks[i], defLabel ? segMarks[defLabel.segIdx] : brk);
    // segment bodies
    this.loops.push({ brk, cont: brk }); // break works; continue maps to break (no loop)
    for (let i = 0; i < segs.length; i++) {
      this.f.end(); this.popCtrl(); // close segMark[i]
      for (const st of segs[i]) this.genStmt(st);
    }
    this.loops.pop();
    this.f.end(); this.popCtrl(); // brk
  }

  // The cases of a switch with the segment each one enters, the statements of
  // each segment, and the statements before the first case.
  switchPlan(s) {
    // Resolve labels with HolyC null-case auto-numbering & ranges.
    const labels = [];   // {values:[{lo,hi}], isDefault, segIdx}
    const segs = [];     // arrays of statements
    const pre = [];
    let cur = [];
    let prev = -1n;
    const pushSeg = () => { segs.push(cur); cur = []; };
    let started = false;
    for (const it of s.items) {
      if (it.type === "case" || it.type === "default") {
        if (started) pushSeg();
        started = true;
        if (it.type === "default") labels.push({ isDefault: true, segIdx: segs.length });
        else {
          let lo = it.lo ? this.cg.fold(it.lo,this.locals) : null;
          let hi = it.hi ? this.cg.fold(it.hi,this.locals) : null;
          // Non-constant case value: keep the AST node for a runtime compare.
          const loExpr = (lo == null && it.lo) ? it.lo : null;
          // I64_MIN is the native parser's initial-case sentinel.
          if (lo==null && !loExpr) lo=prev===-(1n<<63n)?0n:prev+1n;
          if (it.hi && hi == null) hi = lo;                      // unfoldable range hi -> single
          if (!it.hi) hi = lo;
          if (lo!=null) lo=BigInt.asIntN(64,lo);
          if (hi!=null) hi=BigInt.asIntN(64,hi);
          if (lo!=null && hi!=null && lo>hi) [lo,hi]=[hi,lo];
          if (lo != null) prev = (hi != null ? hi : lo);
          labels.push({ isDefault: false, lo, hi, loExpr, segIdx: segs.length });
        }
      } else if (it.type === "stmt") {
        if (started) cur.push(it.stmt); else pre.push(it.stmt);
      }
    }
    if (started) pushSeg();
    const cases=labels.filter(label=>!label.isDefault);
    if (!cases.length) this.err(s,"switch range error");
    const constants=cases.filter(label=>label.lo!=null && label.hi!=null)
      .sort((a,b)=>a.lo<b.lo?-1:a.lo>b.lo?1:0);
    for (let i=1;i<constants.length;i++)
      if (constants[i].lo<=constants[i-1].hi) this.err(s,"Duplicate case");
    if (constants.length===cases.length) {
      let low=constants[0].lo;
      // V5.03 pads small positive tables down to zero before its span check.
      if (low>0n && low<=16n) low=0n;
      if (constants.at(-1).hi-low+1n>65535n) this.err(s,"switch range error");
    }
    return { labels, segs, pre };
  }

  switchDisc(s) {
    const disc = this.scratchI64();
    this.genExprCoerce(s.disc, T.I64); this.f.local_set(disc);
    return disc;
  }

  // Branch to the marker of the case that holds the value in local disc, or
  // to defDst. segMark(i) is the marker of segment i.
  switchDispatch(disc, labels, segMark, defDst) {
    // Fast path: a dense block of constant integer cases compiles to an O(1) br_table (jump table)
    // instead of an O(n) compare chain - critical for big dispatchers like the CPU opcode switch.
    const cst = labels.filter((l) => !l.isDefault);
    const dense = cst.length > 1 && cst.every((l) => l.lo != null && !l.loExpr);
    let blo, bhi;
    if (dense) {
      blo = cst[0].lo; bhi = cst[0].hi != null ? cst[0].hi : cst[0].lo;
      for (const l of cst) { const a = l.lo, b = l.hi != null ? l.hi : l.lo; if (a < blo) blo = a; if (b > bhi) bhi = b; }
    }
    if (dense && bhi - blo >= 0n && bhi - blo <= 1024n) {
      const N = Number(bhi - blo) + 1;
      const dflt = this.rel(defDst);
      const table = new Array(N).fill(dflt);
      for (const l of cst) {
        const a = Number(l.lo - blo), b = Number((l.hi != null ? l.hi : l.lo) - blo);
        const d = this.rel(segMark(l.segIdx));
        for (let v = a; v <= b; v++) table[v] = d;
      }
      this.f.local_get(disc); this.f.i64_const(blo); this.f.op("i64_lt_s"); this.f.br_if(this.rel(defDst));
      this.f.local_get(disc); this.f.i64_const(bhi); this.f.op("i64_gt_s"); this.f.br_if(this.rel(defDst));
      this.f.local_get(disc); this.f.i64_const(blo); this.f.op("i64_sub"); this.f.op("i32_wrap_i64");
      this.f.br_table(table, dflt);
    } else {
      for (const lab of labels) {
        if (lab.isDefault) continue;
        if (lab.loExpr) {
          // runtime case value: disc == <expr>
          this.f.local_get(disc);
          this.genExprCoerce(lab.loExpr, T.I64);
          this.f.op("i64_eq");
        } else if (lab.lo === lab.hi) {
          this.f.local_get(disc);
          this.f.i64_const(lab.lo).op("i64_eq");
        } else {
          // lo <= disc <= hi
          this.f.local_get(disc).i64_const(lab.lo).op("i64_ge_s");
          this.f.local_get(disc).i64_const(lab.hi).op("i64_le_s");
          this.f.op("i32_and");
        }
        this.f.br_if(this.rel(segMark(lab.segIdx)));
      }
      this.f.br(this.rel(defDst));
    }
  }

  // ================================================== conditions
  // The test of an if, while, do or for, as an i32. Here V5.03 skips the rest
  // of && and || and of a chain of compares once the result is known
  // (Compiler/OptLib.HC:230-357). Elsewhere it evaluates every operand
  // (Doc/GuideLines.DD:79), which genTruth does.
  genCond(node) {
    if (node.kind === "Unary" && node.op === "!") { this.genCond(node.operand); this.f.op("i32_eqz"); return; }
    if (node.kind === "Chain") { this.genChain(node, true); return; }
    const t = node.kind === "Logical" && node.op !== "^^" ? this.genShortCircuit(node) : this.genExpr(node);
    //V5.03 tests what RAX holds after a U0 call (if (F())); here it is 0.
    if (isVoid(t)) this.f.i64_const(0);
    if (isFloat(t)) this.f.op("i64_reinterpret_f64");
    this.f.i64_const(0).op("i64_ne");
  }

  genTruth(node) {
    if (node.kind === "Unary" && node.op === "!") { this.genTruth(node.operand); this.f.op("i32_eqz"); return; }
    const t = this.genExpr(node);
    if (isVoid(t)) this.f.i64_const(0);
    if (isFloat(t)) this.f.op("i64_reinterpret_f64");
    this.f.i64_const(0).op("i64_ne");
  }

  dropIfValue(t) { if (t && !isVoid(t)) this.f.drop(); }

  // ================================================== print
  genPrint(s) {
    const fn=s.callee?this.functionAt(s.callee):this.cg.functions.get("Print");
    if (!fn) this.err(s,"Print requires the runtime or an explicit declaration");
    this.dropIfValue(this.emitCall(fn,[s.format,...s.args],s));
  }

  genPutChars(s) {
    const fn=s.callee?this.functionAt(s.callee):this.cg.functions.get("PutChars");
    if (!fn) this.err(s,"Character output requires the runtime or an explicit PutChars declaration");
    this.dropIfValue(this.emitCall(fn,[s.expr],s));
  }

  functionAt(node) {
    if (node.intrinsicFunction) return null;
    const fn=this.cg.functions.get(node.name),type=node.functionType;
    if (!fn || !type || type.params===fn.node?.params && type.retType===fn.node?.retType)
      return fn;
    const view={...fn,retType:this.cg.resolveType(type.retType),isVarArgs:type.isVarArgs,
      params:type.params.map(p=>({...p,type:this.cg.resolveType(p.type)}))};
    const a=this.cg.wasmSig(view.params,view.retType,view.isVarArgs),
      b=this.cg.wasmSig(fn.params,fn.retType,fn.isVarArgs);
    if (JSON.stringify(a)!==JSON.stringify(b))
      this.err(node,"Function header changes WASM ABI: "+(fn.node?.sourceName??fn.name));
    return view;
  }

  // A reference parsed before a same-named local still names its global.
  localBinding(node) {
    return node.globalBinding===undefined && node.functionBinding===undefined?this.locals.get(node.name):undefined;
  }

  // ================================================== expressions
  // genExpr pushes a value and returns its HolyC type
  genExpr(node) {
    switch (node.kind) {
      case "IntLit": this.f.i64_const(node.value); return literalType(node.value);
      case "FloatLit": this.f.f64_const(node.value); return T.F64;
      case "CharLit": this.f.i64_const(node.value); return literalType(node.value);
      case "StrLit": case "BinLit": { const a = this.cg.literalBytes(node,this.f); this.f.dataAddress(a); return ptrTo(T.U8); }
      case "Ident": return this.genIdent(node);
      case "Assign": return this.genAssign(node);
      case "Binary": return this.genBinary(node);
      case "Logical": return this.genLogical(node);
      case "Chain": this.genChain(node, false); this.f.op("i64_extend_i32_u"); return T.I64;
      case "Unary": return this.genUnary(node);
      case "Postfix": return this.genPostfix(node);
      case "Cond": return this.genCondExpr(node);
      case "Call": return this.genCall(node);
      case "Index": return this.genLoadLValue(node);
      case "Member": return this.genLoadLValue(node);
      case "Cast": {
        if (node.postfix) return this.genPostfixCast(node);
        const t = this.genExpr(node.operand); return this.coerce(t, this.cg.resolveType(node.type));
      }
      case "Sizeof": case "Offset": this.f.i64_const(this.cg.layoutQuery(node,this.locals));return T.I64;
      default: this.err(node, "unsupported expression " + node.kind);
    }
  }

  // A postfix cast of a value in memory reads that memory again as the new
  // type. Any other value keeps its bits and only changes type.
  genPostfixCast(node) {
    if (this.inMemory(node.operand)) return this.genLoadLValue(node);
    const to = this.cg.resolveType(node.type);
    const from = this.cg.resolveType(this.genExpr(node.operand));
    if (isVoid(from)) { if (!isVoid(to)) this.pushZero(to); return to; }
    if (isVoid(to)) { this.f.drop(); return to; }
    this.reinterpret(from, to);
    return to;
  }
  exportedAddress(node) {
    if (node.kind!=="Ident" || this.localBinding(node)) return null;
    const global=this.cg.globals.get(node.name);
    return global?.kind==="exportedAddress"?global:null;
  }
  inMemory(node) {
    switch (node.kind) {
      case "Ident": {
        const L = this.localBinding(node);
        if (L) return L.kind !== "wlocal";
        return this.cg.globals.has(node.name) && !this.exportedAddress(node);
      }
      case "Index": case "Member": return true;
      case "Unary": return node.op === "*";
      case "Cast": return !!node.postfix && this.inMemory(node.operand);
    }
    return false;
  }
  reinterpret(from, to) {
    if (isFloat(from) && !isFloat(to)) this.f.op("i64_reinterpret_f64");
    else if (!isFloat(from) && isFloat(to)) this.f.op("f64_reinterpret_i64");
  }
  pushZero(t) { if (isFloat(t)) this.f.f64_const(0); else this.f.i64_const(0); }
  // The wasm local an assignment or ++ writes, through any postfix casts,
  // with the type the operation uses.
  wlocalTarget(node) {
    let type = null;
    while (node.kind === "Cast" && node.postfix) { type ??= this.cg.resolveType(node.type); node = node.operand; }
    if (node.kind !== "Ident") return null;
    const L = this.localBinding(node);
    if (!L || L.kind !== "wlocal") return null;
    return { L, type: type ?? this.cg.resolveType(L.type), own: this.cg.resolveType(L.type) };
  }

  // Scalar type observed during OptPass012 pass 0, 1 or 2.
  peekType(node,phase=2) {
    switch (node.kind) {
      case "IntLit": case "CharLit": return literalType(node.value);
      case "FloatLit": return T.F64;
      case "StrLit": case "BinLit": return ptrTo(T.U8);
      case "Ident": {
        const L = this.localBinding(node); if (L) return this.cg.resolveType(L.type);
        const G = this.cg.globals.get(node.name); if (G) return this.cg.resolveType(node.globalType??G.type);
        const fn = this.functionAt(node); if (fn) return fn.retType;
        if (node.name in this.cg.constEnv) return T.I64;
        return T.I64;
      }
      case "Cast": return this.cg.resolveType(node.type);
      case "Binary": {
        if (node.op === "`") return T.F64;
        const a = this.peekType(node.left,phase), b = this.peekType(node.right,phase);
        if ([">","<",">=","<=","==","!="].includes(node.op)) return T.I64;
        return this.binaryType(node,a,b,phase);
      }
      case "Logical": case "Chain": return T.I64;
      case "Unary": {
        if (node.op === "&") {
          if (this.exportedAddress(node.operand)) return T.I64;
          if (node.operand.kind==="Ident" && !this.localBinding(node.operand) &&
              !this.cg.globals.has(node.operand.name)) {
            const fn=this.functionAt(node.operand);
            if (fn) return funcPtr(fn.retType,fn.params,fn.isVarArgs);
          }
          return ptrTo(this.peekType(node.operand,phase));
        }
        if (node.op === "*") { const t = this.peekType(node.operand,phase); return isFuncPtr(t)?t:isPtr(t) || isArray(t) ? elemType(t) : T.I64; }
        if (node.op === "!") return T.I64;
        if (node.op === "-") {
          const t = this.peekType(node.operand,phase);
          return isInt(t) ? { ...t, signed: true } : t;
        }
        return this.peekType(node.operand,phase);
      }
      case "Postfix": return this.peekType(node.operand,phase);
      case "Assign": return this.peekType(node.target);
      case "Cond": return this.peekType(node.then,phase);
      case "Call": {
        const callee = node.callee,type=this.peekType(callee);
        if (isFuncPtr(type)) return type.retType;
        if (callee.kind === "Ident") { const fn = this.functionAt(callee); if (fn) return fn.retType; }
        return T.I64;
      }
      case "Index": { const bt = this.peekType(node.base); return elemType(bt) || T.I64; }
      case "Member": return this.memberType(node);
      case "Sizeof": case "Offset": return T.I64;
      default: return T.I64;
    }
  }

  memberType(node) {
    let bt = this.peekType(node.base);
    if (node.arrow && isPtr(bt)) bt = bt.to;
    bt = this.cg.resolveType(bt);
    if (isInt(bt) && node.name in UNION_MEMBERS) {
      const sub = UNION_MEMBERS[node.name];
      return arrayOf(sub, Math.max(1, sizeof(bt) / sizeof(sub)));
    }
    const lookup = (cls) => {
      if (!isClass(cls) || !this.cg.classes.has(cls.name)) return T.I64;
      const layout = this.cg.layoutClass(cls.name);
      const f = layout.fields.get(node.name);
      return f ? f.type : T.I64;
    };
    if (isClass(bt)) return lookup(bt);
    if (isPtr(bt)) return lookup(this.cg.resolveType(bt.to));
    return T.I64;
  }

  genIdent(node) {
    const L = this.localBinding(node);
    if (L) {
      if (L.kind==="unavailable") this.err(node,"Static initializer cannot read an automatic local");
      if (L.kind === "wlocal") { this.f.local_get(L.windex); return this.cg.resolveType(L.type); }
      if (L.kind === "reflocal") { this.f.local_get(L.windex); return this.cg.resolveType(L.type); }
      // slot
      const t = this.cg.resolveType(L.type);
      if (isAggregate(t)) { this.pushSlotAddr(L); return t; } // value is address
      this.pushSlotAddr(L); this.f.op("i32_wrap_i64"); this.emitLoad(t); return t;
    }
    const G = this.cg.globals.get(node.name);
    if (G) {
      (this.f.globalUses??=new Set()).add(node.name);
      const t = this.cg.resolveType(node.globalType??G.type);
      if (G.kind==="exportedAddress") {this.f.i64_const(G.addr);return t;}
      if (isAggregate(t)) {
        (this.f.fieldUses??=new Set()).add(node.name+'.*');
        this.f.i64_const(G.addr);return t;
      }
      this.f.i64_const(G.addr); this.f.op("i32_wrap_i64"); this.emitLoad(t); return t;
    }
    if (node.name in this.cg.constEnv) { this.f.i64_const(this.cg.constEnv[node.name]); return T.I64; }
    if (node.name==="__memsize")
      return this.genCall({kind:"Call",callee:node,args:[]});
    const fn = this.functionAt(node);
    if (fn) { return this.emitCall(fn, [], node); } // no-paren call
    if (node.name==="Carry" && this.carry) {this.f.local_get(this.carry.cf);return T.I64;}
    if (node.name==="MyCore") {this.f.global_get(this.cg.coreGlobal);return T.I64;}
    if (node.name==="GetRSP") {this.f.global_get(this.cg.spGlobal);return ptrTo(T.U8);}
    // Unknown symbol: in lenient mode it becomes a global I64 (kernel
    // global/constant we don't model) so the program still compiles & runs.
    if (this.cg.lenient) {
      const g = this.cg.lenientGlobal(node.name);
      this.f.i64_const(g); this.f.op("i32_wrap_i64"); this.emitLoad(T.I64);
      return T.I64;
    }
    this.err(node, "undefined symbol '" + node.name + "'");
  }

  // address of an lvalue: pushes i64 addr, returns pointee type
  // Fold a pure-constant address chain (globalIdent[.field|[constIdx]]*) to its absolute address.
  // Returns {addr, type} or null. This restores flat i64.const addressing for the per-core CPU-state
  // pattern (g_cpu_st[MY_CORE].f_reg[i] etc.) - without it every register access in the interpreter
  // rebuilt the address with const+add chains (~2x slower interp).
  addrConst(node) {
    try {
      if (node.kind === "Ident") {
        if (this.localBinding(node)) return null;
        const G = this.cg.globals.get(node.name);
        if (!G || G.kind==="exportedAddress") return null;
        (this.f.globalUses??=new Set()).add(node.name);
        return {addr:Number(G.addr),type:this.cg.resolveType(node.globalType??G.type)};
      }
      if (node.kind === "Member" && !node.arrow) {
        const b = this.addrConst(node.base);
        if (!b) return null;
        const bt = this.cg.resolveType(b.type);
        if (!bt || !isClass(bt)) return null;
        const fld = this.fieldOf(bt, node.name, node);
        if (!fld) return null;
        return { addr: b.addr + Number(fld.offset || 0), type: fld.type };
      }
      if (node.kind === "Index") {
        const b = this.addrConst(node.base);
        if (!b) return null;
        const bt = this.cg.resolveType(b.type);
        if (!isArray(bt)) return null;
        const cidx = this.cg.fold(node.index,this.locals,{});
        if (cidx === null || cidx === undefined) return null;
        return { addr: b.addr + Number(cidx) * this.cg.typeSize(bt.of), type: bt.of };
      }
    } catch { return null; }
    return null;
  }

  genAddr(node,recordFields=true) {
    if (this.exportedAddress(node)) this.err(node,"Invalid lval: exported address");
    const names=[];
    let root=node;
    while (root.kind==="Member" && !root.arrow || root.kind==="Index") {
      if (root.kind==="Member") names.unshift(root.name);
      root=root.base;
    }
    if (recordFields && root.kind==="Ident" && !this.localBinding(root) && this.cg.globals.has(root.name))
      (this.f.fieldUses??=new Set()).add(root.name+'.'+(names.join('.')||'*'));
    if (!NOFOLD) { const ac = this.addrConst(node); if (ac) { this.f.i64_const(ac.addr); return ac.type; } }
    switch (node.kind) {
      case "Ident": {
        const L = this.localBinding(node);
        if (L) {
          if (L.kind==="unavailable") this.err(node,"Static initializer cannot address an automatic local");
          if (L.kind === "slot" || L.kind==="refslot" || L.kind==="static") { this.pushSlotAddr(L); return this.cg.resolveType(L.type); }
          if (L.kind === "reflocal") { this.f.local_get(L.windex); return this.cg.resolveType(L.type); }
          this.err(node, "cannot take address of register local '" + node.name + "'");
        }
        const G = this.cg.globals.get(node.name);
        if (G) {
          (this.f.globalUses??=new Set()).add(node.name);
          this.f.i64_const(G.addr);return this.cg.resolveType(node.globalType??G.type);
        }
        if (this.cg.lenient) { this.f.i64_const(this.cg.lenientGlobal(node.name)); return T.I64; }
        this.err(node, "cannot address undefined '" + node.name + "'");
      }
      case "Unary": if (node.op === "*") { const t = this.genExpr(node.operand); return isPtr(t) || isArray(t) ? elemType(t) : T.I64; } break;
      case "Index": return this.genIndexAddr(node);
      case "Member": return this.genMemberAddr(node);
      case "Cast":
        if (node.postfix && this.inMemory(node.operand)) { this.genAddr(node.operand); return this.cg.resolveType(node.type); }
        break;
    }
    if (this.cg.lenient) {
      // Not an lvalue (e.g. result of an expression used as a write target in
      // code we don't fully model): evaluate for side effects, point writes at
      // a junk cell so the store is harmless.
      const t = this.genExpr(node); this.dropIfValue(t);
      this.f.i64_const(JUNK_ADDR);
      return T.I64;
    }
    this.err(node, "not an lvalue: " + node.kind);
  }

  genIndexAddr(node) {
    if (!NOFOLD) { const ac = this.addrConst(node); if (ac) { this.f.i64_const(ac.addr); return ac.type; } }
    let bt = this.peekType(node.base);
    bt = this.cg.resolveType(bt);
    let elemT;
    if (isArray(bt)) { this.genAddr(node.base); elemT = bt.of; }
    else if (isPtr(bt)) { this.genExpr(node.base); elemT = bt.to; }
    else {
      // The base first: an undefined name is reported as undefined.
      this.genExpr(node.base); elemT = T.I64;
      if (!this.cg.lenient) this.err(node,"Not array or ptr");
    }
    const esz = this.cg.typeSize(elemT);
    // constant index: fold idx*esz at compile time (a[0] adds NOTHING) - hot for the per-core
    // CPU-state pattern g_cpu_st[MY_CORE].f_reg[i], where a runtime 0*sizeof mul on every register
    // access cost the interpreter ~2x.
    const cidx = this.cg.fold(node.index,this.locals,{});
    if (cidx !== null && cidx !== undefined) {
      const off = Number(cidx) * esz;
      if (off) this.f.i64_const(off).op("i64_add");
      return elemT;
    }
    this.genExprCoerce(node.index, T.I64);
    if (esz !== 1) this.f.i64_const(esz).op("i64_mul");
    this.f.op("i64_add");
    return elemT;
  }

  // Look up a class field; in lenient mode return a default {offset:0,type:I64}
  // when the base isn't a known class so member access on opaque kernel values
  // never aborts compilation.
  fieldOf(cls, name, node) {
    cls = this.cg.resolveType(cls);
    if (isClass(cls) && this.cg.classes.has(cls.name)) {
      (this.f.fieldUses??=new Set()).add(cls.name+"."+name);
      return this.cg.classField(cls,name);
    }
    if (this.cg.lenient) { this.cg.warnOnceCg(`member '.${name}' on non-class value; offset 0`); return { offset: 0, type: T.I64 }; }
    this.err(node,isClass(cls)?`member access '.${name}' on undefined class ${cls.name}`:
      `member access '.${name}' on non-class type ${typeName(cls)}`);
  }

  genMemberAddr(node) {
    if (!NOFOLD) { const ac = this.addrConst(node); if (ac) { this.f.i64_const(ac.addr); return ac.type; } }
    let bt = this.peekType(node.base);
    if (node.arrow) {
      bt = this.cg.resolveType(bt);
      const cls = isPtr(bt) ? this.cg.resolveType(bt.to) : bt;
      this.genExpr(node.base); // pointer value (base address)
      if (isInt(cls) && node.name in UNION_MEMBERS) {
        const sub=UNION_MEMBERS[node.name];
        return arrayOf(sub,Math.max(1,sizeof(cls)/sizeof(sub)));
      }
      const fld = this.fieldOf(cls, node.name, node);
      if (fld.offset) this.f.i64_const(fld.offset).op("i64_add");
      return fld.type;
    }
    bt = this.cg.resolveType(bt);
    if (isInt(bt) && node.name in UNION_MEMBERS) {
      // union sub-access: base must be addressable
      this.genAddr(node.base);
      const sub = UNION_MEMBERS[node.name];
      return arrayOf(sub, Math.max(1, sizeof(bt) / sizeof(sub)));
    }
    if (isPtr(bt)) { // allow . on pointer too (lenient)
      const cls = this.cg.resolveType(bt.to);
      this.genExpr(node.base);
      const fld = this.fieldOf(cls, node.name, node);
      if (fld.offset) this.f.i64_const(fld.offset).op("i64_add");
      return fld.type;
    }
    // The outer lvalue recorded the full field path; its base does not escape.
    this.genAddr(node.base,false);
    const fld = this.fieldOf(bt, node.name, node);
    if (fld.offset) this.f.i64_const(fld.offset).op("i64_add");
    return fld.type;
  }

  recordGlobalEscape(node) {
    let root=node;
    while (root.kind==="Member" && !root.arrow || root.kind==="Index") root=root.base;
    if (root.kind!=="Ident" || this.localBinding(root)) return;
    const global=this.cg.globals.get(root.name);
    if (global && isAggregate(this.cg.resolveType(root.globalType??global.type)))
      (this.f.fieldUses??=new Set()).add(root.name+'.*');
  }

  genLoadLValue(node) {
    const t = this.genAddr(node);
    const rt = this.cg.resolveType(t);
    if (isAggregate(rt)) {this.recordGlobalEscape(node);return rt;} // address is the value
    this.f.op("i32_wrap_i64");
    this.emitLoad(rt);
    return rt;
  }

  genAssign(node) {
    const op = node.op;
    if (isAggregate(this.cg.resolveType(this.peekType(node.target))))
      this.err(node, "Invalid lval: aggregate assignment");
    const wl = this.wlocalTarget(node.target);
    if (wl) {
      const { L, type: t, own } = wl,storeType=L.nativeReg && isInt(t)?T.I64:t;
      if (op === "=") this.genExprCoerce(node.value, storeType);
      else {
        const pushLeft = () => { this.f.local_get(L.windex); this.reinterpret(own, t); };
        this.coerce(this.combineToValue(op.slice(0, -1), pushLeft, t, node.value), storeType);
      }
      this.reinterpret(t, own);
      this.f.local_tee(L.windex);
      this.reinterpret(own, t);
      return t;
    }
    //V5.03 OptPass012 fuses *ptr++=value into IC_ASSIGN_PP. Its pointer
    //increment follows the store; index increments and compound stores do not.
    const post=op==="=" && node.target.kind==="Unary" && node.target.op==="*" &&
      node.target.operand.kind==="Postfix"?node.target.operand:null;
    const target=post?{...node.target,operand:post.operand}:node.target;
    const t = this.cg.resolveType(this.genAddr(target));
    const addr = this.newWLocal(VT.i32);
    this.f.op("i32_wrap_i64").local_set(addr);
    if (op === "=") {
      this.f.local_get(addr);
      this.genExprCoerce(node.value, t);
      // duplicate value for result via scratch
      const res = this.newWLocal(wasmValType(t));
      this.f.local_tee(res);
      this.emitStore(t);
      if (post) this.dropIfValue(this.genIncDec(post.operand,post.op,false));
      this.f.local_get(res);
      return t;
    } else {
      const base = op.slice(0, -1);
      this.f.local_get(addr); // address for the eventual store
      const vt = this.combineToValue(base, () => { this.f.local_get(addr); this.emitLoad(t); }, t, node.value);
      const res = isFloat(t) ? this.scratchF64() : this.scratchI64();
      const wide=isInt(t) && ["*","<<"].includes(base);
      if (wide) {
        this.coerce(vt,T.I64);this.f.local_tee(res);this.narrowInt(t);
      } else {this.coerce(vt,t);this.f.local_tee(res);}
      this.emitStore(t);
      this.f.local_get(res);
      return t;
    }
  }

  // Push (leftValue OP rightValue) with type-correct conversions. `pushLeft`
  // emits the current left value (of type leftType); `valueNode` is the rhs AST.
  // Returns the HolyC result type (F64 for float arithmetic, else I64).
  combineToValue(base, pushLeft, leftType, valueNode) {
    const lr = this.cg.resolveType(leftType);
    const rPeek = this.cg.resolveType(this.peekType(valueNode));
    const right=this.newWLocal(wasmValType(rPeek));
    const rightType=this.genExpr(valueNode);
    this.f.local_set(right);
    const pushRight=type=>{this.f.local_get(right);this.coerce(rightType,type);};
    if ((base === "+" || base === "-") && isPtr(lr) && isInt(rPeek)) {
      pushLeft();
      pushRight(T.I64);
      const size = this.cg.typeSize(lr.to);
      if (size !== 1) this.f.i64_const(size).op("i64_mul");
      this.f.op(base === "+" ? "i64_add" : "i64_sub");
      return lr;
    }
    const floatArith = (isFloat(lr) || isFloat(rPeek)) && ["+","-","*","/","%"].includes(base);
    if (floatArith) {
      pushLeft();
      if (!isFloat(lr)) this.f.op("f64_convert_i64_s");
      pushRight(T.F64);
      this.floatOp(base);
      return T.F64;
    }
    pushLeft();
    if (isFloat(lr)) this.floatToInt();
    const shift=(base==="/" || base==="%")?this.constantPowerShift(valueNode):null;
    if (shift!=null) {
      this.f.i64_const(base==="/"?shift:(1n<<shift)-1n);
      this.intOp(base==="/"?">>":"&",isUnsigned(lr));
    } else {
      pushRight(T.I64);
      this.intOp(base, isUnsigned(lr));
    }
    return T.I64;
  }

  constantPowerShift(node) {
    // Native OptPass012 rewrites literal powers of two, never mutable globals.
    const value=this.cg.fold(node,this.locals,{});
    if (value==null) return null;
    const bits=BigInt.asUintN(64,value);
    return bits && !(bits&(bits-1n))?BigInt(bits.toString(2).length-1):null;
  }

  floatConstant(node) {
    if (node.kind==="IntLit" || node.kind==="CharLit")
      return Number(BigInt.asIntN(64,BigInt(node.value)));
    if (node.kind==="FloatLit") return node.value;
    if (!isFloat(this.cg.resolveType(this.peekType(node)))) return null;
    if (node.kind==="Unary" && ["+","-"].includes(node.op)) {
      const value=this.floatConstant(node.operand);
      return value===null?null:node.op==="-"?-value:value;
    }
    if (node.kind==="Binary" && ["+","-","*","/"].includes(node.op)) {
      const a=this.floatConstant(node.left),b=this.floatConstant(node.right);
      if (a===null || b===null) return null;
      const value=node.op==="+"?a+b:node.op==="-"?a-b:node.op==="*"?a*b:a/b;
      return Number.isFinite(value)?value:null;
    }
    return null;
  }

  floatLoad(node) {
    if (!isFloat(this.cg.resolveType(this.peekType(node)))) return false;
    if (node.kind==="Ident") return !!this.localBinding(node) ||
      this.cg.globals.has(node.name) && !this.exportedAddress(node);
    if (node.kind==="Cast" && node.postfix) {
      if (node.operand.kind==="Ident") return !!this.localBinding(node.operand) ||
        this.cg.globals.has(node.operand.name) && !this.exportedAddress(node.operand);
      return this.inMemory(node.operand);
    }
    return node.kind==="Index" || node.kind==="Member" ||
      node.kind==="Unary" && node.op==="*";
  }

  zeroLoadCompare(node) {
    // OptLib.HC only rewrites IC_LESS/IC_GREATER_EQU against +0. A
    // following IC_PUSH_CMP or IC_AND_AND excludes the rewrite. Chains
    // have their own lowering; the immediate right operand of && is marked.
    if (!["<",">="].includes(node.op) || this.noZeroCompare.has(node)) return false;
    return this.floatLoad(node.left) && Object.is(this.floatConstant(node.right),0) ||
      this.floatLoad(node.right) && Object.is(this.floatConstant(node.left),0);
  }

  genBinary(node) {
    if (node.op === "`") {
      // power -> __pow(f64,f64)
      this.genExprCoerce(node.left, T.F64);
      this.genExprCoerce(node.right, T.F64);
      this.f.call(this.cg.imports.__pow.index);
      return T.F64;
    }
    const lt = this.peekType(node.left);
    const rt = this.peekType(node.right);
    // pointer arithmetic
    const lr = this.cg.resolveType(lt), rr = this.cg.resolveType(rt);
    if (node.op === "-" && (isPtr(lr) || isArray(lr)) && (isPtr(rr) || isArray(rr))) {
      this.genExpr(node.left);
      this.genExpr(node.right);
      this.f.op("i64_sub");
      const size = this.cg.typeSize(elemType(lr));
      if (size !== 1) this.f.i64_const(size).op("i64_div_s");
      return T.I64;
    }
    if (node.op === "+" && isInt(lr) && (isPtr(rr) || isArray(rr))) {
      this.genExprCoerce(node.left, T.I64);
      const size = this.cg.typeSize(elemType(rr));
      if (size !== 1) this.f.i64_const(size).op("i64_mul");
      this.genExpr(node.right);
      this.f.op("i64_add");
      return ptrTo(elemType(rr));
    }
    if ((node.op === "+" || node.op === "-") && (isPtr(lr) || isArray(lr)) && isInt(rr)) {
      const elemT = elemType(lr); const esz = this.cg.typeSize(elemT);
      this.genExpr(node.left);
      this.genExprCoerce(node.right, T.I64);
      if (esz !== 1) this.f.i64_const(esz).op("i64_mul");
      this.f.op(node.op === "+" ? "i64_add" : "i64_sub");
      return ptrTo(elemT);
    }
    const useFloat = isFloat(lr) || isFloat(rr);
    const FLOAT_ARITH = ["+","-","*","/","%"].includes(node.op);
    if (useFloat && FLOAT_ARITH) {
      this.genExprCoerce(node.left, T.F64);
      this.genExprCoerce(node.right, T.F64);
      this.floatOp(node.op);
      return T.F64;
    }
    if (isCmp(node.op)) {
      if (useFloat) {
        this.genExprCoerce(node.left, T.F64);
        const bits=this.zeroLoadCompare(node);
        if (bits) this.f.op("i64_reinterpret_f64");
        this.genExprCoerce(node.right, T.F64);
        if (bits) {
          this.f.op("i64_reinterpret_f64");
          this.intCmp(node.op,false);
        } else this.floatCmp(node.op);
      } else {
        this.genExprCoerce(node.left, T.I64);
        this.genExprCoerce(node.right, T.I64);
        const unsigned = this.comparisonUnsigned(node.left) || this.comparisonUnsigned(node.right);
        this.intCmp(node.op, unsigned);
      }
      this.f.op("i64_extend_i32_u");
      return T.I64;
    }
    // integer op (coerce truncates any float operand)
    const integerResult=isInt(lr) && isInt(rr)?this.binaryType(node,lr,rr):
      (isUnsigned(lr) || isUnsigned(rr)?T.U64:T.I64);
    const constantOperands=this.integerConstant(node.left) && this.integerConstant(node.right);
    const emittedLeft=this.genExpr(node.left);
    this.coerce(emittedLeft,T.I64);
    const shift=node.op==="/" && this.cg.fold(node.left,this.locals,{})==null?
      this.constantPowerShift(node.right):null;
    if (shift!=null) {
      this.f.i64_const(shift);
      this.intOp(">>",isUnsigned(emittedLeft));
    } else {
      this.genExprCoerce(node.right, T.I64);
      this.intOp(node.op,constantOperands?isUnsigned(lr) || isUnsigned(rr):
        node.op===">>"?isUnsigned(this.binaryType(node,emittedLeft,rr)):
        isUnsigned(integerResult));
    }
    // A constant-power division becomes a unary shift of the left value.
    if (shift!=null) return emittedLeft;
    if (node.op===">>") return this.binaryType(node,emittedLeft,rr);
    return integerResult;
  }

  binaryType(node,a,b,phase=2) {
    // Native rewrites change the class used by later arithmetic. Right-hand
    // shifts/powers become unary on the next pass; left *1 and +/-0 disappear
    // only on pass 2. Fully constant operations keep their raw-type winner.
    if (isInt(a) && isInt(b)) {
      const lc=this.integerConstant(node.left),rc=this.integerConstant(node.right);
      if (!lc && rc) {
        if (phase>=1 && ["<<",">>"].includes(node.op)) return a;
        const value=this.cg.fold(node.right,this.locals,{});
        if (phase>=2 && ["+","-"].includes(node.op) && value===0n) return a;
        if (["*","/"].includes(node.op) && (value===1n ||
            phase>=1 && this.constantPowerShift(node.right)!=null)) return a;
      } else if (lc && !rc && phase>=2) {
        const value=this.cg.fold(node.left,this.locals,{});
        if (node.op==="+" && value===0n || node.op==="*" && value===1n) return b;
      }
    }
    return binResultType(a,b);
  }

  comparisonUnsigned(node) {
    // ICF_USE_UNSIGNED is sticky: a later rewrite cannot clear an earlier
    // unsigned operand class (e.g. signed_value/4(U64)<0).
    return [0,1,2].some(phase=>isUnsigned(this.peekType(node,phase)));
  }

  integerConstant(node) {
    if (["IntLit","CharLit","Sizeof","Offset"].includes(node.kind)) return true;
    if (node.kind==="Cast") return isInt(this.cg.resolveType(node.type)) && this.integerConstant(node.operand);
    if (node.kind==="Unary") return ["+","-","~","!"].includes(node.op) && this.integerConstant(node.operand);
    if (["Binary","Logical"].includes(node.kind)) {
      if (node.op==="`" || !this.integerConstant(node.left) ||
          !this.integerConstant(node.right)) return false;
      // OptPass012 leaves division/remainder by zero for execution.
      return !["/","%"].includes(node.op) || this.cg.fold(node.right,this.locals,{})!==0n;
    }
    if (node.kind==="Chain") return node.operands.every(x=>this.integerConstant(x));
    return false;
  }

  // CF of op on a and b, with a and b on the stack, leaving op's value.
  carryOp(op) {
    const {cf,a,b}=this.carry,f=this.f;
    f.local_set(b);f.local_set(a);f.local_get(a);f.local_get(b);
    if (op==="+" || op==="-") {
      f.op(op==="+"?"i64_add":"i64_sub");
      if (op==="+") {f.local_tee(b);f.local_get(a);f.op("i64_lt_u");f.local_get(b);f.local_set(a);}
      else {f.local_get(a);f.local_get(b);f.op("i64_lt_u");}
      f.op("i64_extend_i32_u");f.local_set(cf);
      if (op==="+") f.local_get(a);
      return true;
    }
    if (op==="<<" || op===">>") return false;
    f.op({"&":"i64_and","|":"i64_or","^":"i64_xor"}[op]);
    f.i64_const(0);f.local_set(cf);
    return true;
  }
  // CF of a shift: the last bit out; a count of 0 leaves it.
  carryShift() {
    const {cf,a,b}=this.carry,f=this.f;
    f.local_get(cf);
    f.local_get(a);
    if (this.carryLeft) {f.i64_const(64);f.local_get(b);f.i64_const(63);f.op("i64_and");f.op("i64_sub");}
    else {f.local_get(b);f.i64_const(63);f.op("i64_and");f.i64_const(1);f.op("i64_sub");}
    f.op("i64_shr_u");f.i64_const(1);f.op("i64_and");
    f.local_get(b);f.i64_const(63);f.op("i64_and");f.op("i64_eqz");
    f.op("select");f.local_set(cf);
  }
  intOp(op, unsigned) {
    if (this.carry && ["+","-","&","|","^","<<",">>"].includes(op)) {
      if (this.carryOp(op)) return;
      //carryOp left a and b on the stack for the shift.
      this.f.op(op==="<<"?"i64_shl":unsigned?"i64_shr_u":"i64_shr_s");
      this.carryLeft=op==="<<";this.carryShift();
      return;
    }
    switch (op) {
      case "+": this.f.op("i64_add"); break;
      case "-": this.f.op("i64_sub"); break;
      case "*": this.f.op("i64_mul"); break;
      case "/": this.f.op(unsigned ? "i64_div_u" : "i64_div_s"); break;
      case "%": this.f.op(unsigned ? "i64_rem_u" : "i64_rem_s"); break;
      case "&": this.f.op("i64_and"); break;
      case "|": this.f.op("i64_or"); break;
      case "^": this.f.op("i64_xor"); break;
      case "<<": this.f.op("i64_shl"); break;
      case ">>": this.f.op(unsigned ? "i64_shr_u" : "i64_shr_s"); break;
      default: this.err({}, "bad int op " + op);
    }
  }
  floatOp(op) {
    switch (op) {
      case "+": this.f.op("f64_add"); break;
      case "-": this.f.op("f64_sub"); break;
      case "*": this.f.op("f64_mul"); break;
      case "/": this.f.op("f64_div"); break;
      case "%": this.f.call(this.cg.imports.__fmod.index); break;
      default: this.err({}, "bad float op " + op);
    }
  }
  intCmp(op, unsigned) {
    const u = unsigned;
    if (this.carry) {
      //CMP: CF is the unsigned borrow of a-b.
      const {cf,a,b}=this.carry,f=this.f;
      f.local_set(b);f.local_set(a);
      f.local_get(a);f.local_get(b);f.op("i64_lt_u");f.op("i64_extend_i32_u");f.local_set(cf);
      f.local_get(a);f.local_get(b);
    }
    switch (op) {
      case "<": this.f.op(u ? "i64_lt_u" : "i64_lt_s"); break;
      case ">": this.f.op(u ? "i64_gt_u" : "i64_gt_s"); break;
      case "<=": this.f.op(u ? "i64_le_u" : "i64_le_s"); break;
      case ">=": this.f.op(u ? "i64_ge_u" : "i64_ge_s"); break;
      case "==": this.f.op("i64_eq"); break;
      case "!=": this.f.op("i64_ne"); break;
    }
  }
  floatCmp(op) {
    // Native ICCmp compares the promoted F64 representations for equality.
    if (op==="==" || op==="!=") {
      const right=this.scratchF64();
      this.f.local_set(right).op("i64_reinterpret_f64")
        .local_get(right).op("i64_reinterpret_f64");
      this.intCmp(op,false);
      return;
    }
    switch (op) {
      case "<": this.f.op("f64_lt"); break;
      case ">": this.f.op("f64_gt"); break;
      case "<=": this.f.op("f64_le"); break;
      case ">=": this.f.op("f64_ge"); break;
    }
  }

  genLogical(node) {
    if (node.op==="&&") this.noZeroCompare.add(node.right);
    this.genTruth(node.left);
    this.genTruth(node.right);
    this.f.op(node.op === "&&" ? "i32_and" : node.op === "||" ? "i32_or" : "i32_xor");
    this.f.op("i64_extend_i32_u");
    return T.I64;
  }

  genShortCircuit(node) {
    if (node.op==="&&") this.noZeroCompare.add(node.right);
    this.genCond(node.left); // i32
    const m = this.pushCtrl(); this.f.if_(VT.i64);
    if (node.op === "&&") {
      this.genCond(node.right); this.f.op("i64_extend_i32_u");
      this.f.else_(); this.f.i64_const(0);
    } else {
      this.f.i64_const(1);
      this.f.else_(); this.genCond(node.right); this.f.op("i64_extend_i32_u");
    }
    this.f.end(); this.popCtrl();
    return T.I64;
  }

  // a<b<c: each operand is evaluated once, in order, and compared with the
  // next, and the results are anded (Compiler/PrsExp.HC:225-230). In a test
  // (short), a compare that fails ends it. Leaves an i32.
  genChain(node, short) {
    const xs = node.operands, n = node.ops.length;
    const ty = xs.map((x) => this.cg.resolveType(this.peekType(x)));
    const keep = ty.map((t) => (isFloat(t) ? T.F64 : T.I64));
    const tmp = [];
    // IC_PUSH_CMP carries the previous integer comparison class forward.
    const integerChain=ty.every(isInt);
    let chainUnsigned=false;
    const pairFloat = (k) => isFloat(ty[k]) || isFloat(ty[k + 1]);
    const operand = (i, want) => {
      if (tmp[i] != null) this.f.local_get(tmp[i]);
      else {
        this.genExprCoerce(xs[i], keep[i]);
        if (i > 0 && i < n) { tmp[i] = this.newWLocal(isFloat(keep[i]) ? VT.f64 : VT.i64); this.f.local_tee(tmp[i]); }
      }
      this.coerce(isFloat(keep[i]) ? T.F64 : isUnsigned(ty[i]) ? T.U64 : T.I64, want);
    };
    for (let k = 0; k < n; k++) {
      if (k > 0 && short) { this.pushCtrl(); this.f.if_(VT.i32); }
      const want = pairFloat(k) ? T.F64 : T.I64;
      operand(k, want);
      operand(k + 1, want);
      if (pairFloat(k)) this.floatCmp(node.ops[k]);
      else {
        const unsigned=integerChain?this.comparisonUnsigned(xs[k]) || this.comparisonUnsigned(xs[k+1]):
          isUnsigned(ty[k]) || isUnsigned(ty[k+1]);
        if (integerChain) chainUnsigned ||= unsigned;
        this.intCmp(node.ops[k],integerChain?chainUnsigned:unsigned);
      }
      if (k > 0 && !short) this.f.op("i32_and");
    }
    if (short) for (let k = 1; k < n; k++) { this.f.else_(); this.f.i32_const(0); this.f.end(); this.popCtrl(); }
  }

  genCondExpr(node) {
    const rt = this.peekType(node.then);
    const wantFloat = isFloat(this.cg.resolveType(rt)) || isFloat(this.cg.resolveType(this.peekType(node.else)));
    this.genCond(node.cond);
    const m = this.pushCtrl(); this.f.if_(wantFloat ? VT.f64 : VT.i64);
    this.genExprCoerce(node.then, wantFloat ? T.F64 : T.I64);
    this.f.else_();
    this.genExprCoerce(node.else, wantFloat ? T.F64 : T.I64);
    this.f.end(); this.popCtrl();
    return wantFloat ? T.F64 : T.I64;
  }

  genUnary(node) {
    if (node.op === "&") {
      if (this.exportedAddress(node.operand)) return this.genIdent(node.operand);
      // address-of; function name -> id constant
      if (node.operand.kind === "Ident") {
        const fn = this.functionAt(node.operand);
        if (fn && !this.localBinding(node.operand) && !this.cg.globals.has(node.operand.name)) {
          if (!this.cg.lenient && !fn.node && !fn.isImport && !fn.forward &&
              !(this.cg.opts.jitMain ?? this.cg.jit)?.laterBodies?.has(fn.name))
            this.err(node, "Unresolved function: " + fn.name);
          this.f.references.add(fn.index);
          this.f.i64_const(this.cg.functionAddress(fn));
          return funcPtr(fn.retType,fn.params,fn.isVarArgs);
        }
      }
      this.recordGlobalEscape(node.operand);
      const t = this.genAddr(node.operand);
      return ptrTo(t);
    }
    if (node.op === "*") {
      const t = this.genExpr(node.operand);
      const rt = this.cg.resolveType(t);
      if (isFuncPtr(rt)) return rt;
      const et = isPtr(rt) || isArray(rt) ? elemType(rt) : T.I64;
      //V5.03 keeps function-pointer expressions in a register: unary *
      //reduces their pointer depth without loading the pointed-to cell.
      if (isFuncPtr(et)) return et;
      if (isAggregate(this.cg.resolveType(et))) return et;
      this.f.op("i32_wrap_i64"); this.emitLoad(this.cg.resolveType(et));
      return et;
    }
    if (node.op === "!") { this.genTruth(node.operand); this.f.op("i32_eqz").op("i64_extend_i32_u"); return T.I64; }
    if (node.op === "++" || node.op === "--") return this.genIncDec(node.operand, node.op, true);
    // - ~ +
    const t = this.genExpr(node.operand);
    const rt = this.cg.resolveType(t);
    if (node.op === "-") { if (isFloat(rt)) this.f.op("f64_neg"); else { this.f.i64_const(-1).op("i64_mul"); } return this.peekType(node); }
    if (node.op === "~") { this.coerceTopTo(T.I64); this.f.i64_const(-1).op("i64_xor"); return rt; }
    if (node.op === "+") return rt;
    this.err(node, "bad unary " + node.op);
  }

  genPostfix(node) {
    return this.genIncDec(node.operand, node.op, false);
  }

  genIncDec(target, op, prefix) {
    // V5.03 discards prefix flags on a bare exported address: no dereference
    // is generated, so neither the symbol nor its returned value changes.
    if (prefix && this.exportedAddress(target)) return this.genIdent(target);
    const delta = op === "++" ? 1 : -1;
    const wl = this.wlocalTarget(target);
    if (wl) {
      const { L, type: t, own } = wl;
      const step = () => {
        this.f.local_get(L.windex); this.reinterpret(own, t);
        if (isFloat(t)) this.f.f64_const(delta).op("f64_add");
        else this.f.i64_const(delta * (isPtr(t) ? this.cg.typeSize(t.to) : 1)).op("i64_add");
        if (!L.nativeReg && isInt(t)) this.narrowInt(t);
        this.reinterpret(t, own);
      };
      if (prefix) { step(); this.f.local_tee(L.windex); this.reinterpret(own, t); }
      else { this.f.local_get(L.windex); this.reinterpret(own, t); step(); this.f.local_set(L.windex); }
      return t;
    }
    // memory lvalue
    const t = this.cg.resolveType(this.genAddr(target));
    const addr = this.scratchI32(); this.f.op("i32_wrap_i64").local_set(addr);
    const isF = isFloat(t);
    const res = isF ? this.scratchF64() : this.scratchI64();
    // old value
    this.f.local_get(addr); this.emitLoad(t); this.f.local_tee(res);
    // new value = old + delta
    if (isF) this.f.f64_const(delta).op("f64_add");
    else this.f.i64_const(delta * (isPtr(t) ? this.cg.typeSize(t.to) : 1)).op("i64_add");
    if (isInt(t)) this.narrowInt(t);
    const nv = isF ? this.scratchF64b() : this.scratchI64b();
    this.f.local_set(nv);           // consume the computed value into nv (no stack leak)
    // store new
    this.f.local_get(addr); this.f.local_get(nv); this.emitStore(t);
    // result
    this.f.local_get(prefix ? nv : res);
    return t;
  }
  scratchI64b() { return this.scratch.i64b ??= this.newWLocal(VT.i64); }
  //A call through the table (codegen tableSig): sig's args are on the stack.
  callTable(sig,target) {
    const f=this.f,table=this.cg.tableSig(sig);
    if (sig.params.includes(VT.f64)) {
      const spill=sig.params.map(vt=>this.newWLocal(vt));
      for (let i=spill.length-1;i>=0;i--) f.local_set(spill[i]);
      spill.forEach((local,i)=>{f.local_get(local);if (sig.params[i]===VT.f64) f.op("i64_reinterpret_f64");});
    }
    f.local_get(target).call_indirect(this.cg.m.typeIndex(table.params,table.results));
    if (!sig.results.length) f.drop();
    else if (sig.results[0]===VT.f64) f.op("f64_reinterpret_i64");
  }
  scratchF64b() { return this.scratch.f64b ??= this.newWLocal(VT.f64); }

  // ================================================== calls
  genCall(node) {
    const callee = node.callee,type=this.peekType(callee);
    if (isFuncPtr(type)) {
      this.f.indirectCalls=true;
      const target=this.newWLocal(VT.i32),sig=this.cg.wasmSig(type.params,type.retType,type.isVarArgs);
      this.genExpr(callee);
      this.f.op("i32_wrap_i64").local_set(target);
      const bytes=this.emitArgs(type.params,node.args,node,type.isVarArgs);
      this.callTable(sig,target);
      this.releaseArgs(bytes);
      //A null-only callback still needs a table so a call traps at runtime.
      if (!this.cg.m.table && !this.cg.m.importTables.length) this.cg.m.setTable(1);
      return type.retType;
    }
    if (callee.kind === "Ident") {
      if (callee.name==="__memsize" || callee.name==="__memgrow") {
        const count=callee.name==="__memgrow"?1:0;
        if (node.args.length!==count || node.args.some(arg=>!arg))
          this.err(node,callee.name+" requires "+count+" arguments");
        if (count) {
          this.genExprCoerce(node.args[0],T.I64);
          const pages=this.newWLocal(VT.i64);
          this.f.local_tee(pages).i64_const(65536).op("i64_gt_u")
            .if_(VT.i64).i64_const(-1).else_().local_get(pages)
            .op("i32_wrap_i64").memory_grow().op("i64_extend_i32_s").end();
        } else this.f.memory_size().op("i64_extend_i32_u");
        return T.I64;
      }
      if (callee.name==="__memfill" || callee.name==="__memcopy") {
        if (node.args.length!==3 || node.args.some(arg=>!arg))
          this.err(node,"memory intrinsic needs three arguments");
        const locals=node.args.map(()=>this.newWLocal(VT.i64));
        for (let i=2;i>=0;i--) {
          this.genExprCoerce(node.args[i],T.I64);
          this.f.local_set(locals[i]);
        }
        for (let i=0;i<3;i++) if (i!==1 || callee.name==="__memcopy") {
          this.f.local_get(locals[i]).i64_const(0xFFFFFFFF).op("i64_gt_u");
          this.pushCtrl();this.f.if_().unreachable().end();this.popCtrl();
        }
        locals.forEach(local=>this.f.local_get(local).op("i32_wrap_i64"));
        if (callee.name==="__memfill") this.f.memory_fill();
        else this.f.memory_copy();
        return T.U0;
      }
      const unaryMath={__floor:"f64_floor",__ceil:"f64_ceil",__round:"f64_nearest",
        __trunc:"f64_trunc",__sqrt:"f64_sqrt",__abs:"f64_abs",__ctz:"i64_ctz",__clz:"i64_clz"};
      if (callee.name in unaryMath) {
        const type=unaryMath[callee.name].startsWith("f64")?T.F64:T.I64;
        if (node.args.length!==1 || !node.args[0]) this.err(node,"intrinsic needs one argument");
        this.genExprCoerce(node.args[0],type);
        this.f.op(unaryMath[callee.name]);
        return type;
      }
      if (callee.name==="Carry" && this.carry) {
        if (node.args.length) this.err(node,"Carry takes no args");
        this.f.local_get(this.carry.cf);return T.I64;
      }
      if (callee.name==="MyCore" && (callee.intrinsicFunction || !this.cg.functions.has("MyCore"))) {
        this.f.global_get(this.cg.coreGlobal);return T.I64;
      }
      //V5.03 KernelB.HH IC_GET_RSP: the stack a frame's addressable data is on.
      if (callee.name==="GetRSP" && (callee.intrinsicFunction || !this.cg.functions.has("GetRSP"))) {
        this.f.global_get(this.cg.spGlobal);return ptrTo(T.U8);
      }
      if (callee.name.startsWith("__a_")) { const r = this.genAtomic(callee.name, node.args); if (r) return r; }   // SMP intrinsic: native WASM atomic RMW (LOCK ops over shared memory)
      const fn = this.functionAt(callee);
      if (fn?.node?.filename==="<prelude>" &&
          ["Bt","Bts","Btr","Btc","LBts","LBtr","LBtc"].includes(fn.node.sourceName??callee.name)) {
        const bit=this.cg.fold(node.args[1],this.locals,{});
        //BackB.HC ICBitOps uses a 32-bit immediate operand for negative constants.
        if (bit!==null && bit<0n)
          node={...node,args:[node.args[0],{kind:"IntLit",value:BigInt.asUintN(5,bit)}]};
      }
      if (fn) return this.emitCall(fn, node.args, node);
      if (!this.cg.lenient) this.err(node, "Undefined identifier or untyped call: " + callee.name);
      this.warnOnce("unknown or untyped call to '" + callee.name + "' not supported");
      // evaluate args for side effects then push 0
      for (const a of node.args) if (a) this.dropIfValue(this.genExpr(a));
      this.f.i64_const(0); return T.I64;
    }
    if (!this.cg.lenient) this.err(node, "unsupported computed callee");
    this.warnOnce("computed callee not supported");
    this.f.i64_const(0); return T.I64;
  }

  //WASM atomics are seq-cst and require naturally aligned linear-memory addresses.
  genAtomic(name, args) {
    const m = /^__a_(load|store|add|and|or|xor|xchg|cmpxchg)(8|16|32|64)$/.exec(name);
    if (!m) return null;
    const op = m[1], size = +m[2];
    const count=op==='load'?1:op==='cmpxchg'?3:2;
    if(args.length!==count || args.some(arg=>!arg)) this.err(args[0],name+' requires '+count+' arguments');
    const SUB = {load:{8:0x14,16:0x15,32:0x16,64:0x11},store:{8:0x1B,16:0x1C,32:0x1D,64:0x18},
                  add:{8:0x22,16:0x23,32:0x24,64:0x1F}, and:{8:0x30,16:0x31,32:0x32,64:0x2D},
                  or:{8:0x37,16:0x38,32:0x39,64:0x34}, xor:{8:0x3E,16:0x3F,32:0x40,64:0x3B}, xchg:{8:0x45,16:0x46,32:0x47,64:0x42},
                  cmpxchg:{8:0x4C,16:0x4D,32:0x4E,64:0x49} };
    const ALIGN = { 8:0, 16:1, 32:2, 64:3 };
    this.genExprCoerce(args[0], T.I64); this.f.op("i32_wrap_i64");   // address
    if(op!=='load') this.genExprCoerce(args[1], T.I64);
    if (op === "cmpxchg") this.genExprCoerce(args[2], T.I64);        // replacement
    this.f.atomic(SUB[op][size], ALIGN[size]);
    return op==='store'?T.U0:T.I64;
  }

  emitCall(fn, args, node) {
    if (!this.cg.lenient && !fn.isImport && !fn.node && !fn.forward &&
        !(this.cg.opts.jitMain ?? this.cg.jit)?.laterBodies?.has(fn.name))
      this.err(node, "Unresolved function: " + fn.name);
    const bytes=this.emitArgs(fn.params||[],args,node,fn.isVarArgs);
    this.f.call(fn.index);
    this.releaseArgs(bytes);
    return fn.retType;
  }

  pureExpr(node) {
    if (!node) return true;
    switch (node.kind) {
      case "IntLit": case "CharLit": case "FloatLit": case "StrLit":
      case "BinLit": case "Sizeof": case "Offset": return true;
      case "Ident": return !!this.localBinding(node) || this.cg.globals.has(node.name) ||
        !this.cg.functions.has(node.name);
      case "Unary": return !["++","--"].includes(node.op) && this.pureExpr(node.operand);
      case "Cast": return this.pureExpr(node.operand);
      case "Binary": case "Logical": return this.pureExpr(node.left) && this.pureExpr(node.right);
      case "Chain": return node.operands.every(operand=>this.pureExpr(operand));
      case "Member": return this.pureExpr(node.base);
      case "Index": return this.pureExpr(node.base) && this.pureExpr(node.index);
      case "Cond": return this.pureExpr(node.cond) && this.pureExpr(node.then) && this.pureExpr(node.else);
      default: return false;
    }
  }

  releaseArgs(bytes) {
    if (bytes) this.f.global_get(this.cg.spGlobal).i64_const(bytes)
      .op("i64_add").global_set(this.cg.spGlobal);
  }

  // V5.03 PrsFunCall: lastclass is the name of the class of the last
  // argument given before it, less its stars; with none, it is 0.
  lastClass(args,i) {
    let last=null;
    for (let j=0;j<i && j<args.length;j++) if (args[j]) last=args[j];
    if (!last) return {kind:"IntLit",value:0n};
    let t=this.cg.resolveType(this.peekType(last));
    for (let depth=0;t && (isPtr(t) || isArray(t)) && depth<64;depth++)
      t=this.cg.resolveType(isPtr(t)?t.to:t.of);
    //I16 to U64 are unions over V5.03's internal types I16i to U64i
    //(Kernel/KernelA.HH:60-106, Compiler/CInit.HC:6-14), whose names it gives.
    const name=typeName(t)+(isInt(t) && t.bits>=16?"i":"");
    return {kind:"StrLit",bytes:[...name].map(c=>c.charCodeAt(0)&255),filename:last.filename,line:last.line};
  }

  emitArgs(params,args,node,isVarArgs=false) {
    const values=params.map((p,i)=>args[i]??(p.default?.kind==="LastClass"?this.lastClass(args,i):
      this.cg.defaultValues.get(p.default)??p.default)),
      types=params.map(p=>this.cg.resolveType(p.type));
    if (!this.cg.lenient && values.some(value=>value==null))
      this.err(node,"Missing required function argument");
    if (!this.cg.lenient && !isVarArgs && args.length>params.length)
      this.err(node,"Too many function arguments");
    if (isVarArgs) {
      const extra=args.slice(params.length);
      if (extra.some(value=>value==null)) this.err(node,"Missing variable argument");
      const extraLocals=extra.map(()=>this.newWLocal(VT.i64)),
        locals=types.map(type=>this.newWLocal(wasmValType(type)));
      for (let i=extra.length-1;i>=0;i--) {
        const type=this.genExpr(extra[i]);
        if (isVoid(type)) this.f.i64_const(0);
        else if (isFloat(type)) this.f.op("i64_reinterpret_f64");
        this.f.local_set(extraLocals[i]);
      }
      for (let i=values.length-1;i>=0;i--) {
        if (values[i]!=null) this.genExprCoerce(values[i],types[i]);
        else this.pushZero(types[i]);
        this.f.local_set(locals[i]);
      }
      const bytes=(extra.length+1)*8;
      this.f.stackCheck(bytes);
      this.f.global_get(this.cg.spGlobal).i64_const(bytes).op("i64_sub")
        .global_set(this.cg.spGlobal);
      this.f.global_get(this.cg.spGlobal).op("i32_wrap_i64").i64_const(extra.length)
        .store("i64_store",0,3);
      extraLocals.forEach((local,i)=>this.f.global_get(this.cg.spGlobal)
        .op("i32_wrap_i64").local_get(local).store("i64_store",(i+1)*8,3));
      locals.forEach(local=>this.f.local_get(local));
      this.f.global_get(this.cg.spGlobal);
      return bytes;
    }
    const push=i=>values[i]!=null?this.genExprCoerce(values[i],types[i]):this.pushZero(types[i]);
    //Native PrsFunCall assembles argument blocks from right to left.
    if (values.every(value=>this.pureExpr(value)) && args.length<=params.length) {
      values.forEach((_,i)=>push(i));
      return;
    }
    for (let i=args.length-1;i>=params.length;i--)
      if (args[i]) this.dropIfValue(this.genExpr(args[i]));
    const locals=types.map(type=>this.newWLocal(wasmValType(type)));
    for (let i=values.length-1;i>=0;i--) {push(i);this.f.local_set(locals[i]);}
    locals.forEach(local=>this.f.local_get(local));
  }

  // ================================================== coercion / load / store
  genExprCoerce(node, wantType) {
    if (node.kind==="Binary" && node.op==="*" &&
        isInt(this.cg.resolveType(wantType)) &&
        isFloat(this.cg.resolveType(this.peekType(node.left))) &&
        isFloat(this.cg.resolveType(this.peekType(node.right)))) {
      const fn=this.cg.functions.get(FLOAT_MUL_I64);
      if (fn) {
        this.genExprCoerce(node.left,T.F64);
        this.genExprCoerce(node.right,T.F64);
        this.f.call(fn.index);
        this.narrowInt(this.cg.resolveType(wantType));
        return wantType;
      }
    }
    const t = this.genExpr(node);
    return this.coerce(t, wantType);
  }
  coerce(curType, wantType) {
    const c = this.cg.resolveType(curType), w = this.cg.resolveType(wantType);
    if (isVoid(w)) { if (!isVoid(c)) this.f.drop(); return w; }
    if (isVoid(c)) { // value of a void expr used where a value is needed -> 0
      if (isFloat(w)) this.f.f64_const(0); else this.f.i64_const(0);
      return w;
    }
    const cF = isFloat(c), wF = isFloat(w);
    if (cF && wF) return w;
    if (!cF && !wF) { this.narrowInt(w); return w; }
    if (!cF && wF) { this.f.op("f64_convert_i64_s"); return w; }
    // cF && !wF
    this.floatToInt(); this.narrowInt(w); return w;
  }
  floatToInt() {
    //V5.03 uses signed FISTTP: invalid conversion gives integer indefinite.
    const value = this.scratchF64();
    this.f.local_tee(value).f64_const(9223372036854775808).op("f64_lt");
    this.f.if_(VT.i64);
    this.f.local_get(value).fc("i64_trunc_sat_f64_s");
    this.f.else_().i64_const(-9223372036854775808n).end();
  }
  coerceTopTo(wantType) { /* value already correct width-ish; ensure narrow */ this.narrowInt(this.cg.resolveType(wantType)); }
  narrowInt(w) {
    if (!isInt(w)) return;
    const bits = w.bits;
    if (bits >= 64) return;
    if (w.signed) {
      if (bits === 8) this.f.op("i64_extend8_s");
      else if (bits === 16) this.f.op("i64_extend16_s");
      else if (bits === 32) this.f.op("i64_extend32_s");
    } else {
      const mask = (1n << BigInt(bits)) - 1n;
      this.f.i64_const(mask).op("i64_and");
    }
  }

  emitLoad(t) {
    let rt = this.cg.resolveType(t);
    if (isAggregate(rt)) rt = T.I64; // aggregates handled by address; load as i64 word
    const { op } = loadOp(rt);
    this.emitRawLoad(op, 0);
  }
  emitStore(t) {
    let rt = this.cg.resolveType(t);
    if (isAggregate(rt)) rt = T.I64; // store the pointer-width word
    const op = storeOp(rt);
    this.emitRawStore(op, 0);
  }
  emitRawLoad(op, off) { this.f.load(op, off, 0); }
  emitRawStore(op, off) { this.f.store(op, off, 0); }
}

function isCmp(op) { return [">","<",">=","<=","==","!="].includes(op); }
function isUnsigned(t) { return t && t.kind === "int" && !t.signed; }
function literalType(value) { return BigInt.asIntN(64, BigInt(value)) < 0n ? T.U64 : T.I64; }
