// preprocess.js - token-level HolyC preprocessor.
//
// Supports: #define (object- and function-like), #undef, #include,
// #ifdef/#ifndef/#else/#endif, #exe{...} out of functions, and ignores #help_index / #assert /
// #pragma-ish directives we don't need. Macro expansion is recursive with a
// guard. Backslash-newline continuations are handled by the caller (text level).

import { lex } from "./lexer.js";
import { Parser } from "./parser.js";
import { foldConstInt } from "./fold.js";

// V5.03 Kernel/KernelA.HH:2035-2043 defines these as #exe{} streams of the
// file being compiled. HolyC-wasm compiles a file as ExeFile does, never as
// a command line, so __CMD_LINE__ is 0 (checked against V5.03).
const FILE_DEFINES={
  __DIR__:t=>Str(t,t.filename.includes("/")?t.filename.slice(0,t.filename.lastIndexOf("/")):""),
  __FILE__:t=>Str(t,t.filename),
  __LINE__:t=>Num(t,t.line),
  __CMD_LINE__:t=>Num(t,0),
};
function Str(t,text) {
  const bytes=[...text].map(c=>c.charCodeAt(0)&0xFF);
  return {...t,type:"str",value:bytes,text:String.fromCharCode(...bytes)};
}
function Num(t,n) {
  return {...t,type:"num",value:{kind:"int",value:BigInt(n)},text:String(n)};
}

const INT_TYPES=new Set(["I8","I16","I32","I64","U8","U16","U32","U64","Bool"]);
const WRITES=new Set(["=","+=","-=","*=","/=","%=","&=","|=","^=","<<=",">>=","++","--"]);
// The JIT reads a global's live value in #if (Compiler/Lex.HC:833-835). A
// global with a constant initializer that no earlier token writes or takes
// the address of still holds that value, so #if mp_cnt>=4 sees mp_cnt=1.
function Frozen(seen,name) {
  const p=(t,v)=>t?.type==="punct" && t.value===v;
  let value=null,depth=0,decls=0;
  for (let i=0;i<seen.length;i++) {
    const t=seen[i];
    if (p(t,"{") || p(t,"(") || p(t,"[")) depth++;
    else if (p(t,"}") || p(t,")") || p(t,"]")) depth--;
    if (t.type!=="ident" || t.value!==name) continue;
    if (["&","++","--"].some(v=>p(seen[i-1],v))) return null;
    if (seen[i+1]?.type!=="punct" || !WRITES.has(seen[i+1].value)) continue;
    let k=i-1;
    while (k>=0 && !p(seen[k],";") && !p(seen[k],"{") && !p(seen[k],"}")) k--;
    while (["public","static","extern"].includes(seen[k+1]?.value)) k++;
    const neg=p(seen[i+2],"-"),lit=seen[i+(neg?3:2)],end=seen[i+(neg?4:3)];
    if (depth || !p(seen[i+1],"=") || !INT_TYPES.has(seen[k+1]?.value) ||
        seen[i-1]!==seen[k+1] && !p(seen[i-1],",") ||
        lit?.type!=="num" || lit.value.kind!=="int" || !p(end,",") && !p(end,";"))
      return null;
    decls++;
    value=neg?-lit.value.value:lit.value.value;
  }
  return decls===1?value:null;
}

// The statements of an #exe block, from the rest of its directive line and
// the tokens after it: {tokens, end}, end the index after its '}' (or i when
// the block ends on the directive line); null when no '{' starts it.
function ExeBlock(rest,tokens,i) {
  const all=[...rest],start=rest.length;
  if (!all.length) {
    if (!(tokens[i]?.type==="punct" && tokens[i].value==="{")) return null;
  } else if (!(all[0].type==="punct" && all[0].value==="{")) return null;
  let depth=0,k=0,j=i;
  for (let steps=0;steps<tokens.length+start;steps++) {
    if (k>=all.length) {
      if (j>=tokens.length || tokens[j].type==="eof") break;
      all.push(tokens[j++]);
    }
    const t=all[k++];
    if (t.type==="punct" && t.value==="{") depth++;
    else if (t.type==="punct" && t.value==="}" && --depth===0)
      return {tokens:all.slice(1,k-1),end:j};
  }
  throw new Error("#exe: missing '}'");
}

function isDirectiveHash(tokens, idx) {
  const t = tokens[idx];
  if (!(t.type === "punct" && t.value === "#")) return false;
  // must be first token on its line
  if (idx === 0) return true;
  return (tokens[idx - 1].directiveLine??tokens[idx - 1].line) !== (t.directiveLine??t.line);
}

