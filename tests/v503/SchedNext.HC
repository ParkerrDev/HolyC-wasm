//V5.03 Kernel/Sched.HC: Yield looks for the next task to run from the task
//after the one that gave up the CPU, on round the queue. A and C sleep; B
//wakes first and keeps the CPU (Busy) until both are due, then ends.

U8 sched_order[4];
I64 sched_num=0;

U0 SchedTask(U8 *data)
{
  if (data(I64)=='B') {
    Sleep(5);
    Busy(50000);
  } else
    Sleep(20);
  sched_order[sched_num++]=data(I64);
}

U0 SchedChk()
{
  CTask *a=Spawn(&SchedTask,'A'(U8 *),"A"),
	*b=Spawn(&SchedTask,'B'(U8 *),"B"),
	*c=Spawn(&SchedTask,'C'(U8 *),"C");
  DeathWait(&a);
  DeathWait(&b);
  DeathWait(&c);
  "%c%c%c\n",sched_order[0],sched_order[1],sched_order[2];
}

SchedChk;
