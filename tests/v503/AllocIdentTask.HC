I64 ai_mode=0,ai_armed=0,ai_error=0;
U8 *ai_parent_copy=NULL,*ai_kernel_copy=NULL;

U0 AllocIdentChild(U8 *)
{
  U8 *src=MAlloc(37),*local=NULL;
  I64 i,size=MSize(src);
  for (i=0;i<size;i++) src[i]=i*13+7;
  try {
    ai_armed=1;
    switch (ai_mode) {
      case 0:
	local=MAllocIdent(src);
	break;
      case 1:
	ai_parent_copy=MAllocIdent(src,Fs->parent_task);
	break;
      case 2:
	ai_kernel_copy=AMAllocIdent(src);
	break;
    }
    ai_armed=0;
    if (local)
      for (i=0;i<size;i++)
	if (local[i]!=src[i]) throw('Copy');
  } catch {
    ai_error=Fs->except_ch;
    Fs->catch_except=TRUE;
    ai_armed=0;
  }
  for (i=0;i<size;i++)
    if (src[i]!=(i*13+7)&255) throw('Source');
  Free(src);
}

I64 AllocIdentTask(I64 which)
{
  CTask *task;
  I64 i,size;
  U8 *ptr;
  ai_mode=which;
  ai_error=0;
  ai_parent_copy=ai_kernel_copy=NULL;
  task=Spawn(&AllocIdentChild,,,,Fs);
  while (TaskValidate(task)) Yield;
  ptr=ai_parent_copy;
  if (!ptr) ptr=ai_kernel_copy;
  if (ptr) {
    size=MSize(ptr);
    for (i=0;i<size;i++)
      if (ptr[i]!=(i*13+7)&255) throw('Owner');
    Free(ptr);
  }
  return ai_error;
}

"%d %d %d\n",AllocIdentTask(0),AllocIdentTask(1),AllocIdentTask(2);
