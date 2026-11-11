I64 doc_lock_started,doc_lock_acquired,doc_lock_done;

U0 DocLockChkAssert(Bool val)
{
  if (!val) throw('DocLock');
}

U0 DocLockChild(CDoc *doc)
{
  doc_lock_started=1;
  DocLockChkAssert(DocLock(doc));
  doc_lock_acquired=1;
  Sleep(25);
  DocLockChkAssert(doc->owning_task==Fs && DocUnlock(doc));
  doc_lock_done=1;
}

U0 DocLockChk()
{
  I64 i,hash=0xCBF29CE484222325,flags=Fs->task_flags;
  Bool first,second,caught=FALSE;
  CDoc *doc=CAlloc(sizeof(CDoc));
  CTask *task=NULL;
  doc_lock_started=doc_lock_acquired=doc_lock_done=0;
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  Btr(&Fs->task_flags,TASKf_PENDING_BREAK);
  try {
    for (i=0;i<32;i++) {
      BEqu(&Fs->task_flags,TASKf_BREAK_LOCKED,i&1);
      doc->flags=i<<21;
      first=DocLock(doc);
      second=DocLock(doc);
      DocLockChkAssert(first && !second && doc->owning_task==Fs);
      DocLockChkAssert(Bt(&doc->flags,DOCf_BREAK_UNLOCKED)==!(i&1));
      DocLockChkAssert(Bt(&Fs->task_flags,TASKf_BREAK_LOCKED));
      DocLockChkAssert(DocUnlock(doc) && !DocUnlock(doc));
      DocLockChkAssert(!doc->owning_task && !doc->locked_flags);
      DocLockChkAssert(Bt(&Fs->task_flags,TASKf_BREAK_LOCKED)==i&1);
      hash=(hash^doc->flags)*0x100000001B3;
    }
    Btr(&Fs->task_flags,TASKf_BREAK_LOCKED);
    DocLockChkAssert(DocLock(doc));
    task=Spawn(&DocLockChild,doc,,,Fs);
    while (!doc_lock_started)
      Sleep(1);
    DocLockChkAssert(!doc_lock_acquired && doc->owning_task==Fs);
    DocLockChkAssert(DocUnlock(doc));
    while (!doc_lock_acquired)
      Sleep(1);
    DocLockChkAssert(doc->owning_task==task && !DocUnlock(doc));
    while (!doc_lock_done)
      Sleep(1);
    if (TaskValidate(task)) Kill(task);
    task=NULL;
    DocLockChkAssert(!doc->owning_task && !doc->locked_flags);
    DocLockChkAssert(DocLock(doc));
    Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
    try DocUnlock(doc);
    catch {
      caught=Fs->except_ch=='Break';
      Fs->catch_except=TRUE;
    }
    DocLockChkAssert(caught && !doc->owning_task && !doc->locked_flags &&
      !Bt(&Fs->task_flags,TASKf_BREAK_LOCKED) &&
      !Bt(&Fs->task_flags,TASKf_PENDING_BREAK));
    hash=(hash^caught)*0x100000001B3;
  } catch {
    if (task && TaskValidate(task)) Kill(task);
    BEqu(&Fs->task_flags,TASKf_BREAK_LOCKED,Bt(&flags,TASKf_BREAK_LOCKED));
    BEqu(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC,
      Bt(&flags,TASKf_BREAK_TO_SHIFT_ESC));
    BEqu(&Fs->task_flags,TASKf_PENDING_BREAK,Bt(&flags,TASKf_PENDING_BREAK));
    Free(doc);
  }
  BEqu(&Fs->task_flags,TASKf_BREAK_LOCKED,Bt(&flags,TASKf_BREAK_LOCKED));
  BEqu(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC,
    Bt(&flags,TASKf_BREAK_TO_SHIFT_ESC));
  BEqu(&Fs->task_flags,TASKf_PENDING_BREAK,Bt(&flags,TASKf_PENDING_BREAK));
  Free(doc);
  "DocLock:%016X:%d%d%d\n",hash,doc_lock_started,
    doc_lock_acquired,doc_lock_done;
}

DocLockChk;
