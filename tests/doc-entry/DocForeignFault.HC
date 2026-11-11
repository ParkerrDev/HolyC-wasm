import U0 DocForeignMark(I64 phase,CTask *child,I64 error);

U0 DocForeignWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

I64 DocForeignTrial(Bool split)
{
  CTask *child=Spawn(&DocForeignWait,,,,Fs);
  I64 error;
  if (split) {
    DocInsertFaultSetup(FALSE);
    insert_doc->mem_task=child;
  } else {
    DocCopySetup(511,FALSE);
    copy_dst->mem_task=child;
  }
  DocForeignMark(0,child,0);
  if (split) error=DocInsertFaultTrial;
  else error=DocCopyTrial;
  DocForeignMark(1,child,error);
  if (error) {
    if (split) DocChkAssert(!DocInsertFaultTrial);
    else DocChkAssert(!DocCopyTrial);
  }
  if (split) DocInsertFaultDone;
  else DocCopyDone;
  Kill(child);
  return error;
}
