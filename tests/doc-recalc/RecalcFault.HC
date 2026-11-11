import U0 RecalcFaultMark(I64 phase,CTask *owner,I64 nodes,I64 error);

U0 RecalcFaultWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

I64 RecalcFaultNodes(CDoc *doc)
{
  CDocEntry *entry=doc->head.next;
  I64 cnt=0;
  while (entry!=doc) {
    if (entry->next->last!=entry || entry->last->next!=entry)
      throw('RecalcQ');
    if (++cnt>64) throw('RecalcQ');
    entry=entry->next;
  }
  return cnt;
}

I64 RecalcFaultOp(CDoc *doc)
{
  I64 error=0,break_flags=Fs->task_flags&
	(1<<TASKf_BREAK_LOCKED|1<<TASKf_PENDING_BREAK),
	locked=doc->locked_flags,marker=doc->flags&1<<DOCf_BREAK_UNLOCKED;
  CTask *owner=doc->owning_task;
  U8 *except=Fs->next_except;
  try
    DocRecalc(doc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (doc->locked_flags!=locked || doc->owning_task!=owner ||
	Fs->task_flags&(1<<TASKf_BREAK_LOCKED|1<<TASKf_PENDING_BREAK)
	!=break_flags || Fs->next_except!=except) throw('RecalcLk');
  if (error && doc->flags&1<<DOCf_BREAK_UNLOCKED!=marker)
    throw('RecalcMk');
  RecalcFaultNodes(doc);
  return error;
}

I64 RecalcFault(I64 mode,Bool foreign,Bool inherited)
{
  CTask *child=NULL,*owner=Fs;
  CDoc *doc;
  CDocEntry *entry;
  I64 error;
  U8 text_buf[128];
  RecalcWindow(0);
  if (foreign) owner=child=Spawn(&RecalcFaultWait,,,,Fs);
  doc=RecalcNew(owner);
  if (mode) RecalcEntry(doc,DOCT_WORD_WRAP,,1);
  entry=RecalcEntry(doc,DOCT_TEXT,"alpha beta gamma delta epsilon");
  doc->cur_entry=entry;
  if (!mode) RecalcEntry(doc,DOCT_TEXT," zeta eta theta");
  if (mode==2) {
    Free(entry->tag);
    entry->tag=StrNew(
	  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",owner);
  }
  if (inherited) DocLock(doc);
  RecalcFaultMark(0,owner,RecalcFaultNodes(doc),0);
  error=RecalcFaultOp(doc);
  RecalcFaultMark(1,owner,RecalcFaultNodes(doc),error);
  if (error && RecalcFaultOp(doc)) throw('RecalcRt');
  *text_buf=0;
  entry=doc->head.next;
  while (entry!=doc) {
    if (entry->type_u8==DOCT_TEXT) StrCpy(text_buf+StrLen(text_buf),entry->tag);
    entry=entry->next;
  }
  switch (mode) {
    case 0:
      if (StrCmp(text_buf,"alpha beta gamma delta epsilon zeta eta theta"))
	throw('RecalcTx');
      break;
    case 1:
      if (StrCmp(text_buf,"alpha beta gamma delta epsilon"))
	throw('RecalcTx');
      break;
    case 2:
      if (StrCmp(text_buf,
	    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"))
	throw('RecalcTx');
  }
  if (inherited) DocUnlock(doc);
  RecalcDel(doc);
  if (child) Kill(child);
  return error;
}
