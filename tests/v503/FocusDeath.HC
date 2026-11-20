//V5.03 Kernel/KTask.HC TaskEnd: a task that dies with the focus leaves
//sys_focus_task NULL (WinMgrSleep's WinRefocus then gives the focus to the
//top window), so keys never go to a dead task.

U0 FDTask(I64)
{
  Sleep(50);
}

U0 FDChk()
{
  CTask *focus=sys_focus_task,*task=Spawn(&FDTask,NULL,"FD"),*dead=task;
  sys_focus_task=task;
  DeathWait(&task);
  "Dead %d Focus NULL %d\n",TaskValidate(dead),sys_focus_task==NULL;
  sys_focus_task=focus;
}

if (sys_winmgr_task!=Fs)
  Suspend(sys_winmgr_task);
try FDChk;
catch if (sys_winmgr_task!=Fs) Suspend(sys_winmgr_task,FALSE);
if (sys_winmgr_task!=Fs)
  Suspend(sys_winmgr_task,FALSE);
