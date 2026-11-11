import U0 LifeOwnedMark(I64 phase,CTask *owner,I64 retained);

U0 LifeOwnedWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

U0 LifeOwned(Bool del,Bool foreign,Bool held,Bool pending)
{
  CTask *child=NULL,*owner=Fs;
  CDoc *doc;
  I64 error=0;
  U8 *except;
  RecalcWindow(0);
  if (foreign) owner=child=Spawn(&LifeOwnedWait,,,,Fs);
  LifeOwnedMark(-1,owner,0);
  doc=RecalcNew(owner);
  LifeFill(doc,7,TRUE);
  doc->bin_head.next->use_cnt=3;
  doc->bin_head.last->tag=StrNew("orphan",owner);
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  if (held) DocLock(doc);
  except=Fs->next_except;
  LifeOwnedMark(0,owner,0);
  if (pending) Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  try {
    if (del) DocDel(doc);
    else DocRst(doc,TRUE);
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (!del && held) {
    if (error || !doc->locked_flags || doc->owning_task!=Fs)
      throw('LifeLock');
    try DocUnlock(doc);
    catch {
      error=Fs->except_ch;
      Fs->catch_except=TRUE;
    }
  }
  if (pending && error!='Break' || !pending && error ||
	Fs->next_except!=except || Bt(&Fs->task_flags,TASKf_BREAK_LOCKED) ||
	Bt(&Fs->task_flags,TASKf_PENDING_BREAK)) throw('LifeBrk');
  if (del) LifeOwnedMark(1,owner,0);
  else {
    LifeOwnedMark(1,owner,3);
    LifeState(doc);
    DocDel(doc);
  }
  if (child) Kill(child);
}
