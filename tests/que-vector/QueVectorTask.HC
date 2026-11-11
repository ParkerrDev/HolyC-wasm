CQueVectU8 *qv_parent=NULL;
I64 qv_task_result=0;

U0 QueVectorChild(U8 *)
{
  I64 len;
  CQueVectU8 *v=QueVectU8New(-1);
  CCmpCtrl *cc=CmpCtrlNew(StrNew("alpha|omega"));
  U8 *res=LexFirstRem(cc,"|",&len);
  QueVectU8Put(v,1200,77);
  if (len!=5 || StrCmp(res,"alpha") || LexGetChar(cc)!='|' ||
	QueVectU8Get(v,1200)!=77 || QueVectU8Get(qv_parent,1300)!=91)
    throw('QvTask');
  qv_task_result++;
}

U0 QueVectorTask()
{
  I64 i;
  CTask *child;
  qv_task_result=0;
  qv_parent=QueVectU8New;
  QueVectU8Put(qv_parent,1300,91);
  for (i=0;i<4;i++) {
    child=Spawn(&QueVectorChild,,,,Fs);
    while (TaskValidate(child)) Yield;
    if (qv_parent->total_cnt!=1301 || QueVectU8Get(qv_parent,1300)!=91)
      throw('QvParent');
  }
  QueVectU8Del(qv_parent);qv_parent=NULL;
  "QueVectorTask:%d\n",qv_task_result;
}

QueVectorTask;
