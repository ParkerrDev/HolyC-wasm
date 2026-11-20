// jit.js - code compiled while the program runs.
//
// V5.03 compiles a file one top-level statement at a time and runs each
// before it compiles the next (Compiler/CMain.HC ExeCmdLine), so a statement
// can make the symbols a later one names: RegExe declares best_score from the
// registry, DefinePrint makes a define, a global's initializer gives the size
// of the next global's array. Text compiles the same way at run time
// (ExePutS, ExePrint, ExeDoc), and LexExpression2Bin compiles one expression.
//
// Here the program's compile runs up to the first top-level statement that
// can compile at run time (PlanSegments). Each later part compiles once the
// part before it has run, against a symbol table (Jit) that holds every
// global, class, define and function so far, into a module that shares the
// program's memory, stack, table and exception tag (codegen.js runSegment).
import {Token,lex} from "./lexer.js";
import {ByteString,Identifier} from "./encoding.js";
import {Parser,CompileCut} from "./parser.js";
import {Expand,preprocess} from "./preprocess.js";
import {compileJit,CodegenError} from "./codegen.js";
import {Names,Walk} from "./names.js";
import {foldConstInt,foldDim} from "./fold.js";
import {COLOR_NAMES,GR_WIDTH,GR_HEIGHT} from "./abi.js";
import {isFloat,isInt,isVoid} from "./types.js";

// Compiler/CmpTables.HH token codes.
const TK_IDENT=0x100,TK_STR=0x101,TK_I64=0x102,TK_CHAR_CONST=0x103,TK_F64=0x104;
const TK_PUNCT={0x105:"++",0x106:"--",0x107:"->",0x108:"::",0x109:"<<",0x10A:">>",
  0x10B:"==",0x10C:"!=",0x10D:"<=",0x10E:">=",0x10F:"&&",0x110:"||",0x111:"^^",
  0x112:"<<=",0x113:">>=",0x114:"*=",0x115:"/=",0x116:"&=",0x117:"|=",0x118:"^=",
  0x119:"+=",0x11A:"-=",0x122:"%=",0x123:"..",0x124:"..."};
// Compiler/Lex.HH raw types.
const RT_U0=3,RT_I8=4,RT_I64=10,RT_U64=11,RT_F64=14;
// The host imports through which a statement compiles code at run time.
const COMPILES=["__jit_exe","__jit_define"];
const PRELUDE=new Set(["<prelude>","<compiler>"]);

// One token as the program's Lex left it in its CCmpCtrl: token, cur_i64,
// cur_f64 and, for a name or a string, the bytes of cur_str.
export function JitToken(token,i64,f64,bytes) {
  const at=(type,value,text)=>new Token(type,value,text,1,1,0);
  switch (token) {
    case TK_IDENT: {
      const end=bytes.indexOf(0),text=ByteString(end<0?bytes:bytes.subarray(0,end));
      return at("ident",Identifier(text),text);
    }
    case TK_STR:
      return at("str",[...bytes.subarray(0,Math.max(0,bytes.length-1))],ByteString(bytes));
    case TK_I64: {
      const value=BigInt.asIntN(64,i64);
      return at("num",{kind:"int",value},String(value));
    }
    case TK_F64:
      return at("num",{kind:"float",value:f64},String(f64));
    case TK_CHAR_CONST: {
      const value=BigInt.asUintN(64,i64),chars=[];
      for (let v=value;v;v>>=8n) chars.push(Number(v&0xFFn));
      const tk=at("char",value,String.fromCharCode(...chars));
      tk.nchars=Math.max(1,chars.length);
      return tk;
    }
  }
  const text=TK_PUNCT[token]??(token>0 && token<0x100?String.fromCharCode(token):null);
  if (text===null) throw new Error("Token "+token.toString(16)+" cannot start or continue an expression");
  return at("punct",text,text);
}

function RawType(type) {
  return isFloat(type)?RT_F64:isVoid(type)?RT_U0:
    isInt(type) && type.bits<64?RT_I8+Math.log2(type.bits/8)*2+(type.signed?0:1):
    isInt(type) && !type.signed?RT_U64:RT_I64;
}

