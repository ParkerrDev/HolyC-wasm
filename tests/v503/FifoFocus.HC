U0 FifoFocus()
{
  CTask *focus=sys_focus_task,*task=CAlloc(sizeof(CTask));
  CFifoI64 *old=kbd.scan_code_fifo,*fifo=FifoI64New(8);
  I64 res,code,ch,sc;
  task->addr=task;
  task->task_signature=TASK_SIGNATURE_VAL;
  task->next_input_filter_task=task->last_input_filter_task=task;
  QueInit(&task->srv_ctrl.next_waiting);
  QueInit(&task->srv_ctrl.next_done);
  kbd.scan_code_fifo=fifo;
  sys_focus_task=NULL;
  FifoI64Ins(fifo,0x1E0000001E);
  FifoI64Ins(fifo,0x11E0000011E);
  res=KbdMsgsQue;
  "%d %d\n",res,FifoI64Cnt(fifo);
  sys_focus_task=task;
  res=KbdMsgsQue;
  "%d %d\n",res,FifoI64Cnt(fifo);
  while (code=ScanMsg(&ch,&sc,~1,task))
    "%d %d %X\n",code,ch,sc;
  kbd.scan_code_fifo=old;
  sys_focus_task=focus;
  FifoI64Del(fifo);
  Free(task);
}

Suspend(sys_winmgr_task);
try FifoFocus;
catch Suspend(sys_winmgr_task,FALSE);
Suspend(sys_winmgr_task,FALSE);
