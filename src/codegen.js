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
//   - a host bump-heap above HEAP_BASE for MAlloc
import { Module, Func, VT, EMPTY_BLOCK } from "./wasm/emitter.js";
import {
  T, BASE_TYPES, ptrTo, arrayOf, funcPtr, isFuncPtr, isInt, isFloat, isPtr, isArray, isVoid,
  isClass, isAggregate, isScalar, sizeof, elemType, wasmValType, loadOp, storeOp,
  binResultType, typeName, UNION_MEMBERS,
} from "./types.js";
import {
  HOST_IMPORTS, DATA_BASE, STACK_TOP, HEAP_BASE, MEM_INITIAL_PAGES,
  MEM_MAX_PAGES, ARG_BUF, ARG_SLOT, TAG_INT, TAG_FLT, MS_ADDR, JUNK_ADDR,
  COLOR_NAMES, GR_WIDTH, GR_HEIGHT,
} from "./abi.js";
import { foldConstInt, foldDim } from "./fold.js";
import { usesGoto, Gotos } from "./goto.js";

const PINNED_GLOBALS = { ms: MS_ADDR };

export class CodegenError extends Error {}

export function compile(programAst, opts = {}) {
  return new Codegen(programAst, opts).run();
}

class Codegen {
  constructor(program, opts) {
    this.program = program;
    this.opts = opts;
    this.m = new Module();
    this.classes = new Map();   // name -> ClassDecl node
    this.classLayouts = new Map(); // name -> {size, align, fields:Map}
    this.functionAddresses=new Map();
    this.functions = new Map(); // name -> fn record
    this.globals = new Map();   // name -> {addr, type}
    this.constEnv = {};         // name -> bigint, for #define-like enum constants
    this.data = [];             // {addr, bytes}
    this.strings = new Map();   // key -> addr
    this.literals = new WeakMap();
    this.cursor = DATA_BASE;
    this.warnings = [];
    // Lenient mode (default ON): unknown kernel symbols/fields/calls become safe
    // fallbacks so whole programs compile & run, with unsupported features as
    // documented no-ops. Strict tests pass {lenient:false} to surface real bugs.
    this.lenient = opts.lenient !== false;
    this.unknownSyms = new Set();
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
    if (!Number.isFinite(size)) { if (this.lenient) { this.warn("non-finite alloc size; using 8"); size = 8; } else throw new CodegenError("non-finite alloc size " + size); }
    if (!Number.isFinite(align) || align < 1) align = 8;
    this.cursor = align8(this.cursor, align);
    const a = this.cursor;
    this.cursor += size;
    return a;
  }

  internBytes(bytes, nulTerminate = true) {
    const arr = nulTerminate ? [...bytes, 0] : [...bytes];
    const key = arr.join(",");
    if (this.strings.has(key)) return this.strings.get(key);
    const addr = this.alloc(arr.length, 1);
    this.data.push({ addr, bytes: arr });
    this.strings.set(key, addr);
    return addr;
  }

  literalBytes(node) {
    if (this.literals.has(node)) return this.literals.get(node);
    const bytes = node.kind === "BinLit" ? node.bytes : [...node.bytes, 0];
    const addr = this.alloc(bytes.length, 1);
    this.data.push({ addr, bytes });
    this.literals.set(node, addr);
    return addr;
  }

  // ============================================================ run
  run() {
    // host imports first
    // SMP: with opts.sharedMemory, IMPORT a shared memory (env.mem) so N instances share guest RAM;
    // still exported as "memory" (index 0) so existing consumers of inst.exports.memory keep working.
    if (this.opts.sharedMemory) this.m.importMemory("env", "mem", MEM_INITIAL_PAGES, MEM_MAX_PAGES, true);
    else this.m.setMemory(MEM_INITIAL_PAGES, MEM_MAX_PAGES);
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
    this.collectSourceImports();
    this.collectFunctions();

    // reserve __rt_init and __main
    this.rtInit = this.m.func([], []);
    this.mainFn = this.m.func([], []);

    // PASS 2: generate bodies
    for (const fn of this.functions.values()) {
      if (fn.isImport) continue;
      if (fn.node && fn.node.body) { this.genFunctionBody(fn); continue; }
      //Unused prototypes reserve a slot; strict references to them are errors.
      if (fn.slot) this.genStubBody(fn);
    }
    this.genRtInit();
    this.genMain();

    if (this.functionAddresses.size) {
      this.m.setTable(this.functionAddresses.size+1);
      this.m.addElement(1,[...this.functionAddresses.keys()]);
      this.m.exportTable("__functions");
    }

    // emit static data
    for (const d of this.data) this.m.addData(d.addr, d.bytes);

    // exports
    this.m.exportMemory("memory");
    this.m.exportFunc("__main", this.mainFn.index);
    this.m.exportFunc("__rt_init", this.rtInit.index);
    this.m.exportGlobal("__sp", this.spGlobal);
    this.m.exportGlobal("__core", this.coreGlobal);   // SMP: host sets each worker's core index here
    // functions the host calls back into (a runtime JIT's memory/step hooks, guest-execution entry points,
    // test probes): named by the caller via opts.exports - the compiler has no built-in list.
    for (const nm of new Set(this.opts.exports || [])) {
      const fn = this.functions.get(nm);
      if (fn && fn.slot) {
        if (!this.lenient && !fn.node) throw new CodegenError("Unresolved exported function: " + nm);
        this.m.exportFunc(nm, fn.slot.index);
      }
    }

    const bytes = this.m.emit();
    return { bytes, warnings: this.warnings, dataEnd: this.cursor, globals: this.globals };
  }

