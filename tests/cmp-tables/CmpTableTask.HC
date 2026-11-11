I64 table_task_result=0;
U32 *table_task_ptr=NULL;

U0 TableChild(U8 *)
{
  if (cmp.dual_U16_tokens1!=table_task_ptr ||
	cmp.dual_U16_tokens1['+']!=0x105002B)
    throw('TblTask');
  cmp.dual_U16_tokens1[TK_INS_BIN_SIZE]++;
  table_task_result++;
}

U0 CmpTableTask()
{
  I64 i,old=cmp.dual_U16_tokens1[TK_INS_BIN_SIZE];
  CTask *child;
  table_task_result=0;
  table_task_ptr=cmp.dual_U16_tokens1;
  for (i=0;i<4;i++) {
    child=Spawn(&TableChild,,,,Fs);
    while (TaskValidate(child)) Yield;
    if (cmp.dual_U16_tokens1!=table_task_ptr ||
	cmp.dual_U16_tokens1[TK_INS_BIN_SIZE]!=old+i+1)
      throw('TblOwner');
  }
  cmp.dual_U16_tokens1[TK_INS_BIN_SIZE]=old;
  "CmpTableTask:%d\n",table_task_result;
}

CmpTableTask;
