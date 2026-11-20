// lexer.js - HolyC tokenizer.
//
// Handles HolyC's real surface syntax:
//   - // and /* */ comments
//   - identifiers (ASCII + high-byte extended chars TempleOS uses)
//   - numbers: decimal / 0x hex / 0b binary / floats (1.5 .5 1e3 1.2e-3)
//   - "strings" with escapes + adjacent-literal concatenation; $$ -> literal $
//   - 'char' constants, including multi-char packing (up to 8 bytes) used by HolyC
//   - DolDoc $IB/$IS expressions load binary records, through BP= links to
//     another document when opts.open is given; other markup is skipped.
//   - byte strings and Uint8Array input preserve CP437 text and binary payloads.
//
// Token shape: { type, value, text, line, col, pos, nchars? }
//   type: 'num' | 'str' | 'bin' | 'char' | 'ident' | 'punct' | 'eof'

import {DocBinsLoad} from "./doldoc.js";
import {ByteString,Identifier,CharByte} from "./encoding.js";
import {FloatLex} from "./float.js";

export class Token {
  constructor(type, value, text, line, col, pos) {
    this.type = type;
    this.value = value;
    this.text = text;
    this.line = line;
    this.col = col;
    this.pos = pos;
  }
}

const PUNCT3 = ["<<=", ">>=", "...", "::"];
const PUNCT2 = [
  "==", "!=", "<=", ">=", "&&", "||", "++", "--", "->",
  "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "^^",
];
const PUNCT1 = "+-*/%=<>!&|^~?:.,;(){}[]`@#";

function isIdentStart(c) {
  if (c===undefined) return false;
  return (
    (c >= "a" && c <= "z") ||
    (c >= "A" && c <= "Z") ||
    c === "_" ||
    c.charCodeAt(0) >= 0x80
  );
}
function isIdentPart(c) {
  return isIdentStart(c) || (c >= "0" && c <= "9");
}
function isDigit(c) { return c >= "0" && c <= "9"; }
function isHex(c) {
  return isDigit(c) || (c >= "a" && c <= "f") || (c >= "A" && c <= "F");
}

const SIMPLE_ESCAPES = {
  n: 10, t: 9, r: 13, "0": 0, "\\": 92, "'": 39, '"': 34,
  "`": 96, d: 36,
};

