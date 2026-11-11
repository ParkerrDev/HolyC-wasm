I64 lex_task_result=0;

U0 LexTaskChild(U8 *)
{
  I64 ch,cnt=0;
  CCmpCtrl *cc=CmpCtrlNew(StrNew("one\ntwo\n"));
  while (ch=LexGetChar(cc)) {
    cnt++;
    if (ch=='\n') Yield;
  }
  if (cnt!=8 || cc->lex_include_stk->line_num!=3) throw('LexTask');
  lex_task_result++;
}

U0 LexTask()
{
  I64 i,lines=cmp.compiled_lines;
  CTask *child;
  CCmpCtrl *cc=CmpCtrlNew("parent",CCF_DONT_FREE_BUF);
  lex_task_result=0;
  for (i=0;i<4;i++) {
    child=Spawn(&LexTaskChild,,,,Fs);
    while (TaskValidate(child)) Yield;
    if (cc->cur_buf_ptr!=cc->lex_include_stk->buf ||
	cc->lex_include_stk->line_num!=1)
      throw('LexTask');
  }
  if (lex_task_result!=4 || cmp.compiled_lines-lines!=8)
    throw('LexTask');
  CmpCtrlDel(cc);
  "LexTask:%d:%d\n",lex_task_result,cmp.compiled_lines-lines;
}

LexTask;
