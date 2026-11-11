//Native circular queues and posted messages. No synchronous substitute for waiting.
export const TASK_MESSAGE_SRC=String.raw`
U0 QueInit(CQue *head)
{//Init queue head links.
  head->next=head->last=head;
}

U0 QueIns(CQue *entry,CQue *pred)
{//Insert after predecessor.
  entry->next=pred->next;
  entry->last=pred;
  pred->next->last=entry;
  pred->next=entry;
}

U0 QueInsRev(CQue *entry,CQue *succ)
{//Insert before successor.
  entry->last=succ->last;
  entry->next=succ;
  succ->last->next=entry;
  succ->last=entry;
}

U0 QueRem(CQue *entry)
{//Remove item from queue.
  entry->next->last=entry->last;
  entry->last->next=entry->next;
}

I64 QueCnt(CQue *head)
{//Count of nodes in queue, not head.
  CQue *tmpq=head->next;
  I64 res=0;
  while (tmpq!=head) {
    res++;
    tmpq=tmpq->next;
  }
  return res;
}

U0 QueDel(CQue *head,Bool querem=FALSE)
{//Free entries in queue, not head.
  CQue *tmpq=head->next,*tmpq1;
  while (tmpq!=head) {
    tmpq1=tmpq->next;
    if (querem)
      QueRem(tmpq);
    Free(tmpq);
    tmpq=tmpq1;
  }
}

U0 JobDel(CJob *tmpc)
{//Free one cmd node.
  Free(tmpc->aux_str);
  Free(tmpc);
}

U0 JobQueDel(CJob *head)
{
  CJob *tmpc=head->next,*tmpc1;
  while (tmpc!=head) {
    tmpc1=tmpc->next;
    QueRem(tmpc);
    JobDel(tmpc);
    tmpc=tmpc1;
  }
}

U0 JobCtrlInit(CJobCtrl *ctrl)
{
  QueInit(&ctrl->next_waiting);
  QueInit(&ctrl->next_done);
  ctrl->flags=0;
}

U0 TaskRstAwaitingMsg(CTask *task=NULL)
{//Pop-ups get parent messages, so wake our pop-ups too.
  if (!task) task=Fs;
  do {
    if (TaskValidate(task))
      LBtr(&task->task_flags,TASKf_AWAITING_MSG);
    else
      break;
  } while (task=task->popup_task);
}

CJob *TaskMsg(CTask *_srv,CTask *master,
	I64 msg_code,I64 arg1,I64 arg2,I64 flags)
{//Post message to servant task. Negative code posts down and up.
  CJob *tmpc;
  CTask *srv=_srv;
  if (!TaskValidate(srv) || master && !TaskValidate(master) ||
	srv->popup_task && !Bt(&srv->task_flags,TASKf_FILTER_INPUT))
    return NULL;
  while (Bt(&srv->task_flags,TASKf_FILTER_INPUT) &&
	!Bt(&flags,JOBf_DONT_FILTER))
    srv=srv->next_input_filter_task;
  if (!TaskValidate(srv)) return NULL;
  tmpc=CAlloc(sizeof(CJob));
  tmpc->master_task=master;
  tmpc->job_code=JOBT_MSG;
  tmpc->msg_code=AbsI64(msg_code);
  tmpc->aux1=arg1;
  tmpc->aux2=arg2;
  tmpc->flags=flags;
  tmpc->ctrl=&srv->srv_ctrl;
  LBtr(&srv->task_flags,TASKf_IDLE);
  TaskRstAwaitingMsg(srv);
  QueIns(tmpc,srv->srv_ctrl.last_waiting);
  if (msg_code<0)
    TaskMsg(_srv,master,-msg_code+1,arg1,arg2,flags);
  return tmpc;
}

U0 PostMsg(CTask *task,I64 msg_code,I64 arg1,I64 arg2,I64 flags=0)
{//Post message to a task and return immediately.
  if (TaskValidate(task)) {
    if (Bt(&task->task_flags,TASKf_INPUT_FILTER_TASK))
      TaskMsg(task->last_input_filter_task,NULL,msg_code,arg1,arg2,
	    flags|1<<JOBf_DONT_FILTER);
    else
      TaskMsg(task,NULL,msg_code,arg1,arg2,flags);
  }
}

U0 Msg(I64 msg_code,I64 arg1,I64 arg2,I64 flags=0)
{//Post message to current task and return immediately.
  PostMsg(Fs,msg_code,arg1,arg2,flags);
}

I64 ScanMsg(I64 *_arg1=NULL,I64 *_arg2=NULL,I64 mask=~1,CTask *task=NULL)
{//Remove first matching message, discarding other message types.
  I64 res,sc;
  CJob *tmpc,*tmpc1;
  if (!task) task=Fs;
  tmpc1=&task->srv_ctrl.next_waiting;
  while ((tmpc=tmpc1->next)!=tmpc1) {
    if (tmpc->job_code!=JOBT_MSG)
      throw('JobHost',TRUE);
    QueRem(tmpc);
    res=tmpc->msg_code;
    sc=tmpc->aux2;
    if (_arg1) *_arg1=tmpc->aux1;
    if (_arg2) *_arg2=sc;
    JobDel(tmpc);
    if ((res!=MSG_KEY_DOWN || !(sc&SCF_KEY_DESC) ||
	  !Bt(&task->win_inhibit,WIf_SELF_KEY_DESC)) && Bt(&mask,res))
      return res;
  }
  if (_arg1) *_arg1=0;
  if (_arg2) *_arg2=0;
  if (task->parent_task && task->parent_task->popup_task==task)
    return ScanMsg(_arg1,_arg2,mask,task->parent_task);
  return MSG_NULL;
}

I64 FlushMsgs(CTask *task=NULL)
{//Throw away all messages. Return count.
  I64 res=0,arg1,arg2;
  while (ScanMsg(&arg1,&arg2,~1,task))
    res++;
  return res;
}

Bool Suspend(CTask *task=NULL,Bool state=TRUE)
{//Tell scheduler to skip task; return prior state.
  if (!task) task=Fs;
  if (TaskValidate(task))
    return LBEqu(&task->task_flags,TASKf_SUSPENDED,state);
  return FALSE;
}

Bool IsSuspended(CTask *task=NULL)
{
  if (!task) task=Fs;
  if (TaskValidate(task))
    return Bt(&task->task_flags,TASKf_SUSPENDED);
  return FALSE;
}
`;
