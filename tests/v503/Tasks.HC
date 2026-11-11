I64 task_sum[3],task_done[3],task_ended[3];

I64 ChildCnt(CTask *task)
{
  CTask *head=(&task->next_child_task)(U8 *)-
    offset(CTask.next_sibling_task),*tmp=task->next_child_task;
  I64 res=0;
  while (tmp!=head) {
    if (tmp->parent_task!=task) throw('Parent');
    if (tmp->next_sibling_task->last_sibling_task!=tmp) throw('Links');
    res++;
    tmp=tmp->next_sibling_task;
  }
  return res;
}

U0 ChildEnd()
{
  I64 a,b;
  if (Fs->user_data) GetMsg(&a,&b,1<<MSG_CMD);
  Sleep(1);
  task_ended[Fs->user_data]++;
  Exit;
}

U0 Child(U8 *data)
{
  I64 id=data,i,a,b,buf[64],sum=0;
  U8 *owned=MAlloc(8192);
  Fs->user_data=id;
  Fs->task_end_cb=&ChildEnd;
  for (i=0;i<64;i++) buf[i]=id*101+i;
  MemSet(owned,91,8192);
  GetMsg(&a,&b,1<<MSG_CMD);
  Sleep(1);
  Yield;
  for (i=0;i<64;i++) sum+=buf[i];
  if (a!=id+10 || b!=id+20 || owned[8191]!=91) throw('Context');
  task_sum[id]=sum;
  PostMsg(Fs->parent_task,MSG_CMD,id,TaskValidate(Fs));
  GetMsg(&a,&b,1<<MSG_CMD);
  task_done[id]=1;
  PostMsg(Fs->parent_task,MSG_CMD,id,2);
}

U0 Tasks()
{
  CTask *child[3];
  I64 i,a,b,base=ChildCnt(Fs);
  MemSet(task_sum,0,sizeof(task_sum));
  MemSet(task_done,0,sizeof(task_done));
  MemSet(task_ended,0,sizeof(task_ended));
  for (i=0;i<3;i++) {
    child[i]=Spawn(&Child,i,"Probe",,Fs);
    PostMsg(child[i],MSG_CMD,i+10,i+20);
    GetMsg(&a,&b,1<<MSG_CMD);
    "%d %d %d\n",a,b,task_sum[i];
  }
  "%d\n",ChildCnt(Fs)-base;
  "%d\n",Suspend(child[0]);
  PostMsg(child[0],MSG_CMD,31,32);
  Sleep(5);
  "%d %d\n",task_done[0],IsSuspended(child[0]);
  "%d\n",Suspend(child[0],FALSE);
  GetMsg(&a,&b,1<<MSG_CMD);
  "%d %d\n",a,b;
  while (TaskValidate(child[0])) Yield;
  "%d\n",Kill(child[1]);
  "%d\n",Kill(child[2]);
  "%d %d %d %d\n",ChildCnt(Fs)-base,
	task_done[0],task_done[1],task_done[2];
  "%d %d %d\n",task_ended[0],task_ended[1],task_ended[2];
  PostMsg(child[1],MSG_CMD,0,0);
  PostMsg(child[2],MSG_CMD,0,0);
  while (TaskValidate(child[1]) || TaskValidate(child[2])) Yield;
  "%d %d %d %d\n",ChildCnt(Fs)-base,
	task_ended[0],task_ended[1],task_ended[2];
}

Tasks;
