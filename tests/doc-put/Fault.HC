import U0 PutFaultMark(I64 phase,CTask *owner,I64 error);
import U0 PutFaultPtr(U8 *ptr,CTask *owner);

Bool PutFaultBreak(Bool pending=FALSE)
{
  if (!Bt(&Fs->task_flags,TASKf_BREAK_LOCKED)) return FALSE;
  if (pending) {
    Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
    Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  }
  return TRUE;
}

U0 PutWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

I64 PutHash(CDoc *doc)
{
  I64 old_hash=recalc_hash,old_cnt=recalc_cnt,res;
  recalc_hash=0xCBF29CE484222325;
  RecalcState(doc);
  res=recalc_hash;
  recalc_hash=old_hash;recalc_cnt=old_cnt;
  return res;
}

I64 PutFault(I64 mode,Bool foreign,Bool inherited,Bool fmt)
{
  CTask *child=NULL,*owner=Fs,*lock_owner;
  CDoc *doc;
  CDocEntry *entry;
  U8 *text="one\ttwo\nthree",*st,*except;
  I64 error=0,before,lock_flags,task_flags;
  RecalcWindow(0);
  if (foreign) owner=child=Spawn(&PutWait,,,,Fs);
  doc=RecalcNew(owner);
  entry=RecalcEntry(doc,DOCT_TEXT|0x3C00,"before");
  doc->cur_entry=entry;doc->cur_col=2;
  RecalcEntry(doc,DOCT_SOFT_NEW_LINE);
  RecalcEntry(doc,DOCT_TEXT|0x3C00,"after");
  switch (mode) {
    case 1:
      text="start$$TR,\"tree\",A=\"aux\",LM=\"run;\"$$end";
      break;
    case 2:
      text="aa\tbb";
      doc->flags|=DOCF_NO_CURSOR;
      break;
    case 3:
      text="before$$$$after$$CB,\"check\"$$";
      break;
    case 4:
      text="unpublished$$FG,1$$";
      break;
    case 5:
      text="unpublished$$TX,\"owned\" #define X 1$$";
      break;
  }
  st=StrNew(text);
  if (mode==2) st[1]=CH_CURSOR;
  if (inherited) DocLock(doc);
  before=PutHash(doc);
  lock_owner=doc->owning_task;lock_flags=doc->locked_flags;
  task_flags=Fs->task_flags&
	(1<<TASKf_BREAK_LOCKED|1<<TASKf_PENDING_BREAK);
  except=Fs->next_except;
  PutFaultMark(0,owner,0);
  try {
    if (fmt) DocPrint(doc,"%s",st);
    else DocPutS(doc,st);
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  PutFaultMark(1,owner,error);
  if (error && PutHash(doc)!=before) throw('PutState');
  if (doc->owning_task!=lock_owner || doc->locked_flags!=lock_flags ||
	Fs->task_flags&(1<<TASKf_BREAK_LOCKED|1<<TASKf_PENDING_BREAK)
	!=task_flags || Fs->next_except!=except) throw('PutLock');
  if (mode==2) st[1]='a';
  if (StrCmp(st,text)) throw('PutInput');
  entry=doc->head.next;
  while (entry!=doc) {
    PutFaultPtr(entry,owner);PutFaultPtr(entry->tag,owner);
    if (MSize(entry)>=sizeof(CDocEntry)) {
      PutFaultPtr(entry->aux_str,owner);
      PutFaultPtr(entry->define_str,owner);
      PutFaultPtr(entry->html_link,owner);
      PutFaultPtr(entry->left_macro,owner);
      PutFaultPtr(entry->right_macro,owner);
    }
    entry=entry->next;
  }
  if (inherited) DocUnlock(doc);
  RecalcDel(doc);
  Free(st);
  if (child) Kill(child);
  return error;
}

Raw(OFF);
