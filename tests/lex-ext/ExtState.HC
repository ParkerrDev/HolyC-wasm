U64 ext_hash=0;
I64 ext_cases=0;

U0 ExtMix(I64 value)
{
  ext_hash=(ext_hash^value)*1099511628211;
}

U0 ExtBytes(U8 *st,I64 size)
{
  I64 i;
  ExtMix(size);
  ExtMix(ToBool(st));
  if (st)
    for (i=0;i<size;i++) ExtMix(st[i]);
}

U0 ExtState(CCmpCtrl *cc,I64 lines)
{
  CLexFile *tmpf;
  ExtMix(cc->token);
  ExtMix(cc->flags);
  ExtMix(cc->cur_i64);
  ExtMix(cc->last_U16);
  ExtMix(cc->last_line_num);
  ExtMix(cmp.compiled_lines-lines);
  ExtMix(cc->error_cnt);
  ExtMix(cc->warning_cnt);
  ExtBytes(cc->cur_str,cc->cur_str_len);
  tmpf=cc->lex_include_stk;
  if (tmpf && tmpf->buf) {
    ExtMix(cc->cur_buf_ptr-tmpf->buf);
    ExtMix(tmpf->line_start-tmpf->buf);
  }
  for (;tmpf;tmpf=tmpf->next) {
    ExtMix(tmpf->flags);
    ExtMix(tmpf->line_num);
    ExtMix(tmpf->depth);
    ExtMix(tmpf->last_U16);
  }
  ExtMix(-1);
}

U0 ExtRun(U8 *src,Bool lex_next,Bool size_out,I64 flags,
	CHashTable *table=NULL)
{
  CCmpCtrl *cc=CmpCtrlNew(src,flags|CCF_DONT_FREE_BUF,"C:/Ext.HC");
  U8 *st;
  I64 size=-7,lines=cmp.compiled_lines;
  cc->htc.hash_table_lst=table;
  Lex(cc);
  ExtState(cc,lines);
  if (size_out) st=LexExtStr(cc,&size,lex_next);
  else st=LexExtStr(cc,,lex_next);
  ExtMix(size);
  if (size_out) ExtBytes(st,size);
  else ExtBytes(st,StrLen(st)+1);
  ExtState(cc,lines);
  Free(st);
  Lex(cc);
  ExtState(cc,lines);
  CmpCtrlDel(cc);
  ext_cases++;
}