  exceptionTag() {
    if (this.exceptionTagIndex===undefined) {
      this.exceptionTagIndex=this.m.addTag([VT.i64]);
      this.m.exportTag("__exception_tag",this.exceptionTagIndex);
    }
    return this.exceptionTagIndex;
  }

  functionAddress(fn) {
    if (!this.functionAddresses.has(fn.index))
      this.functionAddresses.set(fn.index,this.functionAddresses.size+1);
    return this.functionAddresses.get(fn.index);
  }

  // ============================================================ classes
  collectClasses() {
    for (const d of this.program.decls) {
      if (d.kind === "ClassDecl" && d.name) this.classes.set(d.name, d);
    }
  }

  layoutClass(name) {
    if (this.classLayouts.has(name)) return this.classLayouts.get(name);
    const node = this.classes.get(name);
    if (!node) throw new CodegenError("unknown class " + name);
    const fields = new Map();
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
      let ty = this.resolveType(mem.type);
      if (ty && ty.kind === "class" && !this.classes.has(ty.name)) {
        if (this.lenient) { this.warn(`unknown class '${ty.name}' as member ${name}.${mem.name}; treated as I64`); ty = T.I64; }
        else throw new CodegenError(`class ${name}: member '${mem.name}' has unknown class type '${ty.name}'`);
      }
      const sz = this.typeSize(ty);
      if (node.isUnion) {
        fields.set(mem.name, { type: ty, offset: 0 });
        maxSize = Math.max(maxSize, sz);
      } else {
        fields.set(mem.name, { type: ty, offset: off });
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
  resolveType(t) {
    if (!t) return T.I64;
    switch (t.kind) {
      case "classref": {
        const base=this.classes.get(t.name)?.scalarBase;
        return base?{...this.resolveType(base),name:t.name}:{kind:"class",name:t.name};
      }
      case "ptr": return ptrTo(this.resolveType(t.to));
      case "funcptr": return funcPtr(this.resolveType(t.retType),
        t.params.map(p=>({...p,type:this.resolveType(p.type)})),t.isVarArgs);
      case "array": {
        const of = this.resolveType(t.of);
        let count;
        try { count = t.count == null ? 0 : foldDim(t.count, this.constEnv); }
        catch (e) { if (this.lenient) { count = 1; this.warn("non-constant array dimension; assumed [1]"); } else throw e; }
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

  // ============================================================ globals
  collectGlobals() {
    for (const d of this.program.decls) {
      if (d.kind === "VarDecl") this.declareGlobal(d);
      if (d.kind === "ClassDecl" && d.vars) for (const v of d.vars) this.declareGlobal(v);
    }
  }
  declareGlobal(d) {
    if (this.globals.has(d.name)) return;
    const ty = this.resolveType(d.type);
    let addr;
    if (d.name in PINNED_GLOBALS) addr = PINNED_GLOBALS[d.name];
    else addr = this.alloc(this.typeSize(ty), this.typeAlign(ty));
    this.globals.set(d.name, { addr, type: ty, init: d.init, node: d });
    // record simple integer constant for const-folding of later dims
    const c = d.init && foldConstInt(d.init, this.constEnv);
    if (c != null) this.constEnv[d.name] = c;
  }

  // Emit a constant integer-array global (sprite/bitmap data, lookup tables) as a
  // single wasm DATA SEGMENT at the global's address, instead of thousands of
  // per-element stores in __rt_init. Returns true if handled; returns false (so
  // the caller falls back to runtime stores) for float arrays, nested lists, or
  // any non-constant element. wasm memory is zero-initialized, so a partial
  // initializer leaves the remainder 0, matching C semantics.
  tryStaticConstArray(g) {
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
      const c = foldConstInt(el, this.constEnv);
      if (c == null) return false;                   // non-constant element: fall back
      let v = BigInt.asUintN(64, c);
      for (let b = 0; b < esz; b++) { bytes.push(Number(v & 0xffn)); v >>= 8n; }
    }
    if (bytes.length > cap) bytes.length = cap;       // never write past the global
    this.data.push({ addr: g.addr, bytes });         // -> m.addData(addr, bytes)
    return true;
  }

  // ============================================================ functions
  collectFunctions() {
    // host intrinsics visible as callable HolyC functions
    for (const [name, info] of Object.entries(this.imports)) {
      const sig = info.sig;
      this.functions.set(name, {
        name, isImport: true, index: info.index,
        params: sig.params.map((vt) => ({ type: vt === VT.f64 ? T.F64 : T.I64 })),
        retType: sig.results.length ? (sig.results[0] === VT.f64 ? T.F64 : T.I64) : T.U0,
      });
    }
    for (const d of this.program.decls) {
      if (d.kind !== "FuncDecl") continue;
      if (!d.body) {
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
    for (const d of this.program.decls) {
      if (d.kind !== "FuncDecl" || d.body || !d.storage?.includes("import")) continue;
      if (this.imports[d.name] || defined.has(d.name)) continue;
      const params = d.params.map((p) => ({ type: this.resolveType(p.type), name: p.name, default: p.default }));
      const sig = this.wasmSig(params, this.resolveType(d.retType));
      const idx = this.m.importFunc("env", d.name, sig.params, sig.results);
      this.imports[d.name] = { index: idx, sig };
    }
  }
  registerFuncSig(d, bodyNode) {
    const params = d.params.map((p) => ({
      type: this.resolveType(p.type), name: p.name, default: p.default,
    }));
    const retType = this.resolveType(d.retType);
    const sig = this.wasmSig(params, retType);
    let index;
    const existing = this.functions.get(d.name);
    if (existing && !existing.isImport && existing.slot) {
      index = existing.slot.index;
    } else {
      const slot = this.m.func(sig.params, sig.results, d.name);
      index = slot.index;
      this.functions.set(d.name, {
        name: d.name, isImport: false, index, slot, params, retType, node: bodyNode,
      });
      return;
    }
    if (bodyNode) { existing.node = bodyNode; existing.params = params; existing.retType = retType; }
  }
  wasmSig(params, retType) {
    return {
      params: params.map((p) => (isFloat(this.resolveType(p.type)) ? VT.f64 : VT.i64)),
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
    if (!this.lenient) {
      f.unreachable();
      fn.slot.setBody([], f);
      return;
    }
    if (!isVoid(fn.retType)) { isFloat(fn.retType) ? f.f64_const(0) : f.i64_const(0); }
    fn.slot.setBody([], f);
    this.warn(`extern/prototype '${fn.name}' has no body; stubbed (returns 0)`);
  }

  genRtInit() {
    const ctx = new FnCtx(this, { name: "__rt_init", params: [], retType: T.U0, node: { body: null } });
    const f = ctx.f;
    // RUN-ONCE guard: __main calls __rt_init on every invocation (per frame in the emulator), but
    // global initializers must apply exactly once - re-running them silently reverted every mutated
    // initialized global each frame (e.g. a scan cursor reset to its initial value 60×/s).
    const guard = this.alloc(8, 8);
    f.i64_const(guard); f.op("i32_wrap_i64"); f.load("i64_load", 0, 3); f.op("i64_eqz");
    f.if_();
    f.i64_const(guard); f.op("i32_wrap_i64"); f.i64_const(1); f.store("i64_store", 0, 3);
    //Native tasks already exist when user global initializers execute.
    const hook=this.functions.get("__hcrt_init");
    if (hook && !hook.isImport) f.call(hook.index);
    for (const g of this.globals.values()) {
      if (g.init==null) continue;
      ctx.genGlobalInit(g);
    }
    f.end();
    ctx.endFrameFallthrough();
    this.rtInit.setBody(ctx.localDecls(), f);
  }

  genMain() {
    // __main runs prelude rt-init, then top-level statements as a synthetic body
    const bodyBlock = { kind: "Block", stmts: this.program.topStmts };
    const fakeFn = { name: "__main", params: [], retType: T.U0, node: { body: bodyBlock } };
    const ctx = new FnCtx(this, fakeFn);
    const f = ctx.f;
    f.call(this.rtInit.index);
    ctx.beginFrame();
    ctx.genStmt(bodyBlock);
    ctx.endFrameFallthrough();
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
    this.paramCount = fn.params.length;

    // params occupy wasm locals 0..n-1
    this.nextWLocal = this.paramCount;

    // analyze + assign storage
    this.addrTaken = new Set();
    if (fn.node && fn.node.body) this.findAddrTaken(fn.node.body, this.addrTaken);
    this.assignParams();
    if (fn.node && fn.node.body) this.collectLocals(fn.node.body);
    this.gotos = fn.node && fn.node.body && usesGoto(fn.node.body) ? new Gotos(this, fn.node.body, fn.name === "__main") : null;
  }

  // ---- diagnostics ----
  err(node, msg) { throw new CodegenError(`line ${node && node.line}: ${msg}`); }

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
        this.locals.set(p.name, { kind: "reflocal", windex: i, type: ty });
      } else if (this.addrTaken.has(p.name)) {
        const off = this.allocSlot(this.cg.typeSize(ty), this.cg.typeAlign(ty));
        this.locals.set(p.name, { kind: "slot", offset: off, type: ty, paramIndex: i });
      } else {
        this.locals.set(p.name, { kind: "wlocal", windex: i, type: ty });
      }
    });
  }
  allocSlot(size, align) {
    this.frameSize = align8(this.frameSize, align) + size;
    return this.frameSize; // offset from base measured DOWN (we use fp+ (frameSize-offset))? simpler: store absolute below
  }
  collectLocals(node) {
    const visitDecl = (vd) => {
      if (this.locals.has(vd.name)) return;
      const ty = this.cg.resolveType(vd.type);
      if (isAggregate(ty) || this.addrTaken.has(vd.name) || this.needsUnionAddr(vd.name)) {
        const off = this.allocSlot(this.cg.typeSize(ty), this.cg.typeAlign(ty));
        this.locals.set(vd.name, { kind: "slot", offset: off, type: ty, init: vd.init });
      } else {
        const vt = isFloat(ty) ? VT.f64 : VT.i64;
        const widx = this.newWLocal(vt);
        this.locals.set(vd.name, { kind: "wlocal", windex: widx, type: ty, init: vd.init });
      }
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
  needsUnionAddr(name) { return this.addrTaken.has(name); }

  findAddrTaken(node, set) {
    const markRoot = (n) => {
      while (n) {
        if (n.kind === "Ident") { set.add(n.name); return; }
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
      case "ExprStmt": { const t = this.genExpr(s.expr); this.dropIfValue(t); return; }
      case "Print": this.genPrint(s); return;
      case "PutChars": this.genPutChars(s.bytes); return;
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
      if (!desc) continue;
      if (d.init == null) continue;
      if (desc.kind === "slot") this.genStoreInit(desc);
      else { this.genExprCoerce(d.init, desc.type); this.f.local_set(desc.windex); }
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
      if (init.bytes.length > size) this.err(init, "string initializer exceeds array");
      pushAddr(); this.f.op("i32_wrap_i64");
      this.f.i32_const(0).i32_const(size).memory_fill();
      pushAddr(); this.f.op("i32_wrap_i64");
      this.f.i32_const(this.cg.literalBytes(init));
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
    // Constant integer arrays (sprite/bitmap data, tables) compile to one wasm
    // data segment rather than thousands of per-element stores - instant to emit.
    if (g.init.kind === "InitList" && this.cg.tryStaticConstArray(g)) return;
    const pushAddr = () => this.f.i64_const(g.addr);
    this.storeInitInto(pushAddr, g.type, g.init);
  }

  genReturn(s) {
    if (s.expr) {
      this.genExprCoerce(s.expr, this.fn.retType);
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
  }

  genSwitch(s) {
    const { labels, segs } = this.switchPlan(s);
    if (labels.length === 0) return;
    const disc = this.switchDisc(s);
    const brk = this.pushCtrl(); this.f.block();   // break target (outermost)
    // open one block per segment, innermost = seg0
    const segMarks = [];
    for (let i = segs.length - 1; i >= 0; i--) { segMarks[i] = this.pushCtrl(); this.f.block(); }
    const defLabel = labels.find((l) => l.isDefault);
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
          let lo = it.lo ? foldConstInt(it.lo, this.cg.constEnv) : null;
          let hi = it.hi ? foldConstInt(it.hi, this.cg.constEnv) : null;
          // Non-constant case value: keep the AST node for a runtime compare.
          const loExpr = (lo == null && it.lo) ? it.lo : null;
          if (lo == null && !loExpr) { lo = prev + 1n; }        // empty `case:` auto-number
          if (it.hi && hi == null) hi = lo;                      // unfoldable range hi -> single
          if (!it.hi) hi = lo;
          if (lo != null) prev = (hi != null ? hi : lo);
          labels.push({ isDefault: false, lo, hi, loExpr, segIdx: segs.length });
        }
      } else if (it.type === "start" || it.type === "end") {
        // sub-switch markers: treated as plain fall-through points (limited)
      } else if (it.type === "stmt") {
        if (started) cur.push(it.stmt); else pre.push(it.stmt);
      }
    }
    if (started) pushSeg();
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
    if (isFloat(t)) { this.f.f64_const(0).op("f64_ne"); }
    else { this.f.i64_const(0).op("i64_ne"); }
  }

  genTruth(node) {
    if (node.kind === "Unary" && node.op === "!") { this.genTruth(node.operand); this.f.op("i32_eqz"); return; }
    const t = this.genExpr(node);
    if (isFloat(t)) { this.f.f64_const(0).op("f64_ne"); }
    else { this.f.i64_const(0).op("i64_ne"); }
  }

  dropIfValue(t) { if (t && !isVoid(t)) this.f.drop(); }

  // ================================================== print
  genPrint(s) {
    const fmtAddr=this.cg.internBytes(s.bytes,true),args=s.args.filter(arg=>arg!=null),
      values=[];
    //Stage every value before writing the shared argument buffer: an argument
    //may itself print, and native Print evaluates its arguments right to left.
    for (let i=args.length-1;i>=0;i--) {
      let type=this.cg.resolveType(this.genExpr(args[i]));
      if (i>=64) {this.dropIfValue(type);continue;}
      if (isVoid(type)) {this.f.i64_const(0);type=T.I64;}
      const local=this.newWLocal(wasmValType(type));
      this.f.local_set(local);
      values[i]={local,float:isFloat(type)};
    }
    values.forEach((value,i)=>{
      const slot=ARG_BUF+i*ARG_SLOT;
      this.f.i32_const(slot).i64_const(value.float?TAG_FLT:TAG_INT);
      this.emitRawStore("i64_store",0);
      this.f.i32_const(slot+8).local_get(value.local);
      this.emitRawStore(value.float?"f64_store":"i64_store",0);
    });
    this.f.i64_const(fmtAddr).i64_const(values.length).call(this.cg.imports.__printf.index);
  }

  genPutChars(bytes) {
    // print up to N raw bytes
    const addr = this.cg.internBytes(bytes, false);
    this.f.i64_const(addr); this.f.i64_const(bytes.length); this.f.call(this.cg.imports.__print_bytes.index);
  }

  // ================================================== expressions
  // genExpr pushes a value and returns its HolyC type
  genExpr(node) {
    switch (node.kind) {
      case "IntLit": this.f.i64_const(node.value); return literalType(node.value);
      case "FloatLit": this.f.f64_const(node.value); return T.F64;
      case "CharLit": this.f.i64_const(node.value); return literalType(node.value);
      case "StrLit": case "BinLit": { const a = this.cg.literalBytes(node); this.f.i64_const(a); return ptrTo(T.U8); }
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
      case "Sizeof": { let sz = node.type ? this.cg.typeSize(this.cg.resolveType(node.type)) : this.cg.typeSize(this.peekType(node.expr)); if (!Number.isFinite(sz)) sz = 8; this.f.i64_const(sz); return T.I64; }
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
  inMemory(node) {
    switch (node.kind) {
      case "Ident": {
        const L = this.locals.get(node.name);
        if (L) return L.kind !== "wlocal";
        return this.cg.globals.has(node.name);
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
    const L = this.locals.get(node.name);
    if (!L || L.kind !== "wlocal") return null;
    return { L, type: type ?? this.cg.resolveType(L.type), own: this.cg.resolveType(L.type) };
  }

  // Static type of an expression without emitting code (best-effort).
  peekType(node) {
    switch (node.kind) {
      case "IntLit": case "CharLit": return literalType(node.value);
      case "FloatLit": return T.F64;
      case "StrLit": case "BinLit": return ptrTo(T.U8);
      case "Ident": {
        const L = this.locals.get(node.name); if (L) return this.cg.resolveType(L.type);
        const G = this.cg.globals.get(node.name); if (G) return G.type;
        const fn = this.cg.functions.get(node.name); if (fn) return fn.retType;
        if (node.name in this.cg.constEnv) return T.I64;
        return T.I64;
      }
      case "Cast": return this.cg.resolveType(node.type);
      case "Binary": {
        if (node.op === "`") return T.F64;
        const a = this.peekType(node.left), b = this.peekType(node.right);
        if ([">","<",">=","<=","==","!="].includes(node.op)) return T.I64;
        return binResultType(a, b);
      }
      case "Logical": case "Chain": return T.I64;
      case "Unary": {
        if (node.op === "&") {
          if (node.operand.kind==="Ident" && !this.locals.has(node.operand.name) &&
              !this.cg.globals.has(node.operand.name)) {
            const fn=this.cg.functions.get(node.operand.name);
            if (fn) return funcPtr(fn.retType,fn.params);
          }
          return ptrTo(this.peekType(node.operand));
        }
        if (node.op === "*") { const t = this.peekType(node.operand); return isPtr(t) || isArray(t) ? elemType(t) : T.I64; }
        if (node.op === "!") return T.I64;
        if (node.op === "-") {
          const t = this.peekType(node.operand);
          return isInt(t) ? { ...t, signed: true } : t;
        }
        return this.peekType(node.operand);
      }
      case "Postfix": return this.peekType(node.operand);
      case "Assign": return this.peekType(node.target);
      case "Cond": return this.peekType(node.then);
      case "Call": {
        const callee = node.callee,type=this.peekType(callee);
        if (isFuncPtr(type)) return type.retType;
        if (callee.kind === "Ident") { const fn = this.cg.functions.get(callee.name); if (fn) return fn.retType; }
        return T.I64;
      }
      case "Index": { const bt = this.peekType(node.base); return elemType(bt) || T.I64; }
      case "Member": return this.memberType(node);
      case "Sizeof": return T.I64;
      default: return T.I64;
    }
  }

  memberType(node) {
    let bt = this.peekType(node.base);
    if (node.arrow && isPtr(bt)) bt = bt.to;
    bt = this.cg.resolveType(bt);
    if (isInt(bt) && node.name in UNION_MEMBERS && !node.arrow) {
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
    const L = this.locals.get(node.name);
    if (L) {
      if (L.kind === "wlocal") { this.f.local_get(L.windex); return this.cg.resolveType(L.type); }
      if (L.kind === "reflocal") { this.f.local_get(L.windex); return this.cg.resolveType(L.type); }
      // slot
      const t = this.cg.resolveType(L.type);
      if (isAggregate(t)) { this.pushSlotAddr(L); return t; } // value is address
      this.pushSlotAddr(L); this.f.op("i32_wrap_i64"); this.emitLoad(t); return t;
    }
    const G = this.cg.globals.get(node.name);
    if (G) {
      const t = G.type;
      if (isAggregate(t)) { this.f.i64_const(G.addr); return t; }
      this.f.i64_const(G.addr); this.f.op("i32_wrap_i64"); this.emitLoad(t); return t;
    }
    if (node.name in this.cg.constEnv) { this.f.i64_const(this.cg.constEnv[node.name]); return T.I64; }
    const fn = this.cg.functions.get(node.name);
    if (fn) { return this.emitCall(fn, [], node); } // no-paren call
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
        if (this.locals.get(node.name)) return null;
        const G = this.cg.globals.get(node.name);
        if (!G) return null;
        return { addr: Number(G.addr), type: G.type };
      }
      if (node.kind === "Member" && !node.arrow) {
        const b = this.addrConst(node.base);
        if (!b) return null;
        const bt = this.cg.resolveType(b.type);
        if (!bt || !isClass(bt)) return null;
        const fld = this.fieldOf(bt, node.name);
        if (!fld) return null;
        return { addr: b.addr + Number(fld.offset || 0), type: fld.type };
      }
      if (node.kind === "Index") {
        const b = this.addrConst(node.base);
        if (!b) return null;
        const bt = this.cg.resolveType(b.type);
        if (!isArray(bt)) return null;
        const cidx = foldConstInt(node.index, this.cg.defines || {});
        if (cidx === null || cidx === undefined) return null;
        return { addr: b.addr + Number(cidx) * this.cg.typeSize(bt.of), type: bt.of };
      }
    } catch { return null; }
    return null;
  }

  genAddr(node) {
    if (!NOFOLD) { const ac = this.addrConst(node); if (ac) { this.f.i64_const(ac.addr); return ac.type; } }
    switch (node.kind) {
      case "Ident": {
        const L = this.locals.get(node.name);
        if (L) {
          if (L.kind === "slot") { this.pushSlotAddr(L); return this.cg.resolveType(L.type); }
          if (L.kind === "reflocal") { this.f.local_get(L.windex); return this.cg.resolveType(L.type); }
          this.err(node, "cannot take address of register local '" + node.name + "'");
        }
        const G = this.cg.globals.get(node.name);
        if (G) { this.f.i64_const(G.addr); return G.type; }
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
    else { // fallback treat as i64*
      this.genExpr(node.base); elemT = T.I64;
    }
    const esz = this.cg.typeSize(elemT);
    // constant index: fold idx*esz at compile time (a[0] adds NOTHING) - hot for the per-core
    // CPU-state pattern g_cpu_st[MY_CORE].f_reg[i], where a runtime 0*sizeof mul on every register
    // access cost the interpreter ~2x.
    const cidx = foldConstInt(node.index, this.cg.defines || {});
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
  fieldOf(cls, name) {
    cls = this.cg.resolveType(cls);
    if (isClass(cls) && this.cg.classes.has(cls.name)) return this.cg.classField(cls, name);
    if (this.cg.lenient) { this.cg.warnOnceCg(`member '.${name}' on non-class value; offset 0`); return { offset: 0, type: T.I64 }; }
    throw new CodegenError(`member access '.${name}' on non-class type`);
  }

  genMemberAddr(node) {
    if (!NOFOLD) { const ac = this.addrConst(node); if (ac) { this.f.i64_const(ac.addr); return ac.type; } }
    let bt = this.peekType(node.base);
    if (node.arrow) {
      bt = this.cg.resolveType(bt);
      const cls = isPtr(bt) ? this.cg.resolveType(bt.to) : bt;
      this.genExpr(node.base); // pointer value (base address)
      const fld = this.fieldOf(cls, node.name);
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
      const fld = this.fieldOf(cls, node.name);
      if (fld.offset) this.f.i64_const(fld.offset).op("i64_add");
      return fld.type;
    }
    // class (or lenient opaque) lvalue
    this.genAddr(node.base);
    const fld = this.fieldOf(bt, node.name);
    if (fld.offset) this.f.i64_const(fld.offset).op("i64_add");
    return fld.type;
  }

  genLoadLValue(node) {
    const t = this.genAddr(node);
    const rt = this.cg.resolveType(t);
    if (isAggregate(rt)) return rt; // address is the value
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
      const { L, type: t, own } = wl;
      if (op === "=") this.genExprCoerce(node.value, t);
      else {
        const pushLeft = () => { this.f.local_get(L.windex); this.reinterpret(own, t); };
        this.coerce(this.combineToValue(op.slice(0, -1), pushLeft, t, node.value), t);
      }
      this.reinterpret(t, own);
      this.f.local_tee(L.windex);
      this.reinterpret(own, t);
      return t;
    }
    // memory lvalue
    const t = this.cg.resolveType(this.genAddr(node.target)); // pushes addr (i64)
    const addr = this.scratchI32();
    this.f.op("i32_wrap_i64").local_set(addr);
    if (op === "=") {
      this.f.local_get(addr);
      this.genExprCoerce(node.value, t);
      // duplicate value for result via scratch
      const res = isFloat(t) ? this.scratchF64() : this.scratchI64();
      this.f.local_tee(res);
      this.emitStore(t);
      this.f.local_get(res);
      return t;
    } else {
      const base = op.slice(0, -1);
      this.f.local_get(addr); // address for the eventual store
      const vt = this.combineToValue(base, () => { this.f.local_get(addr); this.emitLoad(t); }, t, node.value);
      this.coerce(vt, t);
      const res = isFloat(t) ? this.scratchF64() : this.scratchI64();
      this.f.local_tee(res);
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
    if ((base === "+" || base === "-") && isPtr(lr) && isInt(rPeek)) {
      pushLeft();
      this.genExprCoerce(valueNode, T.I64);
      const size = this.cg.typeSize(lr.to);
      if (size !== 1) this.f.i64_const(size).op("i64_mul");
      this.f.op(base === "+" ? "i64_add" : "i64_sub");
      return lr;
    }
    const floatArith = (isFloat(lr) || isFloat(rPeek)) && ["+","-","*","/","%"].includes(base);
    if (floatArith) {
      pushLeft();
      if (!isFloat(lr)) this.f.op("f64_convert_i64_s");
      this.genExprCoerce(valueNode, T.F64);
      this.floatOp(base);
      return T.F64;
    }
    pushLeft();
    if (isFloat(lr)) this.floatToInt();
    this.genExprCoerce(valueNode, T.I64);
    this.intOp(base, isUnsigned(lr));
    return T.I64;
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
        this.genExprCoerce(node.right, T.F64);
        this.floatCmp(node.op);
      } else {
        this.genExprCoerce(node.left, T.I64);
        this.genExprCoerce(node.right, T.I64);
        const unsigned = isUnsigned(lr) || isUnsigned(rr);
        this.intCmp(node.op, unsigned);
      }
      this.f.op("i64_extend_i32_u");
      return T.I64;
    }
    // integer op (coerce truncates any float operand)
    this.genExprCoerce(node.left, T.I64);
    this.genExprCoerce(node.right, T.I64);
    this.intOp(node.op, isUnsigned(lr) || isUnsigned(rr));
    // Propagate unsignedness (C "usual arithmetic conversions"): if either
    // operand is unsigned the result is unsigned, so a following comparison
    // (e.g. carry detection `(r & m) < (a & m)`) is done unsigned, not signed.
    return (isUnsigned(lr) || isUnsigned(rr)) ? T.U64 : T.I64;
  }

  intOp(op, unsigned) {
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
    switch (op) {
      case "<": this.f.op("f64_lt"); break;
      case ">": this.f.op("f64_gt"); break;
      case "<=": this.f.op("f64_le"); break;
      case ">=": this.f.op("f64_ge"); break;
      case "==": this.f.op("f64_eq"); break;
      case "!=": this.f.op("f64_ne"); break;
    }
  }

  genLogical(node) {
    this.genTruth(node.left);
    this.genTruth(node.right);
    this.f.op(node.op === "&&" ? "i32_and" : node.op === "||" ? "i32_or" : "i32_xor");
    this.f.op("i64_extend_i32_u");
    return T.I64;
  }

  genShortCircuit(node) {
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
      else this.intCmp(node.ops[k], isUnsigned(ty[k]) || isUnsigned(ty[k + 1]));
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
      // address-of; function name -> id constant
      if (node.operand.kind === "Ident") {
        const fn = this.cg.functions.get(node.operand.name);
        if (fn && !this.locals.has(node.operand.name) && !this.cg.globals.has(node.operand.name)) {
          if (!this.cg.lenient && !fn.node && !fn.isImport)
            this.err(node, "Unresolved function: " + fn.name);
          this.f.i64_const(this.cg.functionAddress(fn));
          return funcPtr(fn.retType,fn.params);
        }
      }
      const t = this.genAddr(node.operand);
      return ptrTo(t);
    }
    if (node.op === "*") {
      const t = this.genExpr(node.operand);
      const rt = this.cg.resolveType(t);
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
    const delta = op === "++" ? 1 : -1;
    const wl = this.wlocalTarget(target);
    if (wl) {
      const { L, type: t, own } = wl;
      const step = () => {
        this.f.local_get(L.windex); this.reinterpret(own, t);
        if (isFloat(t)) this.f.f64_const(delta).op("f64_add");
        else this.f.i64_const(delta * (isPtr(t) ? this.cg.typeSize(t.to) : 1)).op("i64_add");
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
    const nv = isF ? this.scratchF64b() : this.scratchI64b();
    this.f.local_set(nv);           // consume the computed value into nv (no stack leak)
    // store new
    this.f.local_get(addr); this.f.local_get(nv); this.emitStore(t);
    // result
    this.f.local_get(prefix ? nv : res);
    return t;
  }
  scratchI64b() { return this.scratch.i64b ??= this.newWLocal(VT.i64); }
  scratchF64b() { return this.scratch.f64b ??= this.newWLocal(VT.f64); }

  // ================================================== calls
  genCall(node) {
    const callee = node.callee,type=this.peekType(callee);
    if (isFuncPtr(type)) {
      const target=this.newWLocal(VT.i32),sig=this.cg.wasmSig(type.params,type.retType);
      this.genExpr(callee);
      this.f.op("i32_wrap_i64").local_set(target);
      this.emitArgs(type.params,node.args,node);
      this.f.local_get(target).call_indirect(this.cg.m.typeIndex(sig.params,sig.results));
      //A null-only callback still needs a table so a call traps at runtime.
      if (!this.cg.m.table) this.cg.m.setTable(1);
      return type.retType;
    }
    if (callee.kind === "Ident") {
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
      if (callee.name === "MyCore") { this.f.global_get(this.cg.coreGlobal); return T.I64; }   // SMP intrinsic: this worker's core index (per-instance WASM global)
      if (callee.name.startsWith("__a_")) { const r = this.genAtomic(callee.name, node.args); if (r) return r; }   // SMP intrinsic: native WASM atomic RMW (LOCK ops over shared memory)
      if (["Bt","Bts","Btr","Btc","LBts","LBtr","LBtc"].includes(callee.name)) {
        const bit=foldConstInt(node.args[1]);
        //BackB.HC ICBitOps uses a 32-bit immediate operand for negative constants.
        if (bit!==null && bit<0n)
          node={...node,args:[node.args[0],{kind:"IntLit",value:BigInt.asUintN(5,bit)}]};
      }
      const fn = this.cg.functions.get(callee.name);
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

  // SMP atomic intrinsics: __a_<op><size>(hostAddr, val[, replacement]) -> old value (U64).
  // hostAddr is the byte offset into linear memory (i.e. guest `mem + ea`). Emits a native WASM
  // threads atomic RMW (0xFE family, i64 result). Atomics require natural alignment at runtime.
  genAtomic(name, args) {
    const m = /^__a_(add|and|or|xor|xchg|cmpxchg)(8|16|32|64)$/.exec(name);
    if (!m) return null;
    const op = m[1], size = +m[2];
    const SUB = { add:{8:0x22,16:0x23,32:0x24,64:0x1F}, and:{8:0x30,16:0x31,32:0x32,64:0x2D},
                  or:{8:0x37,16:0x38,32:0x39,64:0x34}, xor:{8:0x3E,16:0x3F,32:0x40,64:0x3B}, xchg:{8:0x45,16:0x46,32:0x47,64:0x42},
                  cmpxchg:{8:0x4C,16:0x4D,32:0x4E,64:0x49} };
    const ALIGN = { 8:0, 16:1, 32:2, 64:3 };
    this.genExprCoerce(args[0], T.I64); this.f.op("i32_wrap_i64");   // address
    this.genExprCoerce(args[1], T.I64);                              // val (rmw) or expected (cmpxchg)
    if (op === "cmpxchg") this.genExprCoerce(args[2], T.I64);        // replacement
    this.f.atomic(SUB[op][size], ALIGN[size]);
    return T.I64;
  }

  emitCall(fn, args, node) {
    if (!this.cg.lenient && !fn.isImport && !fn.node)
      this.err(node, "Unresolved function: " + fn.name);
    this.emitArgs(fn.params||[],args,node);
    this.f.call(fn.index);
    return fn.retType;
  }

  pureExpr(node) {
    if (!node) return true;
    switch (node.kind) {
      case "IntLit": case "CharLit": case "FloatLit": case "StrLit":
      case "BinLit": case "Sizeof": return true;
      case "Ident": return this.locals.has(node.name) || this.cg.globals.has(node.name) ||
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

  emitArgs(params,args,node) {
    const values=params.map((p,i)=>args[i]??p.default),
      types=params.map(p=>this.cg.resolveType(p.type));
    if (!this.cg.lenient && values.some(value=>value==null))
      this.err(node,"Missing required function argument");
    if (!this.cg.lenient && args.length>params.length)
      this.err(node,"Too many function arguments");
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
