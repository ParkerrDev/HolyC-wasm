// compiler.js - orchestrates lex -> preprocess -> parse -> codegen.
//
// The HolyC prelude is compiled together with the user program so its #defines,
// classes, and functions are in scope (mirroring how TempleOS boots its runtime
// before user code). The prelude and user source are lexed SEPARATELY so each
// token keeps its true file+line - user diagnostics then report real line
// numbers instead of being shifted by the prelude's length.
import { lex } from "./lexer.js";
import { preprocess } from "./preprocess.js";
import { parse } from "./parser.js";
import { compile as codegen } from "./codegen.js";
import { PRELUDE_SRC, Prelude, RUNTIME_INITIALIZERS, RUNTIME_INTERFACES, RUNTIME_ADDRESSES } from "./prelude.js";
import {RUNTIME_FUNCTION_EXPORTS} from "./function-exports.js";
import {KEYDEV_SRC} from "./keydev-prelude.js";
import {DOC_ENTRY_SRC} from "./doc-entry.js";
import {DOC_LAYOUT_SRC} from "./doc-layout.js";
import {DOC_RECALC_SRC} from "./doc-recalc.js";
import {DOC_LIFE_SRC} from "./doc-life.js";
import {DOC_OUTPUT_SRC} from "./doc-output.js";
import {DOC_PUT_SRC} from "./doc-put.js";
import { FLOAT_CONVERT_SRC,FLOAT_MUL_I64 } from "./float-convert.js";

export function compileHolyC(source, opts = {}) {
  if (![undefined,'console','keydev'].includes(opts.runtimeProfile))
    throw new Error('Unknown HolyC runtime profile: '+opts.runtimeProfile);
  const keydev=opts.runtimeProfile==='keydev';
  const prelude=keydev?Prelude(KEYDEV_SRC,DOC_ENTRY_SRC+DOC_LAYOUT_SRC+DOC_RECALC_SRC+DOC_LIFE_SRC+DOC_OUTPUT_SRC+DOC_PUT_SRC):PRELUDE_SRC;
  const hooks=keydev?[...RUNTIME_INITIALIZERS,
    {name:'KeyOutputHostInit',globals:['keydev']}]:RUNTIME_INITIALIZERS;
  const userName = opts.filename || "<holyc>";
  let tokens;
  if (opts.noPrelude) {
    tokens = lex(source, userName);
  } else {
    const preToks = lex(prelude, "<prelude>").filter((t) => t.type !== "eof");
    const userToks = lex(source, userName);
    tokens = [...preToks, ...userToks];
  }
  const pp = preprocess(tokens, {
    includeResolver: opts.includeResolver,
    defines: opts.defines || {},
    projectIncludes: opts.projectIncludes,
    filename: userName,
  });
  const ast = parse(pp, userName, { resilient: opts.resilient,
    runtimeFunctionExports:opts.noPrelude?[]:RUNTIME_FUNCTION_EXPORTS,
    intrinsicFunctions:["MyCore"] });
  const helper=parse(lex(FLOAT_CONVERT_SRC,"<compiler>")).decls[0];
  helper.name=FLOAT_MUL_I64;
  ast.decls.unshift(helper);ast.items.unshift(helper);
  const { bytes, warnings, dataEnd, globals, requiredCapabilities,localRegisters } = codegen(ast, {
    ...opts,runtimeInitializers:opts.noPrelude?[]:hooks,
    runtimeInterfaces:opts.noPrelude?[]:RUNTIME_INTERFACES,
    runtimeAddresses:opts.noPrelude?[]:RUNTIME_ADDRESSES});
  return { bytes, warnings, dataEnd, globals, requiredCapabilities,...(localRegisters?{localRegisters}:{}), ast, diagnostics: ast.diagnostics || [] };
}

export { lex, preprocess, parse };
