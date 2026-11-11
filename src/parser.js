// parser.js - recursive-descent + Pratt parser for HolyC.
import { mk } from "./ast.js";
import { BASE_TYPES, ptrTo, arrayOf, funcPtr } from "./types.js";
import {subswitch} from "./subswitch.js";

const STORAGE = new Set([
  "public", "extern", "import", "_extern", "static", "reg", "noreg",
  "interrupt", "haserrcode", "argpop", "noargpop", "private",
]);

const ASSIGN_OPS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>="]);
// V5.03's binary operators (Compiler/CInit.HC:287-317): prec is tighter when
// smaller; power and assignment group to the right.
const BINOPS = new Map([
  ["`", { prec: 0x10, right: true }], ["<<", { prec: 0x10 }], [">>", { prec: 0x10 }],
  ["*", { prec: 0x14 }], ["/", { prec: 0x14 }], ["%", { prec: 0x14 }],
  ["&", { prec: 0x18 }], ["^", { prec: 0x1C }], ["|", { prec: 0x20 }],
  ["+", { prec: 0x24 }], ["-", { prec: 0x24 }],
  ["<", { prec: 0x28 }], [">", { prec: 0x28 }], ["<=", { prec: 0x28 }], [">=", { prec: 0x28 }],
  ["==", { prec: 0x2C }], ["!=", { prec: 0x2C }],
  ["&&", { prec: 0x30 }], ["^^", { prec: 0x34 }], ["||", { prec: 0x38 }],
]);
const CMP_OPS = new Set(["<", ">", "<=", ">=", "==", "!="]);
const LOGIC_OPS = new Set(["&&", "||", "^^"]);

export class Parser {
  constructor(tokens, filename = "<src>", opts = {}) {
    this.toks = tokens;
    this.i = 0;
    this.filename = filename;
    this.opts = opts;
    this.typeNames = new Set(Object.keys(BASE_TYPES));
    this.classes = new Map(); // name -> ClassDecl
    this.globalNames=new Set();
    this.globalBindings=new Map();
    this.bindings=[];
    this.functionBindings=new Map();
    this.functionRecords=[];
    this.runtimeExports=new Set(opts.runtimeFunctionExports||[]);
    this.exportBindings=new Map();
    this.intrinsicFunctions=new Set(opts.intrinsicFunctions||[]);
    this.localNames=null;
    this.switchId=0;
    this.anonymousId=0;
  }

  // --- token helpers ---
  peek(k = 0) { return this.toks[this.i + k]; }
  cur() { return this.toks[this.i]; }
  next() { return this.toks[this.i++]; }
  atEnd() { return this.cur().type === "eof"; }
  err(msg, tok = this.cur()) {
    throw new Error(`${tok.filename??this.filename}:${tok.line}:${tok.col}: parse error: ${msg} (near '${tok.text}')`);
  }
  isP(v, k = 0) { const t = this.peek(k); return t.type === "punct" && t.value === v; }
  isKw(v, k = 0) { const t = this.peek(k); return t.type === "ident" && t.value === v; }
  eatP(v) { if (this.isP(v)) return this.next(); this.err(`expected '${v}'`); }
  optP(v) { if (this.isP(v)) { this.next(); return true; } return false; }
  isType(k = 0) {
    const t = this.peek(k);
    return t.type === "ident" && (this.typeNames.has(t.value) || t.value === "class" || t.value === "union");
  }

