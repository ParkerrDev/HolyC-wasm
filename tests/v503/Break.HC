I64 break_child_code=0;

U0 BreakChild(U8 *)
{
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  try {
    PostMsg(Fs->parent_task,MSG_CMD,1,0);
    while (TRUE) Yield;
  } catch {
    break_child_code=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  PostMsg(Fs->parent_task,MSG_CMD,2,0);
}

U0 BreakCheck()
{
  I64 a,b,code=0,ch,sc,flags=Fs->task_flags;
  CTask *task;
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  Btr(&Fs->task_flags,TASKf_BREAK_LOCKED);
  Btr(&Fs->task_flags,TASKf_PENDING_BREAK);
  a=BreakLock;
  b=BreakLock;
  Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  Msg(MSG_CMD,11,22);
  try BreakUnlock;
  catch {
    code=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  "%d %d %X %d %d %d\n",a,b,code,
    Bt(&Fs->task_flags,TASKf_BREAK_LOCKED),
    Bt(&Fs->task_flags,TASKf_PENDING_BREAK),ScanMsg;
  Bts(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  Msg(MSG_CMD,11,22);
  Break;
  while (code=ScanMsg(&ch,&sc))
    "%d %d %X\n",code,ch,sc;
  task=Spawn(&BreakChild,,,,Fs);
  GetMsg(&a,&b,1<<MSG_CMD);
  BreakLock(task);
  Bts(&task->task_flags,TASKf_PENDING_BREAK);
  BreakUnlock(task);
  GetMsg(&a,&b,1<<MSG_CMD);
  while (TaskValidate(task)) Yield;
  "%d %X\n",a,break_child_code;
  BEqu(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC,
    Bt(&flags,TASKf_BREAK_TO_SHIFT_ESC));
  BEqu(&Fs->task_flags,TASKf_BREAK_LOCKED,Bt(&flags,TASKf_BREAK_LOCKED));
  BEqu(&Fs->task_flags,TASKf_PENDING_BREAK,Bt(&flags,TASKf_PENDING_BREAK));
}

BreakCheck;
