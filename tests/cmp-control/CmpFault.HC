CCmpCtrl *cmp_fault_cc=NULL;
I64 cmp_fault_child_error=0;

U0 CmpFaultInit()
{
  cmp_fault_cc=CmpCtrlNew("borrowed",CCF_DONT_FREE_BUF);
  cmp_fault_cc->cur_buf_ptr=cmp_fault_cc->lex_include_stk->buf+2;
  cmp_fault_cc->last_U16=0x125;
  cmp_fault_cc->flags|=CCF_USE_LAST_U16;
}

I64 CmpNewTrial()
{
  U8 *buf=NULL;
  CCmpCtrl *cc=NULL;
  I64 error=0;
  try {
    buf=StrNew("caller-owned-until-success");
    cc=CmpCtrlNew(buf,0,"C:/Tmp.HC");
    buf=NULL;
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (buf && StrCmp(buf,"caller-owned-until-success")) throw('CmpBuf');
  Free(buf);
  if (cc) CmpCtrlDel(cc);
  return error;
}

I64 CmpBorrowTrial()
{
  CCmpCtrl *cc=NULL;
  I64 error=0;
  try cc=CmpCtrlNew("borrowed",CCF_DONT_FREE_BUF);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (cc) CmpCtrlDel(cc);
  return error;
}

I64 CmpPushTrial()
{
  I64 error=0,flags=cmp_fault_cc->flags,last=cmp_fault_cc->last_U16;
  CLexFile *tmpf=cmp_fault_cc->lex_include_stk,saved;
  U8 *ptr=cmp_fault_cc->cur_buf_ptr;
  MemCpy(&saved,tmpf,sizeof(CLexFile));
  try LexPush(cmp_fault_cc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error) {
    if (MemCmp(&saved,tmpf,sizeof(CLexFile)) ||
	cmp_fault_cc->cur_buf_ptr!=ptr || cmp_fault_cc->last_U16!=last ||
	cmp_fault_cc->flags!=flags || cmp_fault_cc->lex_prs_stk)
      throw('CmpState');
  } else {
    LexPopNoRestore(cmp_fault_cc);
    MemCpy(tmpf,&saved,sizeof(CLexFile));
    cmp_fault_cc->flags=flags;
    cmp_fault_cc->last_U16=last;
  }
  return error;
}

I64 CmpFileTrial()
{
  CLexFile *tmpf=NULL,*outer=cmp_fault_cc->lex_include_stk;
  I64 error=0;
  try tmpf=LexFilePush(cmp_fault_cc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (tmpf) LexFilePop(cmp_fault_cc);
  if (cmp_fault_cc->lex_include_stk!=outer) throw('CmpStack');
  return error;
}

U0 CmpFaultChild(U8 *)
{
  CCmpCtrl *cc=NULL;
  try {
    cc=CmpCtrlNew("borrowed",CCF_DONT_FREE_BUF,"C:/Tmp.HC");
    LexPush(cc);
  } catch {
    cmp_fault_child_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (cc) CmpCtrlDel(cc);
}

I64 CmpTaskTrial()
{
  CTask *child;
  cmp_fault_child_error=0;
  try {
    child=Spawn(&CmpFaultChild,,,,Fs);
    while (TaskValidate(child)) Yield;
  } catch {
    cmp_fault_child_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return cmp_fault_child_error;
}

I64 CmpModeTrial(I64 mode)
{
  CLexFile *tmpf=cmp_fault_cc->lex_include_stk;
  I64 error=0;
  if (mode) tmpf->flags=LFSF_DOC;
  try {
    switch (mode) {
      case 0:
	CmpCtrlNew("borrowed",CCF_PMT|CCF_DONT_FREE_BUF);
	break;
      case 1:
	LexFilePop(cmp_fault_cc);
	break;
      case 2:
	CmpCtrlDel(cmp_fault_cc);
	break;
      case 3:
	CmpCtrlSize(cmp_fault_cc);
	break;
    }
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (cmp_fault_cc->lex_include_stk!=tmpf ||
	StrCmp(tmpf->buf,"borrowed"))
    throw('CmpState');
  tmpf->flags=0;
  return error;
}

U0 CmpFaultDone()
{
  CmpCtrlDel(cmp_fault_cc);
  cmp_fault_cc=NULL;
}

CmpFaultInit;
