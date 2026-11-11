U8 *dt_start=NULL,*dt_end=NULL;

U0 DirectoryChild(U8 *)
{
  Silent;
  dt_start=DirCur(,Fs->parent_task);
  Cd("B:/DirChk/Other",TRUE);
  dt_end=DirCur(,Fs->parent_task);
}

U0 DirectoryTask()
{
  U8 *old_dir=DirCur,*old_home=StrNew(blkdev.home_dir),*cur;
  Bool old_silent=Silent;
  CTask *task;
  Cd("B:/DirChk/Home",TRUE);
  HomeSet("B:/DirChk/Home");
  Cd("B:/DirChk/Parent",TRUE);
  task=Spawn(&DirectoryChild,,,,Fs);
  while (TaskValidate(task)) Yield;
  cur=DirCur;
  Silent(FALSE);
  "%s|%s|%s\n",dt_start,dt_end,cur;
  Silent;
  Free(dt_start);
  Free(dt_end);
  Free(cur);
  dt_start=dt_end=NULL;
  HomeSet(old_home);
  Cd(old_dir);
  Free(old_home);
  Free(old_dir);
  Silent(old_silent);
}

DirectoryTask;
