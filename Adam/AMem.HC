#help_index "Memory/Task"
public I64 TaskMemAlloced(CTask *task=NULL,Bool override_validate=FALSE)
{//Count of bytes alloced to a task, used+unused.
  I64 res;
  if (!task) task=Fs;
  if (override_validate || TaskValidate(task)) {
    res=task->code_heap->alloced_u8s;
    if (task->code_heap!=task->data_heap)
      res+=task->data_heap->alloced_u8s;
    return res;
  } else
    return 0;
}

public I64 TaskMemUsed(CTask *task=NULL,Bool override_validate=FALSE)
{//Count of bytes alloced to a task and in use.
  I64 res;
  if (!task) task=Fs;
  if (override_validate || TaskValidate(task)) {
    res=task->code_heap->used_u8s;
    if (task->data_heap!=task->code_heap)
      res+=task->data_heap->used_u8s;
    return res;
  } else
    return 0;
}
