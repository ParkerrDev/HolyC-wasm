I64 qv_child_error=0;
CQueVectU8 *qv_fault_parent=NULL;

U0 QvFaultTaskInit()
{
  qv_fault_parent=QueVectU8New;
  QueVectU8Put(qv_fault_parent,1300,91);
}

U0 QvFaultChild(U8 *)
{
  CQueVectU8 *v;
  CCmpCtrl *cc;
  U8 *res;
  try {
    v=QueVectU8New;
    QueVectU8Put(v,1300,77);
    cc=CmpCtrlNew(StrNew("alpha|omega"));
    res=LexFirstRem(cc,"|");
    if (StrCmp(res,"alpha") || QueVectU8Get(qv_fault_parent,1300)!=91)
      throw('QvTask');
  } catch {
    qv_child_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
}

I64 QvTaskTrial()
{
  CTask *child;
  qv_child_error=0;
  try {
    child=Spawn(&QvFaultChild,,,,Fs);
    while (TaskValidate(child)) Yield;
  } catch {
    qv_child_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (qv_fault_parent->total_cnt!=1301 ||
	QueVectU8Get(qv_fault_parent,1300)!=91)
    throw('QvParent');
  return qv_child_error;
}

U0 QvFaultTaskDone()
{
  QueVectU8Del(qv_fault_parent);qv_fault_parent=NULL;
}

QvFaultTaskInit;
