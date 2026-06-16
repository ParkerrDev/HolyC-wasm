//holyc-fmt -- a formatter for HolyC, written in HolyC.
//
//It is itself written in the canonical TempleOS style it normalizes:
//  * 2-space indent per nesting level
//  * function/bare-block '{' on its own line, control-flow '{' on the same line
//  * a space after if/while/for/switch, none after a function name
//  * no space after ',' and none around operators (Terry's compact style)
//These conventions were measured across all 519 .HC files in the TempleOS
//source tree (see README.md).  This is the pure, I/O-free core: feed it a
//NUL-terminated source buffer, get back a freshly-MAlloc'd formatted buffer.
//The TempleOS file driver (FileRead/FileWrite) lives in Fmt.HC.

//==================== character classes ====================
I64 IsWhite(I64 c)
{
  return c==' ' || c=='\t';
}

I64 IsAlpha(I64 c)
{
  if ('a'<=c<='z') return TRUE;
  if ('A'<=c<='Z') return TRUE;
  return c=='_';
}

I64 IsDigit(I64 c)
{
  return '0'<=c<='9';
}

I64 IsIdent(I64 c)
{
  return IsAlpha(c) || IsDigit(c);
}

//Does the token at s[a..b) exactly equal the keyword kw?
I64 TokIs(U8 *s, I64 a, I64 b, U8 *kw)
{
  I64 k=0;
  while (kw[k]) {
    if (a+k>=b || s[a+k]!=kw[k]) return FALSE;
    k++;
  }
  return a+k==b;
}

//Does the keyword kw start at s[p..e) as a whole token (followed by a non-ident)?
I64 KwAt(U8 *s, I64 p, I64 e, U8 *kw)
{
  I64 k=0;
  while (kw[k]) {
    if (p+k>=e || s[p+k]!=kw[k]) return FALSE;
    k++;
  }
  if (p+k<e && IsIdent(s[p+k])) return FALSE;
  return TRUE;
}

I64 IsCtlKw(U8 *s, I64 a, I64 b)
{//keywords that take a space before '(': if/while/for/switch
  return TokIs(s,a,b,"if") || TokIs(s,a,b,"while") ||
         TokIs(s,a,b,"for") || TokIs(s,a,b,"switch");
}

I64 LineIsCase(U8 *s, I64 fs, I64 e)
{
  return KwAt(s,fs,e,"case") || KwAt(s,fs,e,"default");
}

I64 LineIsLabel(U8 *s, I64 fs, I64 e)
{//a goto-label: ident ':' with nothing but space/comment after, and not '::'
  I64 p=fs;
  if (!IsAlpha(s[fs])) return FALSE;
  while (p<e && IsIdent(s[p])) p++;
  if (p>=e || s[p]!=':') return FALSE;
  if (p+1<e && s[p+1]==':') return FALSE;
  if (LineIsCase(s,fs,e)) return FALSE;
  p++;
  while (p<e && IsWhite(s[p])) p++;
  if (p>=e) return TRUE;
  if (s[p]=='/' && p+1<e && (s[p+1]=='/' || s[p+1]=='*')) return TRUE;
  return FALSE;
}

I64 SkipWsC(U8 *s, I64 p, I64 e)
{
  while (p<e && IsWhite(s[p])) p++;
  return p;
}

I64 MatchParen(U8 *s, I64 p, I64 e)
{//s[p]=='(' ; return index just past the matching ')' (may equal e), or -1 if it
 //does not close on this line
  I64 d=0;
  while (p<e) {
    I64 c=s[p];
    if (c=='"' || c=='\'') {
      I64 q=c;
      p++;
      while (p<e) {
        if (s[p]=='\\' && p+1<e) { p+=2; continue; }
        if (s[p]==q) { p++; break; }
        p++;
      }
      continue;
    }
    if (c=='/' && p+1<e && s[p+1]=='/') return -1;
    if (c=='(') { d++; p++; continue; }
    if (c==')') { d--; p++; if (d==0) return p; continue; }
    p++;
  }
  return -1;
}

I64 RestEmpty(U8 *s, I64 p, I64 e)
{//nothing but whitespace or a comment remains
  p=SkipWsC(s,p,e);
  if (p>=e) return TRUE;
  if (s[p]=='/' && p+1<e && (s[p+1]=='/' || s[p+1]=='*')) return TRUE;
  return FALSE;
}

