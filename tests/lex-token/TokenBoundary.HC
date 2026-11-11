CCmpCtrl *token_bound_cc=NULL;

U0 TokenBoundaryNew()
{
  token_bound_cc=CmpCtrlNew("before #include \"Absent.HC\"",
	CCF_DONT_FREE_BUF,"C:/Boundary.HC");
  token_bound_cc->htc.hash_table_lst=NULL;
  if (Lex(token_bound_cc)!=TK_IDENT) throw('BoundPre');
}

I64 TokenBoundary(I64 mode)
{
  CCmpCtrl saved;
  CLexFile *tmpf=token_bound_cc->lex_include_stk,file;
  I64 error=0,lines=cmp.compiled_lines;
  if (mode==1) token_bound_cc->flags|=CCF_PMT;
  if (mode==2) tmpf->flags|=LFSF_DOC;
  if (mode==3) token_bound_cc->lex_include_stk=NULL;
  MemCpy(&saved,token_bound_cc,sizeof(CCmpCtrl));
  MemCpy(&file,tmpf,sizeof(CLexFile));
  try {
    if (mode==4) Lex(NULL);
    else Lex(token_bound_cc);
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (mode) {
    if (MemCmp(&saved,token_bound_cc,sizeof(CCmpCtrl)) ||
	MemCmp(&file,tmpf,sizeof(CLexFile)) || cmp.compiled_lines!=lines)
      throw('BoundMod');
  } else if (token_bound_cc->cur_buf_ptr!=tmpf->buf+8 ||
	token_bound_cc->token!=TK_IDENT || token_bound_cc->error_cnt ||
	StrCmp(token_bound_cc->cur_str,"before")) throw('BoundPos');
  token_bound_cc->lex_include_stk=tmpf;
  token_bound_cc->flags&=~CCF_PMT;
  tmpf->flags&=~LFSF_DOC;
  return error;
}

U0 TokenBoundaryDel()
{
  CmpCtrlDel(token_bound_cc);
  token_bound_cc=NULL;
}
