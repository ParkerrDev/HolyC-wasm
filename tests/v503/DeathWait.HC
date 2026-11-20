//V5.03 Kernel/KTask.HC DeathWait waits for a task that exits.

U0 DWTask(I64)
{
  Sleep(50);
}

U0 DWChk()
{
  CTask *task=Spawn(&DWTask,NULL,"DW");
  "Valid %d\n",TaskValidate(task);
  DeathWait(&task);
  "Valid %d\n",TaskValidate(task);
}

DWChk;