//Is this line a control header whose single-statement body is on the NEXT line?
//e.g. "if (x)" / "else" / "do" / "} catch" / "else if (y)".  Returns FALSE for
//one-liners ("if (x) foo();") and brace forms ("if (x) {").
I64 BracelessHeader(U8 *s, I64 fs, I64 e)
{
  I64 p=fs;
  if (p<e && s[p]=='}') p=SkipWsC(s,p+1,e);     //"} catch" / "} else"
  if (KwAt(s,p,e,"else")) {
    p=SkipWsC(s,p+4,e);
    if (p>=e || (s[p]=='/' && p+1<e && (s[p+1]=='/' || s[p+1]=='*'))) return TRUE;
    if (s[p]=='{') return FALSE;
  }
  if (KwAt(s,p,e,"do") || KwAt(s,p,e,"try") || KwAt(s,p,e,"catch")) {
    I64 k=p;
    while (k<e && IsIdent(s[k])) k++;
    return RestEmpty(s,k,e);
  }
  if (KwAt(s,p,e,"if") || KwAt(s,p,e,"while") || KwAt(s,p,e,"for") || KwAt(s,p,e,"switch")) {
    I64 k=p;
    while (k<e && IsIdent(s[k])) k++;
    k=SkipWsC(s,k,e);
    if (k>=e || s[k]!='(') return FALSE;
    k=MatchParen(s,k,e);
    if (k<0) return FALSE;                        //paren spans lines -> not a clean header
    return RestEmpty(s,k,e);
  }
  return FALSE;
}

//==================== formatter state (carried across lines) ====================
I64 g_indent_w=2;     //spaces per level (when not using tabs)
I64 g_use_tabs=FALSE;
I64 *g_sw=NULL;       //per-open-brace: is it a switch body?
I64 g_depth=0;        //open braces
I64 g_swcnt=0;        //open switch bodies
I64 g_paren=0;        //open ()/[] (for line-continuation indent)
I64 g_pend_sw=0;      //a 'switch' keyword is awaiting its '{'
I64 g_bc=0;           //inside a /* */ comment crossing a newline
I64 *g_hstk=NULL;     //brace depth at which each pending braceless body was opened
I64 g_hn=0;           //number of pending braceless-body hanging indents
I64 g_lastcode=0;     //last non-space char emitted while in code (for "ends a statement?")

I64 EmitIndent(U8 *out, I64 o, I64 lvl)
{
  I64 k;
  if (lvl<0) lvl=0;
  if (g_use_tabs) {
    for (k=0; k<lvl; k++)
      out[o++]='\t';
  } else {
    for (k=0; k<lvl*g_indent_w; k++)
      out[o++]=' ';
  }
  return o;
}

//Copy s[fs..e) to out with inline normalization, and update the brace/paren/
//switch stack as code is scanned.  Strings, char-consts and comments are copied
//verbatim.  Returns the new output index.
I64 EmitAndScan(U8 *out, I64 o, U8 *s, I64 fs, I64 e)
{
  I64 p=fs;
  while (p<e) {
    I64 c=s[p];
    if (c=='"') {                       //string literal
      out[o++]=c;
      p++;
      while (p<e) {
        if (s[p]=='\\' && p+1<e) { out[o++]=s[p]; out[o++]=s[p+1]; p+=2; continue; }
        out[o++]=s[p];
        if (s[p]=='"') { p++; break; }
        p++;
      }
      continue;
    }
    if (c=='\'') {                       //char const
      out[o++]=c;
      p++;
      while (p<e) {
        if (s[p]=='\\' && p+1<e) { out[o++]=s[p]; out[o++]=s[p+1]; p+=2; continue; }
        out[o++]=s[p];
        if (s[p]=='\'') { p++; break; }
        p++;
      }
      continue;
    }
    if (c=='/' && p+1<e && s[p+1]=='/') {//line comment -> rest verbatim
      while (p<e)
        out[o++]=s[p++];
      break;
    }
    if (c=='/' && p+1<e && s[p+1]=='*') {//block comment
      out[o++]=s[p]; out[o++]=s[p+1]; p+=2;
      while (p<e) {
        if (s[p]=='*' && p+1<e && s[p+1]=='/') { out[o++]=s[p]; out[o++]=s[p+1]; p+=2; break; }
        out[o++]=s[p++];
      }
      if (p>=e && !(o>=2 && out[o-1]=='/' && out[o-2]=='*'))
        g_bc=TRUE;                       //comment runs onto the next line
      continue;
    }
    if (IsAlpha(c)) {                    //identifier / keyword
      I64 ts=p, q, ie;
      while (p<e && IsIdent(s[p])) p++;
      ie=p;
      for (q=ts; q<ie; q++)
        out[o++]=s[q];
      g_lastcode=s[ie-1];
      if (TokIs(s,ts,ie,"switch")) g_pend_sw=TRUE;
      if (IsCtlKw(s,ts,ie)) {            //if/while/for/switch -> exactly one space, then '('
        I64 r=p;
        while (r<e && IsWhite(s[r])) r++;
        if (r<e && s[r]=='(') { out[o++]=' '; p=r; }
      }
      continue;
    }
    if (c==',') {                        //no space after comma
      out[o++]=',';
      g_lastcode=',';
      p++;
      while (p<e && IsWhite(s[p])) p++;
      continue;
    }
    if (c=='{') {
      if (o>0 && out[o-1]!=' ') {        //space before a block '{' (not before an initializer)
        I64 sp=FALSE;
        if (out[o-1]==')') {
          sp=TRUE;
        } else if (IsIdent(out[o-1])) {
          I64 w=o;
          while (w>0 && IsIdent(out[w-1])) w--;
          if (TokIs(out,w,o,"else") || TokIs(out,w,o,"do")) sp=TRUE;
        }
        if (sp) out[o++]=' ';
      }
      g_sw[g_depth]=g_pend_sw;
      if (g_pend_sw) g_swcnt++;
      g_pend_sw=FALSE;
      g_depth++;
      g_lastcode='{';
      out[o++]=c; p++;
      continue;
    }
    if (c=='}') {
      if (g_depth>0) {
        g_depth--;
        if (g_sw[g_depth]) g_swcnt--;
      }
      g_lastcode='}';
      out[o++]=c; p++;
      continue;
    }
    if (c=='(' || c=='[') { g_paren++; g_lastcode=c; out[o++]=c; p++; continue; }
    if (c==')' || c==']') { if (g_paren>0) g_paren--; g_lastcode=c; out[o++]=c; p++; continue; }
    if (!IsWhite(c)) g_lastcode=c;
    out[o++]=c; p++;
  }
  return o;
}