export function preprocess(tokens, opts = {}) {
  const project = opts.projectIncludes ? opts.includeContext || {defines:new Map(),included:new Set(),seen:[]} : null;
  // One defines map per compilation, threaded into every #include (opts._defines): a header's #defines
  // stay in force after the include returns, as in C and TempleOS. Project mode shares project.defines
  // the same way. Builtin defines are seeded only when the map is created.
  const defines = project?.defines || opts._defines || new Map(); // name -> {params:null|[...], body:[tokens]}
  for (const [k, v] of Object.entries(opts.includeContext || opts._defines ? {} : opts.defines || {})) {
    defines.set(k, { params: null, body: lex(String(v)).slice(0, -1) });
  }
  if (!opts.includeContext && !opts._defines)
    for (const [k, file] of Object.entries(FILE_DEFINES)) defines.set(k, { params: null, body: [], file });
  const seen = project?.seen || opts._seen || []; // expanded tokens so far, for #if
  const includeResolver = opts.includeResolver || (() => null);
  const includedOnce = project?.included || new Set();

  const out = [],pending=[];
  const flush=()=>{
    const done=expandMacros(pending,defines);
    for (const t of done) {out.push(t);seen.push(t);}
    pending.length=0;
  };
  const condStack = []; // {active, taken, parentActive}
  function activeNow() { return condStack.every((c) => c.active); }
  let skipBraceNext = false;  // set after #exe to drop the following {...} block
  let depth=0; // braces open in the code so far: 0 is out of any function

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === "eof") break;

    // Skip a brace-balanced block following an #exe directive (compile-time code).
    if (skipBraceNext && t.type === "punct" && t.value === "{") {
      let depth = 0;
      while (i < tokens.length) {
        const tk = tokens[i];
        if (tk.type === "punct" && tk.value === "{") depth++;
        else if (tk.type === "punct" && tk.value === "}") { depth--; if (depth === 0) { i++; break; } }
        i++;
      }
      skipBraceNext = false;
      continue;
    }
    if (skipBraceNext && !(t.type === "punct" && t.value === ";")) skipBraceNext = false;

    if (isDirectiveHash(tokens, i)) {
      //Later definitions must not rewrite code before this directive.
      flush();
      const line = t.directiveLine??t.line;
      // gather the rest of this line's tokens
      let j = i + 1;
      const lineToks = [];
      while (j < tokens.length && (tokens[j].directiveLine??tokens[j].line) === line && tokens[j].type !== "eof") {
        lineToks.push(tokens[j]); j++;
      }
      i = j;
      const dir = lineToks[0] && lineToks[0].type === "ident" ? lineToks[0].value : "";

      if (dir === "ifdef" || dir === "ifndef") {
        const name = lineToks[1] && lineToks[1].value;
        const def = defines.has(name);
        const cond = dir === "ifdef" ? def : !def;
        condStack.push({ active: activeNow() && cond, taken: cond, parentActive: activeNow() });
        continue;
      }
      if (dir === "if") {
        const cond = activeNow() && IfValue(lineToks.slice(1), defines, seen, t);
        condStack.push({ active: activeNow() && cond, taken: cond, parentActive: activeNow() });
        continue;
      }
      if (dir === "else") {
        const c = condStack[condStack.length - 1];
        if (c) c.active = c.parentActive && !c.taken;
        continue;
      }
      if (dir === "elif") {
        const c = condStack[condStack.length - 1];
        if (c) { c.active = c.parentActive && !c.taken; c.taken = c.taken || c.active; }
        continue;
      }
      if (dir === "endif") { condStack.pop(); continue; }

      if (!activeNow()) continue; // inside a disabled block: ignore everything

      if (dir === "define") {
        const name = lineToks[1] && lineToks[1].value;
        if (!name) continue;
        // function-like if next token is '(' immediately adjacent
        let params = null;
        let bodyStart = 2;
        const p1 = lineToks[1], p2 = lineToks[2];
        if (p2 && p2.type === "punct" && p2.value === "(" &&
            p2.pos === p1.pos + p1.text.length) {
          params = [];
          let k = 3;
          while (k < lineToks.length && !(lineToks[k].type === "punct" && lineToks[k].value === ")")) {
            if (lineToks[k].type === "ident") params.push(lineToks[k].value);
            k++;
          }
          bodyStart = k + 1;
        }
        defines.set(name, { params, body: lineToks.slice(bodyStart) });
        continue;
      }
      if (dir === "undef") {
        const name = lineToks[1] && lineToks[1].value;
        if (name) defines.delete(name);
        continue;
      }
      if (dir === "include") {
        const arg = lineToks[1];
        if (arg && arg.type === "str") {
          const path = arg.text;
          const resolved = includeResolver(path, opts.filename);
          if(project && resolved==null)throw new Error(`${opts.filename}: include not found: ${path}`);
          const filename = typeof resolved==='object' && resolved ? resolved.filename : path;
          const source = typeof resolved==='object' && resolved ? resolved.source : resolved;
          if (resolved != null && !includedOnce.has(filename)) {
            if(project && includedOnce.size>=512)throw new Error('Too many files in native project.');
            includedOnce.add(filename);
            const subToks = lex(source, filename, {open:opts.open});
            // recursively preprocess the included file with the SAME defines map (and its own filename for diagnostics)
            const sub = project ? preprocess(subToks,{...opts,filename,includeContext:project}) : preprocess(subToks, { ...opts, filename, _defines: defines, _seen: seen });
            for (const t of sub) if (t.type!=="eof") out.push(t);
          }
        }
        continue;
      }
      // #exe {...} runs its statements where it stands (V5.03 Lex.HC:1031,
      // PrsStmt.HC PrsStreamBlk: ExeCmdLine in the task's hash table). Out of
      // any function, the program's statements run in that order too, so the
      // block's statements stand there as top-level statements. In a body it
      // would run at compile time; that is not modelled, so it is dropped.
      if (dir === "exe") {
        const body=ExeBlock(lineToks.slice(1),tokens,i);
        if (!body) {skipBraceNext = true;continue;}
        if (activeNow() && depth===0) tokens=[...tokens.slice(0,i),...body.tokens,...tokens.slice(body.end)];
        else i=body.end;
        continue;
      }
      // ignore: help_index, assert, pragma, etc.
      continue;
    }

    if (!activeNow()) { i++; continue; }
    if (t.type==="punct") depth+=t.value==="{"?1:t.value==="}"?-1:0;
    pending.push(t);
    i++;
  }

  flush();
  const eof = tokens[tokens.length - 1];
  out.push(eof && eof.type === "eof" ? eof : { type: "eof", value: null, text: "", line: 0, col: 0, pos: 0 });
  out.defines = defines; // the program's defines, for an expression compiled at run time (jit.js)
  return out;
}

