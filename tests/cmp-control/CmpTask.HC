U8 *cmp_task_buf=NULL;
I64 cmp_task_result=0;

U0 CmpTaskChild(U8 *)
{
  CCmpCtrl *cc=CmpCtrlNew(cmp_task_buf,CCF_DONT_FREE_BUF);
  CLexFile *tmpf;
  if (cc->htc.hash_table_lst!=Fs->hash_table ||
	cc->htc.hash_table_lst==Fs->parent_task->hash_table)
    throw('CmpTask');
  LexPush(cc);
  tmpf=LexFilePush(cc);
  tmpf->buf=StrNew("child-owned");
  tmpf->full_name=StrNew("child.HC");
  cc->cur_str=StrNew("token");
  CmpCtrlDel(cc);
  cc=CmpCtrlNew(StrNew("exit-owned"));
  LexPush(cc);
  cmp_task_result=29;
}

U0 CmpTask()
{
  I64 i;
  CTask *child;
  CCmpCtrl *parent;
  cmp_task_buf=StrNew("parent-owned");
  cmp_task_result=0;
  parent=CmpCtrlNew(cmp_task_buf,CCF_DONT_FREE_BUF);
  for (i=0;i<4;i++) {
    child=Spawn(&CmpTaskChild,,,,Fs);
    while (TaskValidate(child)) Yield;
    if (cmp_task_result!=29 || StrCmp(cmp_task_buf,"parent-owned") ||
	parent->htc.hash_table_lst!=Fs->hash_table)
      throw('CmpTask');
  }
  CmpCtrlDel(parent);
  Free(cmp_task_buf);
  cmp_task_buf=NULL;
  "CmpTask:%d\n",cmp_task_result;
}

CmpTask;
