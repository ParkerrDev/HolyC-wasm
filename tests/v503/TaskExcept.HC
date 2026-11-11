I64 task_progress=0;

U0 ExceptChild(U8 *)
{
  while (TRUE) {
    try {
      Sleep(1);
      throw('Child');
    } catch {
      task_progress++;
      Fs->catch_except=TRUE;
    }
  }
}

U0 ExceptLeaf()
{
  I64 data[32];
  MemSet(data,0xA5,sizeof(data));
  Sleep(2);
  if (data[31]!=0xA5A5A5A5A5A5A5A5) throw('Stack');
  throw('Parent');
}

U0 ExceptWrap()
{
  try
    ExceptLeaf;
  catch {
    while (!task_progress) Yield;
    Sleep(3);
  }
}

U0 TaskExcept()
{
  CTask *child;
  I64 res=0;
  task_progress=0;
  child=Spawn(&ExceptChild,,,,Fs);
  try
    ExceptWrap;
  catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  Kill(child);
  "%c %d\n",res,task_progress>0;
}

TaskExcept;