//==================== main entry: format a buffer ====================
U8 *HolyCFmtBuf(U8 *src)
{
  I64 slen=StrLen(src);
  U8 *out=MAlloc(slen*4+4096);
  I64 i=0, o=0, started=FALSE, pending_blank=FALSE;
  g_sw=MAlloc(8*1024);
  g_hstk=MAlloc(8*1024);
  g_depth=0; g_swcnt=0; g_paren=0; g_pend_sw=FALSE; g_bc=FALSE; g_hn=0;

  while (i<slen) {
    I64 ls=i, le, fs, fc, cont, lvl;
    while (i<slen && src[i]!='\n') i++;
    le=i;
    if (i<slen) i++;                          //consume '\n'
    while (le>ls && (src[le-1]==' ' || src[le-1]=='\t' || src[le-1]=='\r')) le--;

    if (g_bc) {                               //inside a multi-line block comment: copy verbatim
      I64 p=ls;
      g_bc=FALSE;
      while (p<le) {
        out[o++]=src[p];
        if (src[p]=='*' && p+1<le && src[p+1]=='/') { out[o++]=src[p+1]; p+=2; goto bc_rest; }
        p++;
      }
      g_bc=TRUE;                              //still no close -> continues again
bc_rest:
      while (p<le)
        out[o++]=src[p++];
      out[o++]='\n';
      started=TRUE;
      continue;
    }

    fs=ls;
    while (fs<le && IsWhite(src[fs])) fs++;
    if (fs==le) {                             //blank line -> collapse runs, drop leading
      if (started) pending_blank=TRUE;
      continue;
    }
    if (pending_blank) { out[o++]='\n'; pending_blank=FALSE; }

    fc=src[fs];
    cont=g_paren;                             //continuation indent from unclosed (/[
    if (fc=='#' || LineIsLabel(src,fs,le)) {
      lvl=0;
    } else {
      lvl=g_depth+g_swcnt+cont+g_hn;          //g_hn: pending braceless-body indents
      if (fc=='}') {
        lvl--;
        if (g_depth>0 && g_sw[g_depth-1]) lvl--;
      } else if (LineIsCase(src,fs,le)) {
        lvl--;
      }
    }
    o=EmitIndent(out,o,lvl);
    g_lastcode=0;
    o=EmitAndScan(out,o,src,fs,le);
    out[o++]='\n';
    started=TRUE;

    //a braceless control body ("if (x)" alone) indents the next statement once;
    //the indent is released when that statement finishes (a ';' or a closed block)
    if (g_lastcode==';' || g_lastcode=='}')
      while (g_hn>0 && g_hstk[g_hn-1]>=g_depth)
        g_hn--;
    if (BracelessHeader(src,fs,le))
      g_hstk[g_hn++]=g_depth;
  }
  out[o]=0;
  return out;
}

//Format src and write it to stdout via PutChars (used by tests and TempleOS).
U0 HolyCFmtPrint(U8 *src)
{
  U8 *r=HolyCFmtBuf(src);
  I64 i=0;
  while (r[i]) {
    PutChars(r[i]);
    i++;
  }
  Free(r);
}
