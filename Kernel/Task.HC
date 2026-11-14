
Bool TaskValidate(CTask *task)
{//return TRUE if task looks valid.
  if (!(0<task<=I32_MAX) || task->addr!=task ||
	task->task_signature!=TASK_SIGNATURE_VAL)
    return FALSE;
  else
    return TRUE;
}