// The array sizes in a declaration's type.
function Dims(type,out=[]) {
  for (let t=type,depth=0;t && depth<64;t=t.of,depth++)
    if (t.kind==="array" && t.count!=null) out.push(t.count);
  return out;
}

// The array sizes an item declares: a global's, or the locals' of a body.
function DeclDims(item) {
  const dims=[];
  for (const v of item.kind==="VarDecl"?[item]:item.vars??[]) Dims(v.type,dims);
  if (item.kind==="FuncDecl" && item.body)
    Walk([item.body],node=>{if (node.kind==="VarDecl") Dims(node.type,dims);});
  return dims;
}

function Constant(node) {
  if (!node) return true;
  if (["IntLit","CharLit","FloatLit","StrLit","BinLit"].includes(node.kind)) return true;
  if (node.kind==="Unary") return !["++","--"].includes(node.op) && Constant(node.operand);
  if (node.kind==="Cast") return Constant(node.operand);
  if (["Binary","Logical"].includes(node.kind)) return Constant(node.left) && Constant(node.right);
  if (node.kind==="InitList") return node.elements.every(Constant);
  return false;
}

// Split the program's items into parts. A part ends after a top-level
// statement of the program's own files that can reach a run-time compile,
// and before a global or function with an array size that is not a constant:
// V5.03 runs that size's expression as it compiles it (PrsArrayDims), so the
// part before it has run. Each part lists its decls and the bodies later parts define.
export function PlanSegments(ast) {
  const bodies=new Map();
  for (const d of ast.decls) if (d.kind==="FuncDecl" && d.body) bodies.set(d.name,Names([d.body]));
  const compiles=new Set(COMPILES);
  for (let changed=true,pass=0;changed && pass<=bodies.size;pass++) {
    changed=false;
    for (const [name,names] of bodies)
      if (!compiles.has(name) && [...names].some(n=>compiles.has(n))) {compiles.add(name);changed=true;}
  }
  const statements=new Set(ast.topStmts),parts=[{items:[],topStmts:[],decls:[]}];
  const env={GR_WIDTH:BigInt(GR_WIDTH),GR_HEIGHT:BigInt(GR_HEIGHT)};
  for (const [k,v] of Object.entries(COLOR_NAMES)) env[k]=BigInt(v);
  const dynamic=dims=>dims.some(dim=>{try {foldDim(dim,env,()=>8);return false;} catch {return true;}});
  let runs=false;
  for (const item of ast.items) {
    const user=!PRELUDE.has(item.filename),vars=item.kind==="VarDecl"?[item]:item.vars??[];
    if (user && parts.at(-1).items.length && dynamic(DeclDims(item))) {
      parts.push({items:[],topStmts:[],decls:[]});runs=false;
    }
    const part=parts.at(-1);
    part.items.push(item);
    if (statements.has(item)) {
      part.topStmts.push(item);
      if (!user) continue;
      runs=true;
      if ([...Names([item])].some(n=>compiles.has(n))) {parts.push({items:[],topStmts:[],decls:[]});runs=false;}
      continue;
    }
    part.decls.push(item);
    for (const v of vars) {
      const c=v.init && foldConstInt(v.init,env,()=>8);
      if (c!=null) env[v.name]=c;
      if (user && !Constant(v.init)) runs=true;
    }
  }
  if (parts.length>1 && !parts.at(-1).items.length) parts.pop();
  const later=new Set();
  for (let i=parts.length-1;i>=0;i--) {
    parts[i].laterBodies=new Set(later);
    for (const d of parts[i].decls) if (d.kind==="FuncDecl" && d.body) later.add(d.name);
  }
  return {parts,names:Names(parts.slice(1).flatMap(part=>part.items))};
}

