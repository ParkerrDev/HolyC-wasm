CCmpCtrl *token_fault_cc=NULL;
CHashTable *token_fault_table=NULL;
CKeyDevEntry *token_fault_entry=NULL;
I64 token_fault_calls=0,token_fault_fail_at=0;
U8 token_fault_text[1024],*token_fault_old=NULL;

Bool TokenFaultKey(I64,I64)
{
  if (++token_fault_calls==token_fault_fail_at) throw('LexEcho');
  return TRUE;
}

Bool TokenFaultStr(U8 *st)
{
  while (*st) TokenFaultKey(*st++,0);
  return TRUE;
}

U0 TokenFaultSetup()
{
  CHashDefineStr *tmpd;
  I64 i;
  Raw(OFF);
  token_fault_table=HashTableNew(16);
  tmpd=CAlloc(sizeof(CHashDefineStr));
  tmpd->str=StrNew("VALUE");
  tmpd->data=StrNew("expanded_value");
  tmpd->type=HTT_DEFINE_STR;
  HashAdd(tmpd,token_fault_table);
  StrCpy(token_fault_text,"before \"");
  for (i=0;i<576;i++) token_fault_text[8+i]='A'+i%26;
  token_fault_text[584]='\"';
  token_fault_text[585]=' ';
  token_fault_text[586]=0;
  token_fault_entry=KeyDevAdd(&TokenFaultKey,&TokenFaultStr,10,FALSE);
}

U0 TokenFaultNew(I64 mode,I64 fail_at=0)
{
  U8 *src="before after ";
  if (mode==1) src=token_fault_text;
  if (mode==2) src="before VALUE ";
  token_fault_cc=CmpCtrlNew(src,CCF_DONT_FREE_BUF,"C:/Fault.HC");
  token_fault_cc->htc.hash_table_lst=token_fault_table;
  if (Lex(token_fault_cc)!=TK_IDENT ||
	StrCmp(token_fault_cc->cur_str,"before")) throw('FaultPre');
  token_fault_old=token_fault_cc->cur_str;
  token_fault_calls=0;
  token_fault_fail_at=fail_at;
  if (fail_at) token_fault_cc->opts|=OPTF_ECHO;
}

I64 TokenFaultRun()
{
  I64 error=0;
  try Lex(token_fault_cc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error=='OutMem' &&
	(token_fault_cc->cur_str!=token_fault_old ||
	StrCmp(token_fault_cc->cur_str,"before"))) throw('FaultOld');
  return error;
}

I64 TokenFaultCalls()
{
  return token_fault_calls;
}

U0 TokenFaultDel()
{
  CmpCtrlDel(token_fault_cc);
  token_fault_cc=NULL;
  token_fault_old=NULL;
}

U0 TokenFaultDone()
{
  TokenFaultDel;
  KeyDevRem(token_fault_entry);
  token_fault_entry=NULL;
  HashTableDel(token_fault_table);
  token_fault_table=NULL;
}
