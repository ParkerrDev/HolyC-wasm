CCmpCtrl *lex_fault_cc=NULL;

U0 LexFaultInit()
{
  lex_fault_cc=CmpCtrlNew("parent",CCF_DONT_FREE_BUF);
  LexGetChar(lex_fault_cc);
  lex_fault_cc->flags|=CCF_USE_LAST_U16;
}

I64 LexIncludeTrial()
{
  U8 *buf=NULL,*ptr=lex_fault_cc->cur_buf_ptr;
  CLexFile *outer=lex_fault_cc->lex_include_stk,saved;
  I64 error=0,flags=lex_fault_cc->flags,last=lex_fault_cc->last_U16;
  MemCpy(&saved,outer,sizeof(CLexFile));
  try {
    buf=StrNew("nested");
    LexIncludeStr(lex_fault_cc,"C:/Nested.HC",buf,TRUE);
    buf=NULL;
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error) {
    if (buf && StrCmp(buf,"nested")) throw('LexBuf');
    if (lex_fault_cc->lex_include_stk!=outer ||
	lex_fault_cc->flags!=flags || lex_fault_cc->last_U16!=last ||
	lex_fault_cc->cur_buf_ptr!=ptr || MemCmp(&saved,outer,sizeof(CLexFile)))
      throw('LexState');
  } else {
    LexFilePop(lex_fault_cc);
    MemCpy(outer,&saved,sizeof(CLexFile));
    lex_fault_cc->flags=flags;
    lex_fault_cc->last_U16=last;
    lex_fault_cc->cur_buf_ptr=ptr;
  }
  Free(buf);
  return error;
}

U0 LexFaultDone()
{
  CmpCtrlDel(lex_fault_cc);
  lex_fault_cc=NULL;
}

LexFaultInit;