  // ====================================================================
  // Program
  // ====================================================================
  parseProgram() {
    const decls = [];
    const topStmts = [];
    const items=[];
    const declaration=node=>{decls.push(node);items.push(node);};
    const statement=node=>{topStmts.push(node);items.push(node);};
    this.diagnostics = [];
    while (!this.atEnd()) {
      const startIdx = this.i;
      try {
        if (this.isP(";")) { this.next(); continue; }
        // top-level inline asm block
        if (this.isKw("asm")) { statement(this.parseAsmBlock()); continue; }
        // class/union declaration, possibly behind storage specifiers
        // (e.g. `public class Foo {...}` or forward decl `extern class Bar;`)
        let k = 0;
        while (this.peek(k).type === "ident" && STORAGE.has(this.peek(k).value)) k++;
        if (this.isKw("class", k) || this.isKw("union", k)) {
          for (let s = 0; s < k; s++) this.next(); // consume storage specifiers
          declaration(this.parseClass());
          continue;
        }
        // declaration vs statement
        if (this.looksLikeDecl()) {
          const d = this.parseDeclaration(true);
          if (Array.isArray(d)) d.forEach(declaration); else declaration(d);
        } else {
          statement(this.parseStatement());
        }
      } catch (e) {
        if (!this.opts || !this.opts.resilient) throw e;
        this.diagnostics.push(e.message);
        // recover: skip to the next top-level boundary so one bad construct
        // doesn't sink the whole file.
        if (this.i === startIdx) this.next();
        this.resyncTopLevel();
      }
    }
    const program=mk("Program",{decls,topStmts,items,diagnostics:this.diagnostics});
    this.finishFunctionBindings(program);
    this.finishGlobalBindings(program);
    return program;
  }

  // After a parse error in resilient mode, advance to a plausible restart point:
  // the next ';' or the end of the next balanced '{...}' at depth 0.
  resyncTopLevel() {
    let depth = 0;
    while (!this.atEnd()) {
      if (this.isP("{")) { depth++; this.next(); continue; }
      if (this.isP("}")) { if (depth > 0) depth--; this.next(); if (depth === 0) return; continue; }
      if (depth === 0 && this.isP(";")) { this.next(); return; }
      this.next();
    }
  }

  looksLikeDecl() {
    let k = 0;
    // skip storage specifiers
    while (this.peek(k).type === "ident" && STORAGE.has(this.peek(k).value)) k++;
    const t = this.peek(k);
    if (t.type !== "ident") return false;
    if (t.value === "class" || t.value === "union") return true;
    return this.typeNames.has(t.value) && !this.isP(".",k+1);
  }

  // Native declarations create new storage; an extern is a distinct forward
  // binding resolved only by its next definition. References keep their type.
  globalBinding(name,type,storage,tok) {
    let binding=this.globalBindings.get(name);
    const external=storage.includes("extern") || storage.includes("_extern");
    if (external || !binding || !binding.external) {
      binding={id:this.bindings.length,name,type,external,filename:tok.filename,nodes:[]};
      this.bindings.push(binding);this.globalBindings.set(name,binding);
    } else {binding.external=false;binding.type=type;}
    return binding;
  }

  bindReference(node) {
    if (!this.localNames?.has(node.name)) {
      const binding=this.globalBindings.get(node.name);
      if (binding) {node.globalBinding=binding.id;node.globalType=binding.type;}
      else if (node.kind==="Ident") this.bindFunctionReference(node);
    }
    return node;
  }

  bindFunctionReference(node) {
    const fn=this.functionBindings.get(node.name);
    if (fn) {node.functionBinding=fn.id;node.functionType=fn.type;}
    else if (this.intrinsicFunctions.has(node.name)) node.intrinsicFunction=true;
    else node.unboundFunction=node.name;
    return node;
  }

  functionBinding(name,type,tok,storage) {
    let binding=this.functionBindings.get(name);
    const exported=this.exportBindings.get(name);
    const alias=storage.includes("extern") && binding===exported?exported:null;
    if (!binding || binding.defined || alias) {
      binding={id:this.functionRecords.length,name,filename:tok.filename,nodes:[],alias};
      this.functionRecords.push(binding);this.functionBindings.set(name,binding);
    }
    binding.type=type;
    return binding;
  }

