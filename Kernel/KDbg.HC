//V5.03 Kernel/KDbg.HC's SysGetStr2, the GetStr of a task with no DolDoc
//editor. There is no debugger.
U8 *SysGetStr2(I64)
{
  U8 buf[512];
  GetS(buf,512,FALSE);
  return StrNew(buf);
}

U0 GetStrHostInit()
{//fp_getstr2 as KMain sets it. DolDoc's DocGetStr2 waits on its editor.
  fp_getstr2=&SysGetStr2;
}

I64 UnusedStk(CTask *task=NULL)
{//Count of usused bytes in task's stk.
  I64 res;
  if (!task) task=Fs;
  PUSHFD
  CLI
  if (task==Fs)
    res=GetRSP()(U8 *)-(&task->stk->stk_base)(U8 *);
  else
    res=task->rsp(U8 *)-(&task->stk->stk_base)(U8 *);
  POPFD
  return res;
}