// The names a declaration or statement uses that it does not declare itself.
function Free(item) {
  const names=Names([item]),own=new Set();
  for (const p of item.params??[]) if (p.name) own.add(p.name);
  if (item.isVarArgs) {own.add("argc");own.add("argv");}
  const stack=[item.body],seen=new Set();
  for (let steps=0;stack.length && steps<10000000;steps++) {
    const node=stack.pop();
    if (!node || typeof node!=="object" || seen.has(node)) continue;
    seen.add(node);
    if (node.kind==="DeclStmt") for (const d of node.decls) own.add(d.name);
    for (const v of Object.values(node))
      if (Array.isArray(v)) for (const x of v) stack.push(x);
      else if (v && typeof v==="object") stack.push(v);
  }
  for (const name of own) names.delete(name);
  return names;
}

// Adam's source as the program's compile parsed it: the functions it has
// bodies for, its globals and its statements, in source order.
function AdamIndex(record) {
  const functions=new Map(),globals=new Map(),order=new Map(),starts=record.preludeFiles??[];
  const items=(record.parts?.[0]?.items??[]).filter(item=>item.filename==="<prelude>");
  items.forEach((item,i)=>order.set(item,i));
  for (const item of items) {
    if (item.kind==="FuncDecl" && item.body) functions.set(item.name,item);
    for (const v of item.kind==="VarDecl"?[item]:item.kind==="ClassDecl"?item.vars??[]:[])
      if (!v.forwardGlobal && !v.storage?.some(s=>s==="extern" || s==="_extern")) globals.set(v.name,item);
  }
  const file=item=>{
    let lo=0,hi=starts.length-1;
    while (lo<hi) {const mid=(lo+hi+1)>>1;if (starts[mid]<=item.line) lo=mid;else hi=mid-1;}
    return lo;
  };
  return {functions,globals,order,file,boot:(record.boot??[]).filter(stmt=>order.has(stmt.item))};
}

