import U0 ExtFaultMark(I64 phase);

I64 ExtReject(I64 mode)
{
  CCmpCtrl *cc=CmpCtrlNew("\"first\" \"second\"",CCF_DONT_FREE_BUF),copy;
  CLexFile *tmpf=cc->lex_include_stk,file;
  U8 *result=NULL,*except=Fs->next_except;
  I64 size=-7,error=0,flags=cc->flags,file_flags=tmpf->flags;
  cc->htc.hash_table_lst=NULL;
  Lex(cc);
  if (!mode) cc->flags|=CCF_PMT;
  if (mode==1) tmpf->flags|=LFSF_DOC;
  if (mode==2) cc->lex_include_stk=NULL;
  MemCpy(&copy,cc,sizeof(CCmpCtrl));
  MemCpy(&file,tmpf,sizeof(CLexFile));
  ExtFaultMark(0);
  try result=LexExtStr(cc,&size);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  ExtFaultMark(1);
  if (!error || size!=-7 || result || Fs->next_except!=except ||
	MemCmp(&copy,cc,sizeof(CCmpCtrl)) ||
	MemCmp(&file,tmpf,sizeof(CLexFile))) throw('Reject');
  cc->lex_include_stk=tmpf;
  cc->flags=flags;tmpf->flags=file_flags;
  CmpCtrlDel(cc);
  return error;
}
