
//V5.03 KernelB.HH's IC_GET_RFLAGS and IC_SET_RFLAGS. A core's RFLAGS is
//the task's on it, as Yield saves and restores them; IF gates only
//preemption, which a cooperative core has not.
public I64 GetRFlags()
{//Get RFlags register value.
  return Fs->rflags;
}

public U0 SetRFlags(I64 d)
{//Set RFlags register value.
  Fs->rflags=d;
}

Bool TaskValidate(CTask *task)
{//return TRUE if task looks valid.
  if (!(0<task<=I32_MAX) || task->addr!=task ||
	task->task_signature!=TASK_SIGNATURE_VAL)
    return FALSE;
  else
    return TRUE;
}

I64 BirthWait(CTask **_task,I64 task_num=-1)
{//Wait for task valid and not task_num.
  while (!TaskValidate(*_task)||(*_task)->task_num==task_num)
    Yield;
  return (*_task)->task_num;
}

//V5.03 Kernel/KTask.HC SrvTaskCont through User.
U0 SrvTaskCont()
{//Act as server task in a loop handling commands.
  I64 old_flags=GetRFlags;
  FlushMsgs;
  while (TRUE) {
    CLI
    if (JobsHndlr(old_flags) && Fs->title_src==TTS_TASK_NAME)
      MemCpy(Fs->task_title,Fs->task_name,TASK_NAME_LEN);
    FlushMsgs;
    LBts(&Fs->task_flags,TASKf_IDLE);
    LBts(&Fs->task_flags,TASKf_AWAITING_MSG);
    Yield;
    SetRFlags(old_flags);
  }
}

extern I64 ExeCmdLine(CCmpCtrl *cc); //V5.03 Kernel/KernelC.HH.

U0 UserTaskCont()
{//Terminal key-input-execute loop.
  CCmpCtrl *cc;
  CDoc *doc;
  Bool cont=TRUE;
  do {
    cc=CmpCtrlNew(,CCF_CMD_LINE|CCF_PMT|CCF_QUESTION_HELP);
    QueIns(cc,Fs->last_cc);
    try {
      Lex(cc);
      ExeCmdLine(cc);
      cont=Bt(&cc->flags,CCf_PMT);
      QueRem(cc);
      CmpCtrlDel(cc);
    } catch {
      if ((doc=Fs->put_doc) && doc->doc_signature==DOC_SIGNATURE_VAL)
	DocUnlock(doc);
      PutExcept;
    }
  } while (cont);
}

U0 SrvCmdLine(I64 dummy=0)
{
  no_warn dummy;
  Fs->win_inhibit=WIG_USER_TASK_DFT;
  CallExtStr("SrvStartUp");
  SrvTaskCont;
}

U0 UserCmdLine(I64 dummy=0)
{//A user task ends-up calling this.
  no_warn dummy;
  Fs->win_inhibit=WIG_USER_TASK_DFT;
  CallExtStr("UserStartUp");
//Back with Dbg (V5.03 KDbg.HC, nobody): if (!LBts(...)) Dbg;
  LBts(&Fs->display_flags,DISPLAYf_SHOW);
  UserTaskCont;
}

CTask *User(U8 *fmt=NULL,...)
{//Create user term task.
  U8 *st;
  CTask *task=Spawn(&UserCmdLine);
  TaskWait(task);
  if (fmt) {
    st=StrPrintJoin(NULL,fmt,argc,argv);
    XTalk(task,st);
    Free(st);
  }
  return task;
}
