CTask *ext_echo_task=NULL;

Bool ExtThrowKey(I64,I64)
{
  if (Fs==ext_echo_task) throw('LexEcho');
  return FALSE;
}

Bool ExtThrowStr(U8 *)
{
  if (Fs==ext_echo_task) throw('LexEcho');
  return FALSE;
}

U0 ExtLeak()
{
  CCmpCtrl *cc=CmpCtrlNew("\"first\" \"second\"",CCF_DONT_FREE_BUF);
  CKeyDevEntry *entry;
  CKeyDevGlbls saved;
  U8 *first,*result=NULL,*except=Fs->next_except;
  I64 before,span,delta,error=0,size=-7;
  cc->htc.hash_table_lst=NULL;
  if (Lex(cc)!=TK_STR) throw('LeakPre');
  first=cc->cur_str;span=MSize2(first);
  MemCpy(&saved,&keydev,sizeof(CKeyDevGlbls));
  MemSet(&keydev,0,sizeof(CKeyDevGlbls));
  QueInit(&keydev.put_key_head);
  entry=KeyDevAdd(&ExtThrowKey,&ExtThrowStr,10,FALSE);
  ext_echo_task=Fs;
  before=Fs->data_heap->used_u8s;
  cc->opts|=OPTF_ECHO;
  try result=LexExtStr(cc,&size);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  ext_echo_task=NULL;
  if (error!='LexEcho' || size!=-7 || result || cc->cur_str ||
	Fs->next_except!=except) throw('LeakErr');
  delta=Fs->data_heap->used_u8s-before;
  if (delta && delta!=-span) throw('LeakHeap');
  if (!delta) Free(first);
  KeyDevRem(entry);
  MemCpy(&keydev,&saved,sizeof(CKeyDevGlbls));
  CmpCtrlDel(cc);
  "ExtDetached:%d\n",!delta;
}

Raw(OFF);
ExtLeak;
