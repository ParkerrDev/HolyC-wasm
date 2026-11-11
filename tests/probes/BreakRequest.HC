extern U0 CtrlAltC(I64);

I64 br_mode=0,br_code=0;

U0 BreakWait(U8 *)
{
  I64 ch,sc;
  Btr(&Fs->win_inhibit,WIf_SELF_FOCUS);
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  if (br_mode==2)
    Bts(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  if (br_mode<2) BreakLock;
  PostMsg(Fs->parent_task,MSG_CMD,1,0);
  try {
    ch=GetKey(&sc);
    br_code=ch;
  } catch {
    br_code=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  PostMsg(Fs->parent_task,MSG_CMD,2,0);
}

U0 BreakRequest()
{
  CTask *task,*old_focus=sys_focus_task;
  I64 i,a,b;
  for (br_mode=0;br_mode<3;br_mode++) {
    br_code=0;
    task=Spawn(&BreakWait,,,,Fs);
    GetMsg(&a,&b,1<<MSG_CMD);
    sys_focus_task=task;
    CtrlAltC(0);
    for (i=0;i<8;i++) Yield;
    "%d %d %d %d\n",br_mode,br_code,
      Bt(&task->task_flags,TASKf_BREAK_LOCKED),
      Bt(&task->task_flags,TASKf_PENDING_BREAK);
    if (!br_mode) {
      BreakUnlock(task);
      PostMsg(task,MSG_CMD,0,0);
    } else if (br_mode==1)
      CtrlAltC(0);
    else
      PostMsg(task,MSG_CMD,0,0);
    GetMsg(&a,&b,1<<MSG_CMD);
    sys_focus_task=old_focus;
    while (TaskValidate(task)) Yield;
    "%d %X\n",a,br_code;
  }
}

BreakRequest;
