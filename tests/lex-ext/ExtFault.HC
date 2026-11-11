CCmpCtrl *ext_fault_cc=NULL;
CHashTable *ext_fault_table=NULL;
CKeyDevEntry *ext_fault_entry=NULL;
I64 ext_fault_calls=0,ext_fault_fail_at=0,ext_fault_mode=0,
	ext_fault_error=0;
Bool ext_fault_done=FALSE;
U8 ext_fault_text[1024];
import U0 ExtFaultMark(I64 phase);

Bool ExtFaultKey(I64,I64)
{
  if (++ext_fault_calls==ext_fault_fail_at) throw('LexEcho');
  return TRUE;
}

Bool ExtFaultStr(U8 *st)
{
  while (*st) ExtFaultKey(*st++,0);
  return TRUE;
}

U0 ExtFaultSetup()
{
  CHashDefineStr *tmpd;
  I64 i;
  Raw(OFF);
  ext_fault_table=HashTableNew(16);
  tmpd=CAlloc(sizeof(CHashDefineStr));
  tmpd->str=StrNew("VALUE");
  tmpd->data=StrNew("\"second\" \"third\"");
  tmpd->type=HTT_DEFINE_STR;
  HashAdd(tmpd,ext_fault_table);
  StrCpy(ext_fault_text,"\"first\" \"");
  for (i=0;i<576;i++) ext_fault_text[9+i]='A'+i%26;
  StrCpy(ext_fault_text+585,"\" \"tail\" END");
  ext_fault_entry=KeyDevAdd(&ExtFaultKey,&ExtFaultStr,10,FALSE);
}

U0 ExtFaultBody()
{
  U8 *src="\"first\" \"second\" \"third\" END",*st=NULL,
	*except=Fs->next_except;
  I64 size=-7,error=0;
  if (ext_fault_mode==1) src=ext_fault_text;
  if (ext_fault_mode==2) src="\"first\" VALUE \"tail\" END";
  if (ext_fault_mode==3) src="\"first\"\\\"second\"\\\"third\" END";
  if (ext_fault_mode==4) src="\"first\" '123456789'";
  if (ext_fault_mode==5) src="\"first\" #define X 1";
  ext_fault_cc=CmpCtrlNew(src,CCF_DONT_FREE_BUF,"C:/Fault.HC");
  ext_fault_cc->htc.hash_table_lst=ext_fault_table;
  if (Lex(ext_fault_cc)!=TK_STR) throw('FaultPre');
  ext_fault_calls=0;
  if (ext_fault_fail_at) ext_fault_cc->opts|=OPTF_ECHO;
  ExtFaultMark(0);
  try st=LexExtStr(ext_fault_cc,&size,ext_fault_mode!=3);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  ExtFaultMark(1);
  if (Fs->next_except!=except || error && size!=-7) throw('FaultEnd');
  Free(st);
  CmpCtrlDel(ext_fault_cc);
  ext_fault_cc=NULL;
  ext_fault_error=error;
}

U0 ExtFaultTask(U8 *)
{
  ExtFaultBody;
  ext_fault_done=TRUE;
  while (TRUE) Yield;
}

I64 ExtFaultCase(I64 mode,I64 fail_echo,Bool child)
{
  CTask *task;
  ext_fault_mode=mode;
  ext_fault_fail_at=fail_echo;
  ext_fault_error=0;
  if (child) {
    ext_fault_done=FALSE;
    task=Spawn(&ExtFaultTask,NULL,"Extract");
    while (!ext_fault_done) Yield;
    Kill(task);
  } else
    ExtFaultBody;
  return ext_fault_error;
}

I64 ExtFaultCalls()
{
  return ext_fault_calls;
}

U0 ExtFaultDone()
{
  KeyDevRem(ext_fault_entry);
  ext_fault_entry=NULL;
  HashTableDel(ext_fault_table);
  ext_fault_table=NULL;
}
