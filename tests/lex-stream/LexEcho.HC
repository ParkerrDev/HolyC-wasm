I64 lex_echo_ch=0,lex_echo_cnt=0;
U64 lex_echo_hash=0;
CTask *lex_echo_task=NULL;

Bool LexEchoTrap(I64 ch,I64)
{
  if (Fs!=lex_echo_task) return FALSE;
  lex_echo_ch=ch;
  throw('LexEcho',TRUE);
  return FALSE;
}

Bool LexEchoCount(I64 ch,I64)
{
  if (Fs!=lex_echo_task) return FALSE;
  lex_echo_hash=(lex_echo_hash^ch)*1099511628211;
  lex_echo_cnt++;
  return TRUE;
}

U0 LexEcho()
{
  I64 i,error=0,code=0,lines=cmp.compiled_lines;
  U8 *buf=NULL;
  CCmpCtrl *cc=NULL;
  CKeyDevEntry *entry;
  CKeyDevGlbls saved;
  lex_echo_task=Fs;
  MemCpy(&saved,&keydev,sizeof(CKeyDevGlbls));
  MemSet(&keydev,0,sizeof(CKeyDevGlbls));
  QueInit(&keydev.put_key_head);
  try {
    cc=CmpCtrlNew("\nX",CCF_DONT_FREE_BUF);
    lex_echo_ch=0;
    cc->opts|=OPTF_ECHO;
    entry=KeyDevAdd(&LexEchoTrap,NULL,10,FALSE);
    try LexGetChar(cc);
    catch {
      error=Fs->except_ch;
      Fs->catch_except=TRUE;
    }
    KeyDevRem(entry);
    if (error!='LexEcho' || lex_echo_ch!='\n' ||
	  cc->lex_include_stk->line_num!=2 ||
	  cc->cur_buf_ptr!=cc->lex_include_stk->buf+1 ||
	  cmp.compiled_lines-lines!=1)
      throw('EchoStat');
    cc->opts&=~OPTF_ECHO;
    if (LexGetChar(cc)!='X' || LexGetChar(cc)) throw('EchoNext');
    CmpCtrlDel(cc);
    cc=NULL;
    buf=CAlloc(256);
    for (i=0;i<255;i++) buf[i]=i+1;
    cc=CmpCtrlNew(buf);
    buf=NULL;
    cc->opts|=OPTF_ECHO;
    lex_echo_cnt=0;
    lex_echo_hash=14695981039346656037;
    entry=KeyDevAdd(&LexEchoCount,NULL,10,FALSE);
    while (LexGetChar(cc));
    KeyDevRem(entry);
  } catch {
    code=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  while (keydev.put_key_head.next!=&keydev.put_key_head)
    KeyDevRem(keydev.put_key_head.next);
  MemCpy(&keydev,&saved,sizeof(CKeyDevGlbls));
  if (cc) CmpCtrlDel(cc);
  Free(buf);
  if (code) throw(code);
  "LexEcho:1:%016X:%d\n",lex_echo_hash,lex_echo_cnt;
}

LexEcho;
