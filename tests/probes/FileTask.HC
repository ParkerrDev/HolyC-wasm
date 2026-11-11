I64 file_task_sum=0,file_task_size=0;

U0 FileChild(U8 *)
{
  U8 *buf=MAlloc(777),*copy;
  I64 i,size;
  Silent;
  for (i=0;i<777;i++) buf[i]=i*17;
  FileWrite("../Data.BIN",buf,777,0xB2D3D12345678);
  MemSet(buf,0,777);
  Free(buf);
  copy=FileRead("../Data.BIN",&size);
  file_task_size=size;
  file_task_sum=0;
  for (i=0;i<size;i++) file_task_sum+=copy[i];
  //The task owns this read buffer and releases it when it exits.
}

U0 FileTask()
{
  U8 *old_dir=DirCur,*old_home=StrNew(blkdev.home_dir),*cur,*copy;
  I64 i,size,sum=0;
  CTask *task;
  Bool old_silent=Silent;
  Cd("B:/FileTask/Home",TRUE);
  HomeSet("B:/FileTask/Home");
  Cd("B:/FileTask/Parent",TRUE);
  task=Spawn(&FileChild,,,,Fs);
  while (TaskValidate(task)) Yield;
  copy=FileRead("../Data.BIN",&size);
  for (i=0;i<size;i++) sum+=copy[i];
  cur=DirCur;
  Silent(FALSE);
  "%d:%d:%d:%d:%s\n",file_task_size,file_task_sum,size,sum,cur;
  Silent;
  Free(copy);
  Free(cur);
  HomeSet(old_home);
  Cd(old_dir);
  Free(old_home);
  Free(old_dir);
  Silent(old_silent);
}

FileTask;
