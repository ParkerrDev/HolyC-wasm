//V5.03 Kernel/MultiProc.HC. The browser has one core and no APIC,
//so there is no TSS, no PUSHFD/CLI and no MPInt.

CCPU *CPUStructInit(I64 num,CCPU *c,CTask *seth_task)
{//Seth is null when called by adam on CSysFixedArea.boot_cpu0
  MemSet(c,0,sizeof(CCPU));
  c->addr=c;
  c->num=num;
  c->idle_factor=0.01;
  QueInit(&c->next_dying);
  c->seth_task=seth_task;// It waits for this to be filled-in: $LK,"seth_task",A="FF:::/Kernel/MultiProc.HC,seth_task"$
  return c;
}

public CCPU *Gs()
{//GS points to current $LK,"CCPU",A="MN:CCPU"$.
  return cpu_structs;
}

CJob *JobQue(I64 (*fp_addr)(U8 *data),U8 *data=NULL,
       I64 target_cpu=1,I64 flags=1<<JOBf_FREE_ON_COMPLETE,
       I64 job_code=JOBT_CALL,U8 *aux_str=NULL,I64 aux1=0,I64 aux2=0)
{//Queue multicore jobs, handled by Seth tasks.
//Set flags to zero if you wish to get the res.
  //See $LK,"::/Demo/MultiCore/Lock.HC"$
  CJobCtrl *ctrl;
  CJob *tmpc;
  CTask *seth;
  if (!(0<=target_cpu<mp_cnt))
    throw('MultCore');
  tmpc=ACAlloc(sizeof(CJob));
  if (aux_str)
    tmpc->aux_str=AStrNew(aux_str);
  tmpc->job_code=job_code;
  tmpc->addr=fp_addr;
  tmpc->fun_arg=data;
  tmpc->flags=flags;
  tmpc->aux1=aux1;
  tmpc->aux2=aux2;
  seth=cpu_structs[target_cpu].seth_task;
  tmpc->ctrl=ctrl=&seth->srv_ctrl;
  LBtr(&seth->task_flags,TASKf_AWAITING_MSG);
  QueIns(tmpc,ctrl->last_waiting);
  return tmpc;
}

#define I_WAKE			0x31

U0 MPInt(U8 num,I64 cpu_num=1)
{//Generate interrupt for specified core.
//One core and no APIC: there is no other core to wake.
  no_warn num;
  if (cpu_num>=mp_cnt)
    throw('MultCore');
}