// Expand defines in tokens that come after the compile (jit.js).
export function Expand(tokens, defines) {
  return expandMacros(tokens, defines);
}


// #if takes the rest of its line as an expression (Compiler/Lex.HC:833-835).
function IfValue(toks, defines, seen, at) {
  const expanded = expandMacros(toks, defines).map(t => {
    if (t.type !== "ident") return t;
    const value = Frozen(seen, t.value);
    if (value === null)
      throw new Error(`${at.filename}:${at.line}: #if needs a compile-time value for '${t.value}'`);
    return Num(t, value);
  });
  if (!expanded.length) throw new Error(`${at.filename}:${at.line}: #if needs an expression`);
  const parser = new Parser([...expanded, { ...at, type: "eof", value: null, text: "" }], at.filename);
  const node = parser.parseExpression();
  const value = parser.atEnd() ? foldConstInt(node) : null;
  if (value === null) throw new Error(`${at.filename}:${at.line}: #if expression is not a constant integer`);
  return value !== 0n;
}

function expandMacros(tokens, defines, site = null) {
  const out = [];
  let i = 0;
  const guard = new Set();
  function expandIdent(name, i, tokens, active) {
    // returns {tokens, next}
    const def = defines.get(name);
    if (!def || active.has(name)) return null;
    if (def.file) return { tokens: [def.file(site ?? tokens[i])], next: i + 1 };
    if (def.params === null) {
      const sub = expandMacros(def.body, defines, site ?? tokens[i]); // recursive
      return { tokens: sub, next: i + 1 };
    }
    // function-like: need '(' next
    let k = i + 1;
    if (!(tokens[k] && tokens[k].type === "punct" && tokens[k].value === "(")) return null;
    k++;
    const args = [];
    let depth = 1, cur = [];
    while (k < tokens.length && depth > 0) {
      const tk = tokens[k];
      if (tk.type === "punct" && tk.value === "(") { depth++; cur.push(tk); }
      else if (tk.type === "punct" && tk.value === ")") { depth--; if (depth === 0) { args.push(cur); } else cur.push(tk); }
      else if (tk.type === "punct" && tk.value === "," && depth === 1) { args.push(cur); cur = []; }
      else cur.push(tk);
      k++;
    }
    // substitute params in body
    const sub = [];
    for (const bt of def.body) {
      if (bt.type === "ident" && def.params.includes(bt.value)) {
        const argIdx = def.params.indexOf(bt.value);
        sub.push(...(args[argIdx] || []));
      } else sub.push(bt);
    }
    return { tokens: expandMacros(sub, defines, site ?? tokens[i]), next: k };
  }
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === "ident" && defines.has(t.value)) {
      const r = expandIdent(t.value, i, tokens, guard);
      if (r) {
        guard.add(t.value);
        for (const et of r.tokens) out.push(et);
        guard.delete(t.value);
        i = r.next;
        continue;
      }
    }
    out.push(t);
    i++;
  }
  return out;
}
