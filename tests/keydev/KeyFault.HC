I64 trial_active=0,child_ran=0;

U0 Child(U8 *)
{
  child_ran=1;
}

U0 Setup()
{
  Raw(OFF);
  Silent(OFF);
  LBts(&Fs->task_flags,TASKf_INPUT_FILTER_TASK);
}

I64 State(I64 field)
{
  switch (field) {
    case 0: return Fs->display_flags;
    case 1: return Fs->task_flags;
    case 2: return text.raw_col;
    case 3: return trial_active;
    case 4: return IsRaw;
    case 5: return Bt(&Fs->task_flags,TASKf_INPUT_FILTER_TASK);
    case 6: return child_ran;
  }
  return 0;
}

I64 Trial(I64 interval)
{
  I64 res=0;
  trial_active=TRUE;
  try RawPrint(interval,"Fault:%04d",37);
  catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  trial_active=FALSE;
  return res;
}

U0 Overlap()
{
  CTask *child;
  Setup;
  child_ran=0;
  child=Spawn(&Child,,,,Fs);
  if (Trial(8)) throw('Trial');
  if (child_ran) throw('RawYield');
  while (TaskValidate(child)) Yield;
  if (!child_ran) throw('RawTask');
}

Bool FaultPut(I64,I64)
{
  throw('KeyFail');
  return FALSE;
}

I64 CallbackFault()
{
  CKeyDevEntry *tmpk=KeyDevAdd(&FaultPut,NULL,1);
  I64 res=Trial(0);
  KeyDevRem(tmpk);
  return res;
}

I64 PriorityFault(I64 priority)
{
  I64 res=0;
  try KeyDevAdd(&FaultPut,NULL,priority);
  catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}

Bool YieldPut(I64,I64)
{
  Yield;
  return TRUE;
}

U0 CallbackYield()
{
  CTask *child;
  CKeyDevEntry *tmpk=KeyDevAdd(&YieldPut,NULL,1);
  child_ran=0;
  child=Spawn(&Child,,,,Fs);
  if (Trial(0)) throw('Trial');
  if (!child_ran) throw('KeyYield');
  while (TaskValidate(child)) Yield;
  KeyDevRem(tmpk);
}

I64 BoundsFault()
{
  I64 saved=text.raw_col,res;
  text.raw_col=-1;
  res=Trial(0);
  text.raw_col=saved;
  return res;
}
