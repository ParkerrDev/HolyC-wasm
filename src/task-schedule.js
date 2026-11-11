export const TASK_INTERFACE={
  name:"task-continuations",
  globals:["kbd"],
  imports:["__task_spawn","__task_kill","__task_wait","__task_exit"],
  check:"__task_require",
  exports:["TaskHostRoot","TaskHostEnter","TaskHostNew","TaskHostDone",
    "TaskHostFlags","TaskHostStk","TaskHostStkTop","TaskHostKill","TaskHostMsg","TaskHostEnd","TaskHostReady",
    "KbdHostByte","KbdHostReset"],
};

export const TASK_SCHEDULE_SRC=String.raw`
I64 __hctask_num=1;

CTask *TaskHostRoot()
{
  return &fs_storage;
}

U0 TaskHostEnter(CTask *task)
{
  Fs=task;
}

I64 TaskHostFlags(CTask *task)
{
  return task->task_flags;
}

U0 TaskHostKill(CTask *task)
{
  Bts(&task->task_flags,TASKf_KILL_TASK);
}

CTaskStk *TaskHostStk(CTask *task)
{
  return task->stk;
}

U8 *TaskHostStkTop(CTask *task)
{
  return (&task->stk->stk_base)(U8 *)+task->stk->stk_size;
}

I64 TaskHostEnd(CTask *task)
{
  U0 (*cb)();
  cb=task->task_end_cb;
  if (cb) {
    task->task_end_cb=NULL;
    task->wake_jiffy=0;
    Btr(&task->task_flags,TASKf_KILL_TASK);
    TaskRstAwaitingMsg(task);
    Suspend(task,FALSE);
  }
  return cb;
}

CTask *TaskHostNew(CTask *parent,U8 *name,I64 stk_size)
{
  CTask *task=NULL,*pred,*last;
  CTaskStk *tmps=NULL;
  I64 i;
  if (!parent) parent=&fs_storage;
  if (!name) name="Unnamed Task";
  try {
    task=CAlloc(sizeof(CTask));
    tmps=CAlloc(stk_size+offset(CTaskStk.stk_base));
    tmps->stk_size=stk_size;
    task->stk=tmps;
    task->addr=task;
    task->task_signature=TASK_SIGNATURE_VAL;
    task->task_num=__hctask_num++;
    task->parent_task=parent;
    task->next_input_filter_task=task->last_input_filter_task=task;
    task->next_child_task=task->last_child_task=
	  (&task->next_child_task)(U8 *)-offset(CTask.next_sibling_task);
    JobCtrlInit(&task->srv_ctrl);
    task->text_attr=WHITE<<4+BLUE;
    task->win_inhibit=WIG_TASK_DFT;
    task->title_src=TTS_TASK_NAME;
    task->win_left=1;
    task->win_right=TEXT_COLS-2;
    task->win_top=13;
    task->win_bottom=TEXT_ROWS-2;
    WinDerivedValsUpdate(task);
    for (i=0;i<TASK_NAME_LEN-1 && name[i];i++)
      task->task_name[i]=name[i];
    StrCpy(task->task_title,task->task_name);
    Seed(,task);
    last=Fs->last_task;
    last->next_task=Fs->last_task=task;
    task->last_task=last;
    task->next_task=Fs;
    pred=parent->last_child_task;
    last=pred->last_sibling_task;
    last->next_sibling_task=pred->last_sibling_task=task;
    task->last_sibling_task=last;
    task->next_sibling_task=pred;
  } catch {
    Free(tmps);
    Free(task);
  }
  return task;
}

U0 TaskHostDone(CTask *task)
{
  JobQueDel(&task->srv_ctrl.next_waiting);
  JobQueDel(&task->srv_ctrl.next_done);
  task->last_task->next_task=task->next_task;
  task->next_task->last_task=task->last_task;
  task->last_sibling_task->next_sibling_task=task->next_sibling_task;
  task->next_sibling_task->last_sibling_task=task->last_sibling_task;
  task->task_signature=0;
}

U0 TaskHostMsg(CTask *task,I64 code,I64 arg1,I64 arg2)
{
  PostMsg(task,code,arg1,arg2);
}

Bool TaskHostReady(CTask *task)
{
  CJob *head=&task->srv_ctrl.next_waiting;
  if (head->next!=head) return TRUE;
  if (task->parent_task && task->parent_task->popup_task==task)
    return TaskHostReady(task->parent_task);
  return FALSE;
}

CTask *Spawn(U0 (*fp_start_addr)(U8 *data),U8 *data=NULL,U8 *task_name=NULL,
	I64 target_cpu=-1,CTask *parent=NULL,I64 stk_size=0,
	I64 flags=1<<JOBf_ADD_TO_QUE)
{//Create a cooperative task with its own continuation and stack.
  return __task_spawn(fp_start_addr,data,task_name,target_cpu,
	parent,stk_size,flags);
}

Bool Kill(CTask *task,Bool wait=TRUE,Bool just_break=FALSE)
{
  return __task_kill(task,wait,just_break);
}

U0 Exit()
{//Terminate own task.
  __task_exit;
}

I64 GetMsg(I64 *_arg1=NULL,I64 *_arg2=NULL,I64 mask=~1,CTask *task=NULL)
{//Wait for a matching message, discarding unmatched messages.
  I64 res;
  if (!task) task=Fs;
  LBtr(&task->task_flags,TASKf_IDLE);
  while (!(res=ScanMsg(_arg1,_arg2,mask,task))) {
    LBts(&task->task_flags,TASKf_IDLE);
    __task_wait(task);
  }
  LBtr(&task->task_flags,TASKf_IDLE);
  return res;
}

Bool ScanKey(I64 *_ch=NULL,I64 *_scan_code=NULL,Bool echo=FALSE)
{
  I64 ch=0,sc=0;
  if (ScanMsg(&ch,&sc,1<<MSG_KEY_DOWN)) {
    if (_ch) *_ch=ch;
    if (_scan_code) *_scan_code=sc;
    if (echo) PutKey(ch,sc);
    return TRUE;
  }
  if (_ch) *_ch=0;
  if (_scan_code) *_scan_code=0;
  return FALSE;
}

I64 GetKey(I64 *_scan_code=NULL,Bool echo=FALSE,Bool raw_cursor=FALSE)
{
  I64 ch,sc;
  if (raw_cursor) throw('KeyHost',TRUE);
  while (!ScanKey(&ch,&sc,FALSE)) {
    LBts(&Fs->task_flags,TASKf_IDLE);
    LBts(&Fs->task_flags,TASKf_AWAITING_MSG);
    __task_wait(Fs);
    LBtr(&Fs->task_flags,TASKf_IDLE);
  }
  if (echo) PutKey(ch,sc);
  if (_scan_code) *_scan_code=sc;
  return ch;
}

I64 GetChar(I64 *_scan_code=NULL,Bool echo=TRUE,Bool raw_cursor=FALSE)
{//Wait for a non-zero ASCII key, preserving its native scan code.
  I64 ch;
  do ch=GetKey(_scan_code,FALSE,raw_cursor);
  while (!ch);
  if (echo)
    "$$PT$$%c$$FG$$",ch;
  return ch;
}

I64 PressAKey()
{//Print a prompt and wait for a non-zero ASCII key.
  "$$BK,1$$PRESS A KEY$$BK,0$$\n";
  return GetChar(,FALSE);
}
`;