// The symbol table of a running program, and the compiles against it. host
// gives env (the host imports), alloc(size) for storage that lives as long
// as the program, out(text) for diagnostics and mem() for its memory.
export class Jit {
  constructor(record,host) {
    this.record=record;this.host=host;
    this.globals=new Map(record.globals);
    this.constEnv={...record.constEnv};
    this.functions=new Map([...record.functions].map(([name,fn])=>[name,{...fn}]));
    this.addresses=new Map(record.addresses);
    this.classes=[...record.classes];
    this.defines=record.defines;
    this.runtimeDefines=new Map();
    this.native=null;
    //Adam's globals the program's boot set; those taken later join them.
    this.linkedGlobals=new Set(record.linkedGlobals??record.globals.keys());
    this.ran=new Set((record.boot??[]).filter(stmt=>stmt.ran).map(stmt=>stmt.item));
    this.adam=null;
  }
  // V5.03 has all of Adam resident. Here a program links what it reaches,
  // so a name text uses that it left out compiles from Adam's own source,
  // with the functions and globals that reaches and the statements of the
  // files it reaches that have not run, as V5.03's boot ran them.
  reach(program,expr,seeds=[]) {
    const adam=this.adam??=AdamIndex(this.record),take=new Set(),files=new Set();
    const declared=new Set(program.decls.flatMap(d=>d.kind==="ClassDecl"?(d.vars??[]).map(v=>v.name):[d.name]));
    const stack=[...Names(expr?[expr]:program.items),...seeds],seen=new Set();
    const visit=item=>{
      if (take.has(item)) return;
      take.add(item);files.add(adam.file(item));
      for (const name of item.kind==="FuncDecl"?Free(item):Names([item])) stack.push(name);
    };
    for (let pass=0,changed=true;changed && pass<100000;pass++) {
      changed=false;
      while (stack.length) {
        const name=stack.pop();
        if (seen.has(name) || declared.has(name)) continue;
        seen.add(name);
        const fn=adam.functions.get(name),g=adam.globals.get(name);
        if (fn && !this.functions.has(name)) visit(fn);
        else if (g && !this.linkedGlobals.has(name)) visit(g);
      }
      for (const stmt of adam.boot)
        if (!this.ran.has(stmt.item) && !take.has(stmt.item) && (files.has(stmt.file) ||
            [...stmt.uses].some(name=>seen.has(name) && adam.globals.has(name) && !this.linkedGlobals.has(name)))) {
          visit(stmt.item);changed=true;
        }
    }
    if (!take.size) return program;
    //In source order and as the text's own, so its globals start in order.
    const copies=[...take].sort((a,b)=>adam.order.get(a)-adam.order.get(b))
      .map(item=>[item,{...item,filename:"<adam>"}]);
    const boot=new Set(adam.boot.map(stmt=>stmt.item));
    return {...program,items:[...copies.map(([,copy])=>copy),...program.items],
      decls:[...copies.filter(([item])=>!boot.has(item)).map(([,copy])=>copy),...program.decls],
      topStmts:[...copies.filter(([item])=>boot.has(item)).map(([,copy])=>copy),...program.topStmts],
      adam:take};
  }
  // What a module compiled from Adam made is the program's from then on.
  taken(program) {
    for (const item of program.adam??[]) {
      if (this.adam.boot.some(stmt=>stmt.item===item)) this.ran.add(item);
      for (const v of item.kind==="VarDecl"?[item]:item.kind==="ClassDecl"?item.vars??[]:[])
        this.linkedGlobals.add(v.name);
    }
  }
  attach(exports) {
    this.native=exports;
    for (const fn of this.functions.values())
      fn.fn=fn.exportName?exports[fn.exportName]:exports.__functions?.get(fn.address);
  }
  view(part) {
    return {memory:this.record.memory,globals:this.globals,constEnv:this.constEnv,
      functions:this.functions,addresses:this.addresses,stackLimit:this.record.stackLimit,
      laterBodies:part?.laterBodies??new Set(),next:part?.next??0,
      alloc:size=>this.host.alloc(Math.max(1,size)),
      reserve:name=>{
        const table=this.native.__functions,address=table.length;
        table.grow(1);this.addresses.set(name,address);return address;
      },
      dimension:expr=>{
        const value=this.expression(expr).run();
        return foldDim({kind:"IntLit",value:BigInt.asIntN(64,value),line:expr.line});
      }};
  }
  imports(module) {
    const n=this.native,fn={};
    for (const entry of WebAssembly.Module.imports(module))
      if (entry.module==="fn") {
        const target=this.functions.get(entry.name)?.fn;
        if (typeof target!=="function") throw new Error("Function not yet compiled: "+entry.name);
        fn[entry.name]=target;
      }
    return {env:{...this.host.env,mem:this.host.mem(),__sp:n.__sp,__core:n.__core,
      __exception:n.__exception,__stack_limit:n.__stack_limit,__functions:n.__functions,
      __exception_tag:n.__exception_tag},fn};
  }
  // Instantiate a compiled part and publish its symbols before it runs.
  instantiate(result,decls) {
    const module=new WebAssembly.Module(result.bytes);
    const instance=new WebAssembly.Instance(module,this.imports(module));
    this.globals=new Map(result.symbols.globals);
    Object.assign(this.constEnv,result.symbols.constEnv);
    for (const [name,fn] of result.symbols.functions) {
      const old=this.functions.get(name);
      //A body for a prototype keeps its address; a new function does not.
      if (fn.defined && old?.defined) this.addresses.delete(name);
      if (fn.defined || !old) this.functions.set(name,{...fn,fn:instance.exports[name]});
    }
    this.classes.push(...decls.filter(d=>d.kind==="ClassDecl"));
    for (const g of result.symbols.declared??[]) this.glblHashAdd(g);
    return instance;
  }
  // Defines made at run time stand for their text in parts compiled later.
  define(name,text) {
    this.defines.set(name,{params:null,body:lex(text,"<define>").slice(0,-1)});
    this.runtimeDefines.set(name,text);
  }
  substitute(items) {
    if (!this.runtimeDefines.size) return;
    const parsed=new Map(),seen=new Set(),stack=[...items];
    const value=name=>{
      if (!parsed.has(name)) {
        let node=null;
        try {
          const p=this.parser([...Expand([new Token("ident",name,name,1,1,0)],this.defines)],"<define>");
          node=p.parseExpression();
          if (!p.atEnd()) node=null;
        } catch {node=null;}
        parsed.set(name,node);
      }
      return parsed.get(name);
    };
    for (let steps=0;stack.length && steps<10000000;steps++) {
      const node=stack.pop();
      if (!node || typeof node!=="object" || seen.has(node)) continue;
      seen.add(node);
      if (node.kind==="Ident" && this.runtimeDefines.has(node.name) && value(node.name)) {
        const {line,filename}=node,expr=structuredClone(value(node.name));
        for (const key of Object.keys(node)) delete node[key];
        Object.assign(node,expr,{line,filename});
        continue;
      }
      for (const v of Object.values(node))
        if (Array.isArray(v)) for (const item of v) stack.push(item);
        else if (v && typeof v==="object") stack.push(v);
    }
  }
  parser(tokens,filename) {
    const eof=new Token("eof",null,"",1,1,0),parser=new Parser([...tokens,eof],filename);
    for (const d of this.classes)
      for (const c of [d,...d.nestedClasses??[]]) if (c.name) {
        parser.typeNames.add(c.name);parser.classes.set(c.name,c);
      }
    return parser;
  }
  compile(program,part=null,expr=null) {
    return compileJit({...program,classes:this.classes},this.view(part),expr);
  }
  // A statement that does not compile is cut, with its error thrown where it
  // would run (parser.js CompileCut); ran: a statement has run before these.
  // out.type: the type of the last statement's value.
  build(program,part,ran,out={}) {
    for (let tries=0;;tries++) {
      try {
        const full=this.reach(program),result=this.compile(full,part);
        const instance=this.instantiate(result,full.decls);
        out.type=result.type;
        this.taken(full);
        return instance;
      }
      catch (e) {
        const cut=tries<16 && e instanceof CodegenError?CompileCut(program,e,ran):null;
        if (!cut) throw e;
        program=cut;part=part && {...part,next:0};
      }
    }
  }
  // The program's next part, once the part before it has run.
  part(index) {
    const parts=this.record.parts,part=parts[index];
    if (!part) throw new Error("No program part "+index);
    this.substitute(part.items);
    return this.build({decls:part.decls,items:part.items,topStmts:part.topStmts},
      {laterBodies:part.laterBodies,next:index+1<parts.length?index+1:0},true);
  }
  // V5.03 Lex reads an #include with FileRead (Compiler/Lex.HC:701-707), so
  // text compiled at run time includes the files on the program's volume.
  readFile(path) {
    const n=this.native;
    if (typeof n?.FileRead!=="function") return null;
    const bytes=[...path].map(c=>c.charCodeAt(0)&255),name=n.MAlloc(BigInt(bytes.length+1),0n);
    try {
      const at=Number(name);
      new Uint8Array(this.host.mem().buffer).set([...bytes,0],at);
      const buf=n.FileRead(name,0n,0n);
      if (!buf) return null;
      const mem=new Uint8Array(this.host.mem().buffer),start=Number(buf),end=mem.indexOf(0,start);
      const text=ByteString(mem.subarray(start,end<0?start:end));
      n.Free(buf);
      return text;
    } finally {n.Free(name);}
  }
  // V5.03 PrsGlblVarLst HashAdds a glbl to Fs->hash_table as it compiles
  // it, so HashFind sees it and one declared again is found first.
  glblHashAdd({name,addr,size,cnt,array}) {
    const n=this.native;
    if (typeof n?.GlblVarHashAdd!=="function") return;
    const bytes=[...name].map(c=>c.charCodeAt(0)&255),st=n.MAlloc(BigInt(bytes.length+1),0n);
    try {
      new Uint8Array(this.host.mem().buffer).set([...bytes,0],Number(st));
      n.GlblVarHashAdd(st,BigInt(addr),BigInt(size),BigInt(cnt),array?1n:0n);
    } finally {n.Free(st);}
  }
  include(path,from) {
    const source=this.readFile(path);
    if (source!=null) return {filename:path,source};
    if (this.record.includeResolver) return this.record.includeResolver(path,from);
    throw new Error(from+": include not found: "+path);
  }
  // Text compiled and run as ExePutS does; null if it does not compile.
  text(source,filename="<exe>") {
    try {
      const tokens=preprocess(lex(source,filename),{_defines:this.defines,_seen:[],
        includeResolver:(path,from)=>this.include(path,from),filename});
      const parser=this.parser(tokens.slice(0,-1),filename),program=parser.parseProgram();
      this.substitute(program.items);
      return this.build(program,null,false);
    } catch (e) {
      this.host.out(String(e.message??e)+"\n");
      return null;
    }
  }
  // One statement the program's Lex read (Compiler/CMain.HC LexStmt2Bin):
  // main runs it and gives its last value, type is that value's RT_ code,
  // and address is main's new function table entry, which Call calls (a
  // table entry takes no args and gives an I64, codegen tableSig), or null
  // for a statement that only declares, whose main the host runs at once.
  statement(tokens) {
    const parser=this.parser(Expand(tokens,this.defines),"<cmd>"),program=parser.parseProgram();
    this.substitute(program.items);
    const out={},main=this.build(program,null,false,out).exports.__main;
    let address=null;
    if (program.topStmts.length) {
      const table=this.native.__functions;
      address=table.length;table.grow(1);table.set(address,main);
    }
    return {main,address,type:out.type===undefined?RT_U0:RawType(out.type)};
  }
  // The function CallExtStr names (V5.03 KUtils.HC _CALLEXTSTR finds its
  // HTT_FUN): start runs first what compiling it from Adam took, if any;
  // call(argc,argv) calls it with the 64 bits of each arg, as the asm pushes
  // them (a param it has no arg for gets 0), and gives what it returns.
  external(name) {
    let start=null;
    if (!this.functions.get(name)?.fn) {
      const adam=this.reach({decls:[],items:[],topStmts:[]},null,[name]);
      if (adam.adam) {
        start=this.instantiate(this.compile(adam),adam.decls).exports.__main;
        this.taken(adam);
      }
    }
    const fn=this.functions.get(name);
    if (typeof fn?.fn!=="function") return null;
    const word=new BigInt64Array(1),real=new Float64Array(word.buffer),n=this.native;
    const bits=value=>{real[0]=value;return word[0];},value=x=>{word[0]=x;return real[0];};
    return {start,fn:fn.fn,args:(argc,argv)=>{
      const view=new DataView(this.host.mem().buffer),count=Number(argc);
      const arg=i=>i<count?view.getBigInt64(Number(argv)+8*i,true):0n;
      //A table entry takes each arg as an I64 (codegen tableSig).
      const args=fn.params.map((p,i)=>isFloat(p.type) && fn.exportName?value(arg(i)):arg(i));
      if (fn.isVarArgs) {
        const rest=Math.max(0,count-fn.params.length),block=n.MAlloc(BigInt(8+8*rest),0n);
        view.setBigInt64(Number(block),BigInt(rest),true);
        for (let i=0;i<rest;i++) view.setBigInt64(Number(block)+8+8*i,arg(fn.params.length+i),true);
        args.push(block);
      }
      return args;
    },result:(args,res)=>{
      if (fn.isVarArgs) n.Free(args.at(-1));
      return typeof res==="number"?bits(res):typeof res==="bigint"?res:0n;
    }};
  }
  // One expression; run() gives its 64 bits and type its RT_ code.
  expression(expr) {
    //An expression's module has no statements: what it takes from Adam starts first.
    const adam=this.reach({decls:[],items:[],topStmts:[]},expr);
    if (adam.adam) {
      this.instantiate(this.compile(adam),adam.decls).exports.__main();
      this.taken(adam);
    }
    const result=this.compile({decls:[],items:[],topStmts:[]},null,expr);
    const instance=this.instantiate(result,[]);
    return {run:()=>instance.exports.__main(),type:RawType(result.type)};
  }
  tokens(tokens) {
    const parser=this.parser(Expand(tokens,this.defines),"<jit>");
    const expr=parser.parseExpression();
    if (!parser.atEnd()) parser.err("expected the end of the expression");
    return this.expression(expr);
  }
}