  finishFunctionBindings(program) {
    const first=new Map(),runtime={};
    for (const binding of this.functionRecords) {
      if (!first.has(binding.name)) first.set(binding.name,binding);
      binding.key=this.functionBindings.get(binding.name)===binding?binding.name:
        "#function:"+binding.name+":"+binding.id;
      if (binding.filename==="<prelude>") runtime[binding.name]=binding.key;
      for (const node of binding.nodes) {
        node.name=binding.key;node.sourceName=binding.name;
        if (binding.alias) node.functionAlias=binding.alias.key;
      }
    }
    const seen=new Set(),walk=node=>{
      if (!node || typeof node!=="object" || seen.has(node)) return;
      seen.add(node);
      if (node.functionBinding!==undefined)
        node.name=this.functionRecords[node.functionBinding].key;
      else if (node.unboundFunction && first.has(node.unboundFunction)) {
        // Retain the existing forward-reference extension, bound to its first
        // declaration. Prelude source uses it before native API definitions.
        const binding=first.get(node.unboundFunction);
        node.name=binding.key;node.functionBinding=binding.id;
      }
      delete node.unboundFunction;
      for (const value of Object.values(node))
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value==="object") walk(value);
    };
    walk(program);program.runtimeFunctionBindings=runtime;
  }

  finishGlobalBindings(program) {
    const runtimeBindings={};
    for (const binding of this.bindings) {
      binding.key=this.globalBindings.get(binding.name)===binding?binding.name:
        "#global:"+binding.name+":"+binding.id;
      if (binding.filename==="<prelude>") runtimeBindings[binding.name]=binding.key;
      for (const node of binding.nodes) {
        node.name=binding.key;node.sourceName=binding.name;
        if (binding.key!==binding.name) node.internal=true;
        if (node.storage?.some(s=>s==="extern" || s==="_extern") && !binding.external)
          node.forwardGlobal=true;
      }
    }
    const seen=new Set(),walk=node=>{
      if (!node || typeof node!=="object" || seen.has(node)) return;
      seen.add(node);
      if (node.globalBinding!==undefined) node.name=this.bindings[node.globalBinding].key;
      for (const value of Object.values(node))
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value==="object") walk(value);
    };
    walk(program);program.runtimeBindings=runtimeBindings;
  }

  // ====================================================================
  // Class / union
  // ====================================================================
  parseClass(scalarBase=null,nested=false) {
    const kw = this.next(); // class|union
    const isUnion = kw.value === "union";
    let name = null;
    if (this.cur().type === "ident") name = this.next().value;
    const anonymous=name===null;
    if (nested && (!anonymous || !isUnion)) this.err("Expected anonymous union in class",kw);
    if (anonymous && !nested) this.err("Expected type name",kw);
    if (anonymous) name=`#anonymous:${this.anonymousId++}`;
    let base = null;
    if (this.optP(":")) { base = this.next().value; }
    // forward declaration: `class Name;` (no body) - register the name only.
    if (this.isP(";")) {
      this.next();
      if (name) this.typeNames.add(name);
      const fwd = mk("ClassDecl", { name, base, members: [], isUnion, forward: true }, kw);
      if (name) this.classes.set(name, fwd);
      return fwd;
    }
    const members = [],nestedClasses=[];
    const addNested=child=>{
      nestedClasses.push(child);
      members.push({name:null,type:{kind:"classref",name:child.name},anonymous:true});
    };
    this.eatP("{");
    while (!this.isP("}") && !this.atEnd()) {
      if (this.isKw("union")) {
        addNested(this.parseClass(null,true));continue;
      }
      // member declaration: Type [*] name [array] ... ;
      const baseType = this.parseTypeSpec();
      do {
        const member=this.parseDeclarator(baseType);
        if (this.optP(":")) this.parseConstIntish();
        members.push(member);
      } while (this.optP(","));
      this.optP(";");
    }
    this.eatP("}");
    const node = mk("ClassDecl", { name, base, members, isUnion,scalarBase,anonymous,nestedClasses }, kw);
    if (name) { this.typeNames.add(name); this.classes.set(name, node); }
    if (nested) {node.vars=[];this.optP(";");return node;}
    // optional trailing variable declarators: } a, b;
    const vars = [];
    if (!this.isP(";")) {
      do {
        let vt = name ? { kind: "classref", name } : node;
        while (this.optP("*")) vt = ptrTo(vt);
        if (this.cur().type === "ident") {
          const vn = this.next().value;
          (this.localNames??this.globalNames).add(vn);
          const dims = [];
          while (this.isP("[")) { this.next(); dims.push(this.parseConstIntish()); this.eatP("]"); }
          for (let d = dims.length - 1; d >= 0; d--) vt = arrayOf(vt, dims[d]);
          const binding=this.localNames===null?this.globalBinding(vn,vt,[],kw):null;
          let init = null;
          if (this.optP("=")) init = this.parseInitializer();
          const variable=mk("VarDecl",{name:vn,type:vt,init,storage:[]},kw);
          if (binding) {variable.globalBinding=binding.id;binding.nodes.push(variable);}
          vars.push(variable);
        }
      } while (this.optP(","));
    }
    this.optP(";");
    node.vars = vars;
    return node;
  }

  parseConstIntish() {
    // allow a constant expression for array dims / bitfields; evaluate simple ints
    const e = this.parseConditional();
    return e; // resolved later by codegen (foldConst)
  }

  // ====================================================================
  // Type specifier
  // ====================================================================
  parseTypeSpec() {
    // returns a Type (may be {kind:'classref',name} for not-yet-resolved classes)
    while (this.peek().type === "ident" && STORAGE.has(this.peek().value)) this.next();
    const t = this.cur();
    if (t.type !== "ident") this.err("expected type");
    const name = this.next().value;
    if (BASE_TYPES[name]) return BASE_TYPES[name];
    return { kind: "classref", name };
  }

  // ====================================================================
  // Declarations (functions + variables)
  // ====================================================================
  parseDeclaration(topLevel) {
    const storage = [];
    while (this.peek().type === "ident" && STORAGE.has(this.peek().value)) storage.push(this.next().value);

    const baseType = this.parseTypeSpec();
    if (this.isKw("class") || this.isKw("union")) return this.parseClass(baseType);

    const decls=[];
    do {
      const tok=this.cur(),d=this.parseDeclarator(baseType,false,!topLevel && !storage.includes("static"));
      (topLevel?this.globalNames:this.localNames??this.globalNames).add(d.name);
      if (this.isP("(")) {
        const type={retType:d.type},binding=this.functionBinding(d.name,type,tok,storage);
        const {params,isVarArgs}=this.parseParams();
        Object.assign(type,{params,isVarArgs});
        binding.defined=this.isP("{") || !!binding.alias;
        if (tok.filename==="<prelude>" && binding.defined && this.runtimeExports.has(d.name) &&
            !this.exportBindings.has(d.name)) this.exportBindings.set(d.name,binding);
        let body=null;
        if (this.isP("{")) {
          const outer=this.localNames;
          this.localNames=new Set(params.map(p=>p.name));
          try {body=this.parseBlock();} finally {this.localNames=outer;}
        }
        if (!body) this.optP(";");
        const fn=mk("FuncDecl",{name:d.name,retType:d.type,params,body,
          storage,isVarArgs},tok);
        binding.nodes.push(fn);
        this.funcNamesAdd?.(d.name);
        return fn;
      }
      const binding=topLevel?this.globalBinding(d.name,d.type,storage,tok):null;
      const init=this.optP("=")?this.parseInitializer():null;
      if (!topLevel && d.type.kind==="funcptr" && init && !storage.includes("static"))
        this.err("V5.03 requires a separate assignment for a local function pointer",tok);
      const node=mk("VarDecl",{...d,init,storage},tok);
      if (binding) {node.globalBinding=binding.id;binding.nodes.push(node);}
      decls.push(node);
    } while (this.optP(","));
    this.optP(";");
    return decls;
  }

  parseDeclarator(baseType,unnamed=false,registers=false) {
    let type=baseType,name=null,stars=0;
    if (registers) while (this.isKw("reg") || this.isKw("noreg")) this.next();
    while (this.optP("*")) type=ptrTo(type);
    const callback=this.isP("(") && this.isP("*",1);
    if (callback) {
      this.next();
      while (this.optP("*")) stars++;
    }
    if (this.cur().type==="ident") name=this.next().value;
    else if (!unnamed) this.err("expected declarator name");
    if (callback) {
      this.eatP(")");
      const {params,isVarArgs}=this.parseParams();
      type=funcPtr(type,params,isVarArgs);
      while (--stars) type=ptrTo(type);
    }
    const dims=[];
    while (this.optP("[")) {
      dims.push(this.isP("]")?null:this.parseConstIntish());
      this.eatP("]");
    }
    for (let i=dims.length-1;i>=0;i--) type=arrayOf(type,dims[i]);
    return {name,type};
  }

  parseParams() {
    this.eatP("(");
    const params=[];
    let isVarArgs=false;
    if (!this.isP(")")) do {
      if (this.optP("...")) {isVarArgs=true;break;}
      const d=this.parseDeclarator(this.parseTypeSpec(),true,true);
      if (d.type.kind==="array") this.err("No arrays in fun args");
      d.default=this.optP("=")?this.parseAssignment():null;
      params.push(d);
    } while (this.optP(","));
    this.eatP(")");
    return {params,isVarArgs};
  }

  parseInitializer() {
    if (this.isP("{")) {
      const tok = this.next();
      const elements = [];
      if (!this.isP("}")) {
        do {
          if (this.isP("}")) break;
          elements.push(this.parseInitializer());
        } while (this.optP(","));
      }
      this.eatP("}");
      return mk("InitList", { elements }, tok);
    }
    return this.parseAssignment();
  }

  // ====================================================================
  // Statements
  // ====================================================================
  parseBlock() {
    const tok = this.eatP("{");
    const stmts = [];
    while (!this.isP("}") && !this.atEnd()) {
      stmts.push(this.parseStatement());
    }
    this.eatP("}");
    return mk("Block", { stmts }, tok);
  }

  // V5.03 goes on to another statement after a comma (Compiler/PrsStmt.HC:
  // 919-935), so a=1,b=2; is two statements, and both belong to an if that
  // holds the first.
  parseStatement() {
    const t = this.cur();
    while (this.optP(","));
    const s = this.parseOneStatement();
    if (!this.isP(",")) return s;
    const stmts = [s];
    while (this.isP(",")) {
      while (this.optP(","));
      stmts.push(this.parseOneStatement());
    }
    return mk("Block", { stmts }, t);
  }

  parseOneStatement() {
    const t = this.cur();

    if (this.isP("{")) return this.parseBlock();
    if (this.isP(";")) { this.next(); return mk("Empty", {}, t); }

    // local declaration
    if (this.isKw("class") || this.isKw("union")) return this.parseClass();
    if (this.looksLikeDecl()) {
      const d = this.parseDeclaration(false);
      return mk("DeclStmt", { decls: Array.isArray(d) ? d : [d] }, t);
    }

    if (t.type === "ident") {
      switch (t.value) {
        case "asm": return this.parseAsmBlock();
        case "if": return this.parseIf();
        case "while": return this.parseWhile();
        case "do": return this.parseDoWhile();
        case "for": return this.parseFor();
        case "switch": return this.parseSwitch();
        case "return": { this.next(); let e = null; if (!this.isP(";")) e = this.parseExpression(); this.optP(";"); return mk("Return", { expr: e }, t); }
        case "break": this.next(); this.optP(";"); return mk("Break", {}, t);
        case "continue": this.next(); this.optP(";"); return mk("Continue", {}, t);
        case "goto": { this.next(); const lbl = this.next().value; this.optP(";"); return mk("Goto", { label: lbl }, t); }
        case "try": {
          this.next();
          const body = this.isP("{") ? this.parseBlock() : this.parseStatement();
          // HolyC: `catch` follows `try`. Attach it here so try/catch stays
          // paired even when the try is nested (e.g. as an `else` body).
          let handler = null;
          if (this.isKw("catch")) {
            this.next();
            handler = this.isP("{") ? this.parseBlock() : this.parseStatement();
          }
          if (!handler) this.err("Missing catch after try");
          return mk("TryCatch", { body, handler }, t);
        }
        case "catch": this.err("catch requires a preceding try");
        case "throw": {
          this.next();
          let expr=null,noLog=null;
          if (this.optP("(")) {
            if (!this.isP(")") && !this.isP(",")) expr=this.parseExpression();
            if (this.optP(",") && !this.isP(")")) noLog=this.parseExpression();
            this.eatP(")");
          }
          this.optP(";");
          return mk("Throw",{expr,noLog},t);
        }
        case "no_warn": case "lock": { this.next(); return this.parseStatement(); }
      }
      // label:  (ident followed by ':' but not '::')
      if (this.peek(1).type === "punct" && this.peek(1).value === ":" && !(this.peek(2) && this.peek(2).type === "punct" && this.peek(2).value === ":")) {
        const name = this.next().value; this.next(); // ':'
        return mk("Label", { name }, t);
      }
    }

    // statement-level string -> Print
    if (t.type === "str") return this.parsePrintStmt();
    // A zero character literal selects a following packed-character expression.
    if (t.type === "char") {
      if (!t.value) this.next();
      const expr=this.parseExpression();
      this.optP(";");
      return mk("PutChars",{expr,callee:this.bindFunctionReference(mk("Ident",{name:"PutChars"},t))},t);
    }

    // expression statement
    const expr = this.parseExpression();
    this.optP(";");
    return mk("ExprStmt", { expr }, t);
  }

  // inline assembly: we cannot lower x86-64, so record it as an unsupported
  // marker (codegen turns it into a trap/no-op) rather than crashing the parse.
  parseAsmBlock() {
    const t = this.next(); // 'asm'
    this.skipBraceBlock();
    this.optP(";");
    return mk("AsmBlock", {}, t);
  }
  // Skip a balanced {...} region (used for asm and other opaque blocks). The
  // lexer stops at embedded binary, so this is purely brace-counting.
  skipBraceBlock() {
    if (!this.isP("{")) return;
    let depth = 0;
    while (!this.atEnd()) {
      if (this.isP("{")) { depth++; this.next(); }
      else if (this.isP("}")) { depth--; this.next(); if (depth === 0) break; }
      else this.next();
    }
  }

  parsePrintStmt() {
    const t = this.cur();
    // An empty-leading-byte literal selects a following format expression.
    if (!t.value[0]) this.next();
    const format=this.parseExpression();
    const args = [];
    while (this.optP(",")) {
      if (this.isP(";")) break;
      args.push(this.parseAssignment());
    }
    this.optP(";");
    return mk("Print", { format, args,callee:this.bindFunctionReference(mk("Ident",{name:"Print"},t)) }, t);
  }

  parseIf() {
    const t = this.next(); this.eatP("(");
    const cond = this.parseExpression(); this.eatP(")");
    const then = this.parseStatement();
    let els = null;
    if (this.isKw("else")) { this.next(); els = this.parseStatement(); }
    return mk("If", { cond, then, else: els }, t);
  }
  parseWhile() {
    const t = this.next(); this.eatP("(");
    const cond = this.parseExpression(); this.eatP(")");
    const body = this.parseStatement();
    return mk("While", { cond, body }, t);
  }
  parseDoWhile() {
    const t = this.next();
    const body = this.parseStatement();
    if (!this.isKw("while")) this.err("expected 'while'");
    this.next(); this.eatP("(");
    const cond = this.parseExpression(); this.eatP(")"); this.optP(";");
    return mk("DoWhile", { body, cond }, t);
  }
  // The first and last parts are statements, as in V5.03 (Compiler/PrsStmt.HC:
  // 529-564), so commas may join several: for (i=0,j=9;i<j;i++,j--).
  parseFor() {
    const t = this.next(); this.eatP("(");
    let init = null;
    if (!this.optP(";")) init = this.parseStatement();
    let cond = null; if (!this.isP(";")) cond = this.parseExpression(); this.eatP(";");
    let step = null;
    if (!this.isP(")")) {
      const stmts = [];
      do {
        const et = this.cur();
        stmts.push(mk("ExprStmt", { expr: this.parseExpression() }, et));
      } while (this.optP(","));
      step = stmts.length === 1 ? stmts[0] : mk("Block", { stmts }, t);
    }
    this.eatP(")");
    const body = this.parseStatement();
    return mk("For", { init, cond, step, body }, t);
  }
  parseSwitch() {
    const t = this.next();
    const noBounds=!!this.optP("[");
    if (!noBounds) this.eatP("(");
    const disc=this.parseExpression();
    this.eatP(noBounds?"]":")");
    this.eatP("{");
    const items = []; // sequence of {type:'case'|'default'|'start'|'end'|'stmt', ...}
    while (!this.isP("}") && !this.atEnd()) {
      if (this.isKw("case")) {
        const ct = this.next();
        let lo = null, hi = null;
        if (!this.isP(":")) {            // HolyC allows empty `case:` (auto-number)
          lo = this.parseConditional();
          if (this.isP("...")) { this.next(); hi = this.parseConditional(); }
        }
        this.eatP(":");
        items.push({ type: "case", lo, hi });
      } else if (this.isKw("default")) {
        this.next(); this.eatP(":");
        items.push({ type: "default" });
      } else if (this.isKw("start") && this.peek(1).type === "punct" && this.peek(1).value === ":") {
        this.next(); this.next(); items.push({ type: "start" });
      } else if (this.isKw("end") && this.peek(1).type === "punct" && this.peek(1).value === ":") {
        this.next(); this.next(); items.push({ type: "end" });
      } else {
        items.push({ type: "stmt", stmt: this.parseStatement() });
      }
    }
    this.eatP("}");
    return subswitch(mk("Switch",{disc,items,noBounds},t),this.switchId++,message=>this.err(message,t));
  }

  // ====================================================================
  // Expressions
  // ====================================================================
  parseExpression() { return this.parseAssignment(); }

  parseAssignment() {
    const left = this.parseConditional();
    const t = this.cur();
    if (t.type === "punct" && ASSIGN_OPS.has(t.value)) {
      this.next();
      const right = this.parseAssignment();
      return mk("Assign", { op: t.value, target: left, value: right }, t);
    }
    return left;
  }

  // ?: is not V5.03's (HolyC.DD:192). It binds between || and assignment.
  parseConditional() {
    const cond = this.parseBinary();
    if (this.isP("?")) {
      const t = this.next();
      const then = this.parseAssignment();
      this.eatP(":");
      const els = this.parseConditional();
      return mk("Cond", { cond, then, else: els }, t);
    }
    return cond;
  }

  // V5.03's operator loop (Compiler/PrsExp.HC:211-241): an operator waits on
  // the stack while the next one binds tighter, or as tight and groups to the
  // right. A compare that a later compare reduces shares its right operand
  // with it, so a<b<c and a<b==c are chains.
  parseBinary() {
    const vals = [this.parseUnary()], ops = [];
    const reduce = () => {
      const o = ops.pop(), right = vals.pop(), left = vals.pop();
      if (o.chained) {
        vals.push(left.kind === "Chain"
          ? mk("Chain", { ops: [...left.ops, o.op], operands: [...left.operands, right] }, left)
          : mk("Chain", { ops: [left.op, o.op], operands: [left.left, left.right, right] }, left));
      } else vals.push(mk(LOGIC_OPS.has(o.op) ? "Logical" : "Binary", { op: o.op, left, right }, o.tok));
    };
    while (true) {
      const t = this.cur();
      const b = t.type === "punct" && BINOPS.get(t.value);
      if (!b) break;
      this.next();
      const op = { op: t.value, prec: b.prec, right: b.right, tok: t, chained: false };
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (op.prec === top.prec ? op.right : op.prec < top.prec) break;
        reduce();
        if (CMP_OPS.has(op.op) && CMP_OPS.has(top.op)) op.chained = true;
      }
      ops.push(op);
      vals.push(this.parseUnary());
    }
    while (ops.length) reduce();
    return vals[0];
  }

  // After a unary minus, power applies first: -a`b is -(a`b)
  // (Compiler/PrsExp.HC:139-147).
  parsePowerAfterMinus(left) {
    if (!this.isP("`")) return left;
    const t = this.next();
    const right = this.parsePowerAfterMinus(this.parseUnary());
    return mk("Binary", { op: "`", left, right }, t);
  }

  parseUnary() {
    const t = this.cur();
    if (t.type === "punct" && ["!", "~", "-", "+", "&", "*", "++", "--"].includes(t.value)) {
      this.next();
      let operand = this.parseUnary();
      if (t.value === "-") operand = this.parsePowerAfterMinus(operand);
      return mk("Unary", { op: t.value, operand, prefix: true }, t);
    }
    if ((this.isKw("sizeof") || this.isKw("offset")) &&
        !this.localNames?.has(t.value) && !this.globalNames.has(t.value)) {
      this.next();
      return this.parseLayoutQuery(t.value,t);
    }
    if (this.isType() && this.isP(".",1) &&
        !this.localNames?.has(t.value) && !this.globalNames.has(t.value))
      return this.parseLayoutQuery("offset",t);
    // cast: (Type)expr
    if (this.isP("(") && this.isType(1)) {
      // look ahead to ensure it's a cast: ( Type [*]* )
      const save = this.i;
      this.next();
      const ty = this.parseTypeRef();
      if (this.isP(")")) {
        this.next();
        // a cast must be followed by a unary expr
        const operand = this.parseUnary();
        return mk("Cast", { type: ty, operand }, t);
      }
      this.i = save; // not a cast, backtrack
    }
    return this.parsePostfix();
  }

  parseLayoutQuery(op,t) {
    let parens=0,stars=0;
    while (this.optP("(")) parens++;
    if (this.cur().type!=="ident") this.err("expected class or variable name");
    const name=this.next().value,fields=[];
    while (this.optP(".")) {
      if (this.cur().type!=="ident") this.err("expected member name");
      fields.push(this.next().value);
    }
    if (op==="sizeof") while (this.optP("*")) stars++;
    else if (!fields.length) this.err("offset requires a member");
    while (parens--) this.eatP(")");
    return this.bindReference(mk(op==="sizeof"?"Sizeof":"Offset",{name,fields,stars},t));
  }

  parseTypeRef() {
    return this.parseDeclarator(this.parseTypeSpec(),true).type;
  }

  parsePostfix() {
    let e = this.parsePrimary();
    while (true) {
      const t = this.cur();
      if (this.isP("(") && this.isType(1)) {
        this.next();
        const type = this.parseTypeRef();
        this.eatP(")");
        e = mk("Cast", { type, operand: e, postfix: true }, t);
      } else if (this.isP("(")) {
        this.next();
        const args = [];
        if (!this.isP(")")) {
          // support skipped args via empty slots: f(,x) f(a,,b)
          while (true) {
            if (this.isP(",")) { args.push(null); this.next(); continue; }
            if (this.isP(")")) { break; }
            args.push(this.parseAssignment());
            if (this.isP(",")) { this.next(); if (this.isP(")")) { args.push(null); } continue; }
            break;
          }
        }
        this.eatP(")");
        e = mk("Call", { callee: e, args }, t);
      } else if (this.isP("[")) {
        this.next(); const index = this.parseExpression(); this.eatP("]");
        e = mk("Index", { base: e, index }, t);
      } else if (this.isP(".")) {
        this.next(); const name = this.next().value;
        e = mk("Member", { base: e, name, arrow: false }, t);
      } else if (this.isP("->")) {
        this.next(); const name = this.next().value;
        e = mk("Member", { base: e, name, arrow: true }, t);
      } else if (this.isP("++") || this.isP("--")) {
        const op = this.next().value;
        e = mk("Postfix", { op, operand: e }, t);
      } else break;
    }
    return e;
  }

  parsePrimary() {
    const t = this.cur();
    if (t.type === "bin") { this.next(); return mk("BinLit", { bytes: t.value }, t); }
    if (t.type === "num") {
      this.next();
      if (t.value.kind === "float") return mk("FloatLit", { value: t.value.value }, t);
      return mk("IntLit", { value: t.value.value }, t);
    }
    if (t.type === "str") {
      // adjacent string concat in expression position
      const bytes = [];
      while (this.cur().type === "str") { bytes.push(...this.cur().value); this.next(); }
      return mk("StrLit", { bytes }, t);
    }
    if (t.type === "char") { this.next(); return mk("CharLit", { value: t.value, text: t.text, nchars: t.nchars }, t); }
    if (t.type === "ident") {
      this.next();
      return this.bindReference(mk("Ident",{name:t.value},t));
    }
    if (this.isP("(")) { this.next(); const e = this.parseExpression(); this.eatP(")"); return e; }
    this.err("unexpected token in expression");
  }
}

export function parse(tokens, filename, opts = {}) {
  const p = new Parser(tokens, filename, opts);
  const ast = p.parseProgram();
  return ast;
}