export function lex(src, filename = "<src>", opts = {}) {
  src=ByteString(src);
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = src.length;
  let bins;
  const directiveLines=new Map();

  function err(msg) {
    throw new Error(`${filename}:${line}:${col}: lex error: ${msg}`);
  }
  function peek(k = 0) { return src[i + k]; }
  function adv() {
    const c = src[i++];
    if (c === "\n") { line++; col = 1; } else { col++; }
    return c;
  }

  // Parse a single \-escape inside a string/char (i points just after backslash).
  function readEscape() {
    const c = peek();
    if (c === "x" || c === "X") {
      adv();
      let v = 0, cnt = 0;
      while (cnt < 2 && peek() !== undefined && isHex(peek())) {
        v = v * 16 + parseInt(adv(), 16); cnt++;
      }
      return v;
    }
    if (c in SIMPLE_ESCAPES) { adv(); return SIMPLE_ESCAPES[c]; }
    return 92; //Native unknown escapes retain the backslash and unread byte.
  }

  // Skip a DolDoc $...$ command in code context. i points at the opening $.
  function skipDolDoc() {
    adv(); // opening $
    let quoted=false;
    // close on the next un-escaped, non-doubled '$'
    while (i < n) {
      const c = peek();
      if (c === "\\") { adv(); if (i < n) adv(); continue; }
      if (c === '"') quoted=!quoted;
      if (c === "$" && !quoted) {
        adv(); // closing $
        return;
      }
      adv();
    }
  }

  // V5.03 lexes only a document's text entries (Compiler/Lex.HC:322-323,
  // cmp_type_flags_src_code), so the cursor and markup such as $IV,1$ that
  // sit inside a word leave it whole: m$IV,0$X is mX.
  function skipHidden() {
    if (peek()==="\x05") { adv(); return true; }
    if (peek()!=="$" || peek(1)==="$") return false;
    const at=i,l=line,cl=col;
    skipDolDoc();
    if (/^(IB|IS|SY)(?=[,+-]|$)/.test(src.slice(at+1,i-1))) {
      i=at;line=l;col=cl;
      return false;
    }
    return true;
  }
  // In quotes V5.03 gives an entry that is not text back as its command
  // (Compiler/Lex.HC LexDollar: "$$%$$Q$$" of Doc2PlainText), so the
  // string holds the link in "The $LK+PU,"Holy Spirit",...$ can puppet you."
  // and its quotes do not end it. The cursor is not in it.
  function quotedEntry(out) {
    if (peek()==="\x05") { adv(); return true; }
    if (peek()!=="$" || peek(1)==="$") return false;
    const at=i;
    skipDolDoc();
    for (const ch of src.slice(at,i)) out.push(CharByte(ch));
    return true;
  }
  // V5.03 LexGetChar gives a $SY$ entry as TK_SUPERSCRIPT, TK_SUBSCRIPT or
  // TK_NORMALSCRIPT, and Lex takes them as the ident chars '>', '<' and '='
  // (Compiler/Lex.HC:182-195,453-487). The shift is SY's attr, DOC_DFT
  // (I32_MIN) when it has none (Adam/DolDoc/DocPlain.HC:280-286).
  function scriptChar() {
    if (peek()!=="$" || peek(1)==="$") return null;
    const cmd=/^\$SY(?:[+-][A-Z]+)*(?:,+(-?)(0x[0-9A-Fa-f]+|\d+))?\$/.exec(src.slice(i,i+64));
    if (!cmd) return null;
    for (let k=0;k<cmd[0].length;k++) adv();
    const attr=cmd[2]===undefined?-1:Number(cmd[2])*(cmd[1]?-1:1);
    return attr<0?">":attr>0?"<":"=";
  }

  while (i < n) {
    const c = peek();
    const startLine = line, startCol = col, startPos = i;

    // whitespace
    if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === "\f" || c === "\v") {
      adv();
      continue;
    }

    const code = c.charCodeAt(0);
    if (!code) break;
    if (code===0x05 || code===0x1F) { adv(); continue; }
    if (code<0x09 || code>0x0D && code<0x20)
      err("unsupported control byte 0x"+code.toString(16));

    if (c==="\\") {
      const logicalLine=directiveLines.get(line)??line;
      adv();
      while (peek()===" " || peek()==="\t" || peek()==="\r") adv();
      if (peek()!=="\n") err("backslash outside a literal must continue a line");
      adv();
      directiveLines.set(line,logicalLine);
      continue;
    }

    // comments
    if (c === "/" && peek(1) === "/") {
      while (i < n && peek() !== "\n") adv();
      continue;
    }
    if (c === "/" && peek(1) === "*") {
      adv();adv();
      let depth=1;
      while (i<n && peek()!=="\0" && depth) {
        if (peek()==="/" && peek(1)==="*") {adv();adv();depth++;}
        else if (peek()==="*" && peek(1)==="/") {adv();adv();depth--;}
        else adv();
      }
      continue;
    }

    // DolDoc command in code context
    if (c === "$") {
      // V5.03: $$ in a doc is the char $, in code the term $ (PrsExp.HC).
      if (peek(1) === "$") { adv(); adv(); tokens.push(new Token("punct", "$", "$", startLine, startCol, startPos)); continue; }
      const script=scriptChar();
      if (script) {
        let s=script;
        while (i<n) {
          const more=scriptChar();
          if (more) s+=more;
          else if (isIdentPart(peek())) s+=adv();
          else if (!skipHidden()) break;
        }
        tokens.push(new Token("ident",Identifier(s),s,startLine,startCol,startPos));
        continue;
      }
      skipDolDoc();
      const command=src.slice(startPos+1,i-1);
      const kind=/^(IB|IS)(?=,|$)/.exec(command)?.[1];
      if (kind) {
        const number=/(?:^|,)BI=(\d+)(?:,|$)/.exec(command)?.[1];
        bins??=DocBinsLoad(src,filename,opts.open);
        const bytes=bins.get(Number(number));
        if (!bytes) err(`DolDoc binary ${number??"number"} is missing`);
        tokens.push(new Token(kind==="IB"?"bin":"num",kind==="IB"?bytes:
          {kind:"int",value:BigInt(bytes.length)},command,startLine,startCol,startPos));
      }
      continue;
    }

    // string literal (with adjacent concat handled here)
    if (c === '"') {
      adv();
      let bytes = [];
      while (i < n && peek() !== '"') {
        let ch = peek();
        if (ch === "\\") { adv(); bytes.push(readEscape() & 0xff); continue; }
        if (ch === "$" && peek(1) === "$") { adv(); adv(); bytes.push(0x24); continue; }
        if (quotedEntry(bytes)) continue;
        bytes.push(CharByte(adv()));
      }
      if (peek() === '"') adv(); else err("unterminated string");
      const text = String.fromCharCode(...bytes);
      tokens.push(new Token("str", bytes, text, startLine, startCol, startPos));
      continue;
    }

    // char constant (single or multi-char packed little-endian)
    if (c === "'") {
      adv();
      let chars = [];
      while (i < n && peek() !== "'") {
        if (peek() === "\\") { adv(); chars.push(readEscape() & 0xff); continue; }
        if (peek() === "$" && peek(1) === "$") { adv(); adv(); chars.push(0x24); continue; }
        if (quotedEntry(chars)) continue;
        chars.push(CharByte(adv()));
      }
      if (peek() === "'") adv(); else err("unterminated char constant");
      if (chars.length > 8) err("char constant limited to 8 bytes");
      // pack little-endian: first char is least significant byte
      let val = 0n;
      for (let k = chars.length - 1; k >= 0; k--) val = (val << 8n) | BigInt(chars[k] & 0xff);
      const text = String.fromCharCode(...chars);
      const tk = new Token("char", val, text, startLine, startCol, startPos);
      tk.nchars = chars.length;
      tokens.push(tk);
      continue;
    }

    // numbers
    if (isDigit(c) || (c === "." && isDigit(peek(1)))) {
      let start = i;
      let isFloat = false;
      if (isDigit(c) && /[xXbB]/.test(peek(1)||" ")) {
        const radix=peek(1).toUpperCase()==="X"?16n:2n;
        let value=BigInt(adv());
        adv();
        while (i<n && (radix===16n?isHex(peek()):peek()==="0" || peek()==="1"))
          value=BigInt.asIntN(64,value*radix+BigInt(parseInt(adv(),Number(radix))));
        tokens.push(new Token("num",{kind:"int",value},src.slice(start,i),
          startLine,startCol,startPos));
        continue;
      }
      let s = "";
      while (i<n && isDigit(peek())) s+=adv();
      if (peek()==="." && peek(1)!==".") {
        isFloat=true;s+=adv();
        while (i<n && isDigit(peek())) s+=adv();
      }
      if (peek() === "e" || peek() === "E") {
        isFloat = true; s += adv();
        if (peek() === "-") s += adv();
        while (i < n && isDigit(peek())) s += adv();
      }
      if (isFloat) {
        tokens.push(new Token("num", { kind: "float", value: FloatLex(s) }, s, startLine, startCol, startPos));
      } else {
        tokens.push(new Token("num", { kind: "int", value: BigInt.asIntN(64,BigInt(s)) }, s, startLine, startCol, startPos));
      }
      continue;
    }

    // identifier
    if (isIdentStart(c)) {
      let s = "";
      while (i < n) {
        const script=scriptChar();
        if (script) s+=script;
        else if (isIdentPart(peek())) s += adv();
        else if (!skipHidden()) break;
      }
      tokens.push(new Token("ident", Identifier(s), s, startLine, startCol, startPos));
      continue;
    }

    // punctuation / operators (longest match first)
    const three = src.substr(i, 3);
    if (PUNCT3.includes(three)) { adv(); adv(); adv(); tokens.push(new Token("punct", three, three, startLine, startCol, startPos)); continue; }
    const two = src.substr(i, 2);
    if (PUNCT2.includes(two)) { adv(); adv(); tokens.push(new Token("punct", two, two, startLine, startCol, startPos)); continue; }
    if (PUNCT1.includes(c)) { adv(); tokens.push(new Token("punct", c, c, startLine, startCol, startPos)); continue; }

    err("unexpected character "+JSON.stringify(c));
  }

  tokens.push(new Token("eof", null, "", line, col, i));
  for (const token of tokens) {
    token.filename=filename;
    token.directiveLine=directiveLines.get(token.line)??token.line;
  }
  return tokens;
}
