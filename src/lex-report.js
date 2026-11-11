//Native token reporting and finite byte-line output; no diagnostic controller.
export const LEX_REPORT_SRC=String.raw`
U32 char_bmp_displayable[16]=
  {0x80000000,0xFFFFFFFF,0xFFFFFFFF,0x7FFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0};

U0 LexPutToken(CCmpCtrl *cc)
{//Print cur token to StdOut. (Crude)
  '"';
  if (cc->token==TK_IDENT || cc->token==TK_STR)
    "%s",cc->cur_str;
  else if (cc->token==TK_I64)
    "INT:%X",cc->cur_i64;
  else if (cc->token==TK_CHAR_CONST)
    "U8:%X",cc->cur_i64;
  else if (cc->token==TK_F64)
    "FLOAT:%e",cc->cur_f64;
  else if (cc->token=='\n')
    "<NEW_LINE>";
  else if (Bt(char_bmp_displayable,cc->token))
    '' cc->token;
  else {
    "T:%X",cc->token;
  }
  "\" ";
}

U0 LexPutLine(CCmpCtrl *cc,U8 *start)
{//Print cur pos to end of a byte-buffer line to StdOut.
  I64 ch;
  U8 *ptr;
  if (!start) return;
  if (!cc->lex_include_stk) throw('LexState');
  if (cc->lex_include_stk->flags&LFSF_DOC) throw('LexMode');
  ptr=start;
  while (ch=*ptr++) {
    if (ch=='\n' || ch=='\r') break;
    '' ch;
  }
  '\n';
}
`;
