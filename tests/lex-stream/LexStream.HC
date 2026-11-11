U64 lex_stream_hash=0;
I64 lex_stream_cnt=0,lex_stream_base=0;

U0 LexStreamMix(I64 value)
{
  lex_stream_hash=(lex_stream_hash^value)*1099511628211;
  lex_stream_cnt++;
}

I64 LexStreamChar(CCmpCtrl *cc)
{
  I64 ch=LexGetChar(cc);
  CLexFile *tmpf=cc->lex_include_stk;
  LexStreamMix(ch);
  LexStreamMix(cc->last_U16);
  LexStreamMix(cc->flags);
  LexStreamMix(cc->cur_buf_ptr-tmpf->buf);
  LexStreamMix(tmpf->line_start-tmpf->buf);
  LexStreamMix(tmpf->line_num);
  LexStreamMix(tmpf->depth);
  LexStreamMix(tmpf->last_U16);
  LexStreamMix(cmp.compiled_lines-lex_stream_base);
  return ch;
}

U0 LexStream()
{
  I64 i,j,ch,flags;
  U8 *buf;
  CCmpCtrl *cc;
  lex_stream_hash=14695981039346656037;
  lex_stream_cnt=0;
  lex_stream_base=cmp.compiled_lines;
  LexStreamMix(sizeof(CCmpGlbls));
  LexStreamMix(sizeof(CIntermediateCode));
  LexStreamMix(sizeof(CICArg));
  LexStreamMix(offset(CCmpGlbls.compiled_lines));
  for (i=0;i<512;i++) {
    LexStreamMix(Bt(char_bmp_printable,i));
    LexStreamMix(Bt(char_bmp_non_eol,i));
  }
  for (i=0;i<16;i++) {
    buf=CAlloc(256);
    for (j=0;j<255;j++) buf[j]=j+1;
    flags=0;
    if (i&1) flags|=CCF_DONT_FREE_BUF;
    if (i&2) flags|=CCF_KEEP_NEW_LINES;
    if (i&4) flags|=CCF_KEEP_AT_SIGN;
    if (i&8) flags|=CCF_NO_DEFINES;
    cc=CmpCtrlNew(buf,flags);
    j=0;
    do {
      ch=LexStreamChar(cc);
      if (j++%7==3) {
	cc->flags|=CCF_USE_LAST_U16;
	LexStreamMix(LexStreamChar(cc)==ch);
      }
      if (j>256) throw('LexLoop');
    } while (ch);
    LexStreamChar(cc);
    LexStreamChar(cc);
    CmpCtrlDel(cc);
    if (flags&CCF_DONT_FREE_BUF) Free(buf);
  }
  for (i=0;i<512;i++) {
    cc=CmpCtrlNew("a\nb",CCF_DONT_FREE_BUF);
    LexStreamChar(cc);
    if (i&1) cc->flags|=CCF_USE_LAST_U16;
    cc->last_U16=i;
    LexIncludeStr(cc,"C:/Nested.HC",StrNew("c\n\x05d"),i&2);
    if (i&2)
      LexStreamMix(!StrCmp(cc->lex_include_stk->full_name,"C:/Nested.HC"));
    else
      LexStreamMix(!StrCmp(cc->lex_include_stk->full_name,blkdev.tmp_filename));
    LexStreamChar(cc);
    LexIncludeStr(cc,NULL,StrNew("e\nf"),FALSE);
    LexPush(cc);
    LexStreamChar(cc);
    LexStreamChar(cc);
    LexPopRestore(cc);
    j=0;
    while (LexStreamChar(cc))
      if (j++>16) throw('LexLoop');
    CmpCtrlDel(cc);
  }
  cc=CmpCtrlNew(NULL);
  LexStreamChar(cc);
  LexStreamChar(cc);
  CmpCtrlDel(cc);
  cc=CmpCtrlNew("a\rb\nc",CCF_DONT_FREE_BUF);
  LexSkipEol(cc);
  LexStreamChar(cc);
  LexSkipEol(cc);
  LexStreamChar(cc);
  LexSkipEol(cc);
  LexStreamChar(cc);
  CmpCtrlDel(cc);
  "LexStream:%016X:%d\n",lex_stream_hash,lex_stream_cnt;
  cc=CmpCtrlNew("A\tB\n\x05C\x1FD",CCF_DONT_FREE_BUF);
  cc->opts|=OPTF_ECHO;
  while (LexGetChar(cc));
  CmpCtrlDel(cc);
  '\n';
}

LexStream;
