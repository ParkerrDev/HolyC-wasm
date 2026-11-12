import U0 ClearFaultMark(I64 phase,CTask *owner,I64 error);
import U0 ClearFaultPtr(U8 *ptr,CTask *owner);

Bool ClearFaultBreak(Bool pending=FALSE)
{
  if (!Bt(&Fs->task_flags,TASKf_BREAK_LOCKED)) return FALSE;
  if (pending) {
    Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
    Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  }
  return TRUE;
}

U0 ClearWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

U0 ClearFaultPtrs(CDoc *doc)
{
  CDocEntry *entry=doc->head.next;
  I64 cnt=0;
  while (entry!=doc) {
    if (entry->next->last!=entry || entry->last->next!=entry)
      throw('ClrQue');
    if (++cnt>128) throw('ClrQue');
    ClearFaultPtr(entry,doc->mem_task);
    ClearFaultPtr(entry->tag,doc->mem_task);
    if (MSize(entry)>=sizeof(CDocEntry)) {
      ClearFaultPtr(entry->aux_str,doc->mem_task);
      ClearFaultPtr(entry->define_str,doc->mem_task);
      ClearFaultPtr(entry->html_link,doc->mem_task);
      ClearFaultPtr(entry->left_macro,doc->mem_task);
      ClearFaultPtr(entry->right_macro,doc->mem_task);
    }
    entry=entry->next;
  }
}

I64 ClearFault(I64 mode,Bool foreign,Bool inherited,Bool holds)
{
  CTask *child=NULL,*owner=Fs,*lock_owner;
  CDoc *doc;
  CDocEntry *entry,*next;
  U8 *except;
  I64 error=0,lock_flags,task_flags;
  RecalcWindow(0);
  if (foreign) owner=child=Spawn(&ClearWait,,,,Fs);
  doc=RecalcNew(owner);
  switch (mode) {
    case 1:
      RecalcEntry(doc,DOCT_WORD_WRAP,,1);
      break;
    case 2:
      doc->flags|=DOCF_PLAIN_TEXT;
      break;
    case 3:
      doc->flags|=DOCF_PLAIN_TEXT_TABS;
      break;
  }
  entry=RecalcEntry(doc,DOCT_TEXT,
	"alpha beta gamma delta epsilon",,DOCEF_HOLD);
  doc->cur_entry=entry;doc->cur_col=2;
  RecalcEntry(doc,DOCT_TEXT," zeta eta theta");
  if (inherited) DocLock(doc);
  lock_owner=doc->owning_task;lock_flags=doc->locked_flags;
  task_flags=Fs->task_flags&
	(1<<TASKf_BREAK_LOCKED|1<<TASKf_PENDING_BREAK);
  except=Fs->next_except;
  ClearFaultMark(0,owner,0);ClearFaultPtrs(doc);
  ClearFaultMark(1,owner,0);
  try DocClear(doc,holds);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  ClearFaultMark(2,owner,error);ClearFaultPtrs(doc);
  ClearFaultMark(3,owner,error);
  if (doc->owning_task!=lock_owner || doc->locked_flags!=lock_flags ||
	Fs->task_flags&(1<<TASKf_BREAK_LOCKED|1<<TASKf_PENDING_BREAK)
	!=task_flags || Fs->next_except!=except) throw('ClrLock');
  entry=doc->head.next;
  while (entry!=doc) {
    next=entry->next;
    if (entry->type_u8==DOCT_ERROR) DocEntryDel(doc,entry);
    entry=next;
  }
  DocClear(doc,holds);
  if (inherited) DocUnlock(doc);
  RecalcDel(doc);
  if (child) Kill(child);
  return error;
}

Raw(OFF);
