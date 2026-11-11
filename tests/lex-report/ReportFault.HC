I64 report_calls=0,report_fail_at=0;
CKeyDevEntry *report_entry=NULL;

Bool ReportFaultKey(I64,I64)
{
  if (++report_calls==report_fail_at) throw('Report');
  return TRUE;
}

Bool ReportFaultStr(U8 *st)
{
  while (*st) ReportFaultKey(*st++,0);
  return TRUE;
}

U0 ReportSetup()
{
  Raw(OFF);
  report_entry=KeyDevAdd(&ReportFaultKey,&ReportFaultStr,1,FALSE);
}

U0 ReportDone()
{
  KeyDevRem(report_entry);
  report_entry=NULL;
}

I64 ReportCalls()
{
  return report_calls;
}

I64 ReportTrial(I64 mode,I64 fail_at=0)
{
  I64 res=0;
  CCmpCtrl cc,saved;
  CLexFile file,old_file;
  MemSet(&cc,0,sizeof(CCmpCtrl));
  MemSet(&file,0,sizeof(CLexFile));
  cc.lex_include_stk=&file;
  cc.token=TK_STR;
  cc.cur_str="Report output";
  cc.cur_i64=I64_MIN;
  cc.cur_f64=-12.5;
  if (mode==0) cc.token=TK_F64;
  if (mode==1) cc.token=TK_I64;
  if (mode==4 || mode==6) file.flags=LFSF_DOC;
  if (mode==5) cc.lex_include_stk=NULL;
  MemCpy(&saved,&cc,sizeof(CCmpCtrl));
  MemCpy(&old_file,&file,sizeof(CLexFile));
  report_calls=0;
  report_fail_at=fail_at;
  try {
    if (mode<3)
      LexPutToken(&cc);
    else if (mode==6)
      LexPutLine(&cc,NULL);
    else
      LexPutLine(&cc,"First\r\nsecond");
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (MemCmp(&cc,&saved,sizeof(CCmpCtrl)) ||
	MemCmp(&file,&old_file,sizeof(CLexFile)))
    throw('RptState');
  return res;
}
