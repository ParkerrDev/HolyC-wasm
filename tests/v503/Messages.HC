CTask *MsgTaskNew()
{
  CTask *task=CAlloc(sizeof(CTask));
  task->addr=task;
  task->task_signature=TASK_SIGNATURE_VAL;
  task->next_input_filter_task=task->last_input_filter_task=task;
  QueInit(&task->srv_ctrl.next_waiting);
  QueInit(&task->srv_ctrl.next_done);
  return task;
}

U0 MsgDrain(CTask *task,I64 mask)
{
  I64 code,a=999,b=888;
  while (code=ScanMsg(&a,&b,mask,task))
    "%d:%d:%X ",code,a,b;
  "end:%d:%d:%d\n",a,b,QueCnt(&task->srv_ctrl.next_waiting);
}

U0 Messages()
{
  I64 i,j,mask,a,b,res;
  CTask *task=MsgTaskNew,*filter=MsgTaskNew,*popup=MsgTaskNew;
  CJob *job;
  for (i=0;i<256;i++) {
    mask=i*0xB79&0x3FFE;
    task->win_inhibit=0;
    if (i&1) task->win_inhibit=WIF_SELF_KEY_DESC;
    task->task_flags=1<<TASKf_IDLE|1<<TASKf_AWAITING_MSG;
    for (j=1;j<=12;j++) {
      a=j*i-77;
      b=j<<8|i;
      if (j==MSG_KEY_DOWN) b|=SCF_KEY_DESC;
      TaskMsg(task,NULL,j,a,b,0);
    }
    "%d:%d:%d ",i,QueCnt(&task->srv_ctrl.next_waiting),
	  task->task_flags;
    MsgDrain(task,mask);
  }
  job=TaskMsg(task,filter,MSG_KEY_DOWN_UP,65,SCF_SHIFT|30,17);
  "%d %d %d %d %d %d %d\n",job->job_code,job->msg_code,
	job->master_task==filter,job->ctrl==&task->srv_ctrl,
	job->flags,job->aux1,job->aux2;
  MsgDrain(task,~1);
  TaskMsg(task,NULL,MSG_MS_L_DOWN_UP,11,12,0);
  TaskMsg(task,NULL,MSG_MS_R_D_DOWN_UP,21,22,0);
  "%d %d\n",FlushMsgs(task),FlushMsgs(task);
  "%d %d %d\n",ToBool(TaskMsg(NULL,NULL,MSG_CMD,1,2,0)),
	ToBool(TaskMsg(task,1,MSG_CMD,1,2,0)),Suspend(1);
  task->popup_task=popup;
  "%d\n",ToBool(TaskMsg(task,NULL,MSG_CMD,1,2,0));
  task->popup_task=NULL;
  task->next_input_filter_task=filter;
  Bts(&task->task_flags,TASKf_FILTER_INPUT);
  job=TaskMsg(task,NULL,MSG_KEY_DOWN,31,32,0);
  "%d %d %d\n",job->ctrl==&filter->srv_ctrl,
	QueCnt(&filter->srv_ctrl.next_waiting),
	QueCnt(&task->srv_ctrl.next_waiting);
  TaskMsg(task,NULL,MSG_KEY_DOWN,41,42,1<<JOBf_DONT_FILTER);
  MsgDrain(filter,~1);
  MsgDrain(task,~1);
  Btr(&task->task_flags,TASKf_FILTER_INPUT);
  filter->last_input_filter_task=task;
  Bts(&filter->task_flags,TASKf_INPUT_FILTER_TASK);
  PostMsg(filter,MSG_CMD,51,52);
  MsgDrain(task,~1);
  Btr(&filter->task_flags,TASKf_INPUT_FILTER_TASK);
  TaskMsg(task,NULL,MSG_CMD,61,62,0);
  task->popup_task=popup;
  popup->parent_task=task;
  Bts(&task->task_flags,TASKf_AWAITING_MSG);
  Bts(&popup->task_flags,TASKf_AWAITING_MSG);
  TaskRstAwaitingMsg(task);
  "%d %d\n",Bt(&task->task_flags,TASKf_AWAITING_MSG),
	Bt(&popup->task_flags,TASKf_AWAITING_MSG);
  res=ScanMsg(&a,&b,~1,popup);
  "%d %d %d\n",res,a,b;
  task->popup_task=NULL;
  popup->parent_task=NULL;
  "%d %d %d %d\n",Suspend(task),Suspend(task),
	IsSuspended(task),Suspend(task,FALSE);
  "%d\n",IsSuspended(task);
  PostMsg(task,MSG_CMD,71,72);
  PostMsg(task,MSG_KEY_UP,81,82);
  "%d\n",ScanMsg(NULL,NULL,1<<MSG_KEY_UP,task);
  MsgDrain(task,~1);
  FlushMsgs(task);
  Free(task);
  Free(filter);
  Free(popup);
}

Messages;
