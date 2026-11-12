Bool put_leak_done=FALSE;
I64 put_leak=0,put_leak_error=0;

U0 PutLeakBody(U8 *)
{
  I64 before;
  CDoc *doc;
  BreakUnlock;
  before=Fs->data_heap->used_u8s;
  doc=RecalcNew;
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  try DocPrint(doc,"owned");
  catch {
    put_leak_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  RecalcDel(doc);
  put_leak=ToBool(Fs->data_heap->used_u8s-before);
  put_leak_done=TRUE;
  while (TRUE) Yield;
}

U0 PutFormatOwned()
{
  CTask *child;
  put_leak_done=FALSE;put_leak_error=0;put_leak=0;
  child=Spawn(&PutLeakBody,NULL,"Format ownership");
  while (!put_leak_done) Yield;
  Kill(child); //Release the stock function's retained format buffer.
  if (put_leak_error!='Break') throw('PutBreak');
  "PutFormatOwned:%d\n",put_leak;
}

PutFormatOwned;
