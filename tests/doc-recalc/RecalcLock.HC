I64 recalc_locked=0,recalc_released=0;

U0 RecalcLockChild(CDoc *doc)
{
  DocLock(doc);
  recalc_locked=1;
  Sleep(20);
  if (!DocUnlock(doc)) throw('RecalcLk');
  recalc_released=1;
}

U0 RecalcLock()
{
  CDoc *doc;
  CTask *child;
  I64 i,error;
  U8 *except;
  recalc_hash=14695981039346656037;recalc_cnt=0;
  RecalcWindow(0);
  for (i=0;i<8;i++) {
    doc=RecalcNew;
    RecalcEntry(doc,DOCT_TEXT,"lock");
    BEqu(&Fs->task_flags,TASKf_BREAK_LOCKED,i&1);
    BEqu(&doc->flags,DOCf_BREAK_UNLOCKED,i&2);
    if (i&4) DocLock(doc);
    if (!DocRecalc(doc)) throw('Recalc');
    RecalcState(doc);
    if (i&4) DocUnlock(doc);
    RecalcDel(doc);
  }
  BreakUnlock;
  doc=RecalcNew;
  RecalcEntry(doc,DOCT_TEXT,"foreign lock");
  recalc_locked=recalc_released=0;
  child=Spawn(&RecalcLockChild,doc,,,Fs);
  while (!recalc_locked) Sleep(1);
  if (!DocRecalc(doc) || !recalc_released) throw('RecalcLk');
  if (TaskValidate(child)) Kill(child);
  RecalcState(doc);
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  except=Fs->next_except;error=0;
  try DocRecalc(doc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error!='Break' || doc->owning_task || doc->locked_flags ||
	Bt(&Fs->task_flags,TASKf_BREAK_LOCKED) ||
	Bt(&Fs->task_flags,TASKf_PENDING_BREAK) ||
	Fs->next_except!=except) throw('RecalcBk');
  RecalcState(doc);
  RecalcDel(doc);
  "RecalcLock:%016X:%d\n",recalc_hash,recalc_cnt;
}

RecalcLock;
