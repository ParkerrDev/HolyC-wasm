CTask *token_error_task=NULL;
I64 token_errors[3][7],token_error_cnt=0;

Bool TokenErrorKey(I64,I64)
{
  return Fs==token_error_task;
}

Bool TokenErrorStr(U8 *)
{
  return Fs==token_error_task;
}

U0 TokenBad(U8 *src)
{
  CCmpCtrl *cc=CmpCtrlNew(src,CCF_DONT_FREE_BUF,"C:/Malformed.HC");
  I64 error=0,*row=token_errors[token_error_cnt++];
  cc->htc.hash_table_lst=NULL;
  if (Lex(cc)!=TK_IDENT || StrCmp(cc->cur_str,"ok")) throw('BadFirst');
  try Lex(cc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error!='Compiler' || cc->error_cnt!=1 ||
	StrCmp(cc->cur_str,"ok")) throw('BadError');
  row[0]=error;
  row[1]=cc->lex_include_stk->line_num;
  row[2]=cc->cur_buf_ptr-cc->lex_include_stk->line_start;
  row[3]=cc->cur_buf_ptr-cc->lex_include_stk->buf;
  row[4]=cc->token;
  row[5]=cc->last_line_num;
  row[6]=cc->error_cnt;
  CmpCtrlDel(cc);
}

U0 LexMalformed()
{
  I64 i,error=0,*row;
  Bool old_raw=Raw(ON);
  U8 buf[256];
  CKeyDevGlbls saved;
  token_error_task=Fs;
  token_error_cnt=0;
  MemCpy(&saved,&keydev,sizeof(CKeyDevGlbls));
  MemSet(&keydev,0,sizeof(CKeyDevGlbls));
  QueInit(&keydev.put_key_head);
  try {
    KeyDevAdd(&TokenErrorKey,&TokenErrorStr,10,FALSE);
    StrCpy(buf,"ok\n");
    for (i=0;i<144;i++) buf[3+i]='A';
    buf[147]=0;
    TokenBad(buf);
    TokenBad("ok\n'123456789' ");
    TokenBad("ok\n'\\n\\n\\n\\n\\n\\n\\n\\n\\n' ");
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  while (keydev.put_key_head.next!=&keydev.put_key_head)
    KeyDevRem(keydev.put_key_head.next);
  MemCpy(&keydev,&saved,sizeof(CKeyDevGlbls));
  Raw(old_raw);
  token_error_task=NULL;
  if (error) throw(error);
  for (i=0;i<token_error_cnt;i++) {
    row=token_errors[i];
    "Malformed:%C:%d:%d:%d:%d:%d:%d\n",row[0],row[1],row[2],row[3],
	  row[4],row[5],row[6];
  }
}

LexMalformed;
