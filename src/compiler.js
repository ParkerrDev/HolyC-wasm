// compiler.js - orchestrates lex -> preprocess -> parse -> codegen.
//
// The HolyC prelude is compiled together with the user program so its #defines,
// classes, and functions are in scope (mirroring how TempleOS boots its runtime
// before user code). The prelude and user source are lexed SEPARATELY so each
// token keeps its true file+line - user diagnostics then report real line
// numbers instead of being shifted by the prelude's length.
import { lex } from "./lexer.js";
import { preprocess } from "./preprocess.js";
import { parse,CompileCut } from "./parser.js";
import { compile as codegen,CodegenError,FLOAT_MUL_I64 } from "./codegen.js";
import { PlanSegments } from "./jit.js";
import { StrWords } from "./names.js";
import { PRELUDE_SRC, PRELUDE_FILES, RUNTIME_INITIALIZERS, RUNTIME_INTERFACES, RUNTIME_ADDRESSES } from "./prelude.js";
import {RUNTIME_FUNCTION_EXPORTS} from "./function-exports.js";
import {FLOAT_CONVERT_SRC} from "./runtime-source.js";

// A document named by a DolDoc BP= link, found as FileRead finds it: the
// name, then the name with .Z toggled (Kernel/BlkDev/DskFile.HC:18-22).
function DocOpen(resolver) {
  if (!resolver) return null;
  return (path,from)=>{
    for (const name of [path,/\.Z$/i.test(path)?path.slice(0,-2):path+".Z"]) {
      let file=null;
      try { file=resolver(name,from); } catch { file=null; }
      if (typeof file==="string") return {filename:name,source:file};
      if (file) return file;
    }
    return null;
  };
}

export function compileHolyC(source, opts = {}) {
  // TempleOS has one Adam, and every program runs on all of it.
  if (opts.runtimeProfile!==undefined)
    throw new Error('HolyC has one runtime; runtimeProfile is gone');
  const userName = opts.filename || "<holyc>";
  const open=DocOpen(opts.includeResolver);
  let tokens;
  if (opts.noPrelude) {
    tokens = lex(source, userName, {open});
  } else {
    const preToks = lex(PRELUDE_SRC, "<prelude>").filter((t) => t.type !== "eof");
    const userToks = lex(source, userName, {open});
    tokens = [...preToks, ...userToks];
  }
  const pp = preprocess(tokens, {
    includeResolver: opts.includeResolver,
    defines: opts.defines || {},
    projectIncludes: opts.projectIncludes,
    filename: userName,
    open,
  });
  // Codegen keeps what it finds on the tree, so a compile tried again parses
  // the tokens again.
  const Parse=()=>{
    const ast=parse(pp, userName, { resilient: opts.resilient,
      runtimeFunctionExports:opts.noPrelude?[]:RUNTIME_FUNCTION_EXPORTS,
      intrinsicFunctions:["MyCore","GetRSP"] });
    const helper=parse(lex(FLOAT_CONVERT_SRC,"<compiler>")).decls[0];
    helper.name=FLOAT_MUL_I64;
    ast.decls.unshift(helper);ast.items.unshift(helper);
    return ast;
  };
  let ast=Parse();
  // V5.03 compiles a top-level statement after the one before it has run.
  // The compile here holds the program up to its first statement that can
  // compile at run time; the later parts compile as it runs (jit.js). A
  // statement that does not compile is cut, with its error thrown there.
  let built;
  for (let tries=0;!built;tries++) {
    try {built=Build(ast,opts);}
    catch (e) {
      const cut=!opts.resilient && tries<16 && e instanceof CodegenError?CompileCut(Parse(),e):null;
      if (!cut) throw e;
      ast=cut;
    }
  }
  const {plan,program,result:{ bytes, warnings, dataEnd, globals, memory, requiredCapabilities,localRegisters,symbols }}=built;
  // The symbol table code compiled while the program runs starts from (jit.js).
  const jit=symbols?{...symbols,memory,parts:plan.parts,defines:pp.defines,
    classes:program.decls.filter(d=>d.kind==="ClassDecl"),
    includeResolver:opts.includeResolver,filename:userName}:undefined;
  return { bytes, warnings, dataEnd, globals, requiredCapabilities,...(localRegisters?{localRegisters}:{}), ast,
    ...(jit?{jit}:{}), parts:plan.parts.length, diagnostics: ast.diagnostics || [],
    ...(ast.compileError?{compileError:ast.compileError}:{}) };
}

function Build(ast,opts) {
  const plan=PlanSegments(ast),first=plan.parts[0],split=plan.parts.length>1;
  const program=split?{...ast,decls:first.decls,items:first.items,topStmts:first.topStmts}:ast;
  const result=codegen(program, {
    ...opts,runtimeInitializers:opts.noPrelude?[]:RUNTIME_INITIALIZERS,
    runtimeInterfaces:opts.noPrelude?[]:RUNTIME_INTERFACES,
    runtimeAddresses:opts.noPrelude?[]:RUNTIME_ADDRESSES,preludeFiles:PRELUDE_FILES,
    jitMain:split?{names:plan.names,words:StrWords(plan.parts.slice(1).flatMap(part=>part.items)),
      laterBodies:first.laterBodies,next:1}:undefined});
  return {plan,program,result};
}

export { lex, preprocess, parse };
