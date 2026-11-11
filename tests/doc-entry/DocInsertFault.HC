CDoc *insert_doc;
CDocEntry *insert_src,*insert_pending,insert_saved;
Bool insert_held;

U0 DocInsertFaultSetup(Bool held)
{
  insert_doc=DocChkNew;
  insert_doc->head.type=DOCT_ERROR;
  insert_src=DocInsertEntry(insert_doc,DOCT_TEXT,"ABCDEFG");
  insert_src->x=17;
  insert_src->y=31;
  insert_doc->cur_entry=insert_src;
  insert_doc->cur_col=3;
  insert_pending=CAlloc(sizeof(CDocEntry));
  insert_pending->next=insert_pending->last=insert_pending;
  insert_pending->type=DOCT_TAB;
  MemCpy(&insert_saved,insert_pending,sizeof(CDocEntry));
  insert_held=held;
  if (held) DocLock(insert_doc);
}

I64 DocInsertFaultTrial()
{
  I64 error=0;
  try
    DocInsEntry(insert_doc,insert_pending);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  DocChkAssert(Bt(&insert_doc->locked_flags,DOClf_LOCKED)==insert_held &&
	!(insert_doc->owning_task==Fs ^^ insert_held));
  if (error) {
    DocChkAssert(insert_doc->head.next==insert_src &&
	insert_doc->head.last==insert_src && insert_src->next==insert_doc &&
	insert_src->last==insert_doc && insert_doc->cur_entry==insert_src &&
	insert_doc->cur_col==3 && !StrCmp(insert_src->tag,"ABCDEFG") &&
	insert_src->max_col==7 &&
	!MemCmp(insert_pending,&insert_saved,sizeof(CDocEntry)));
  } else {
    DocChkAssert(!StrCmp(insert_src->tag,"ABC") &&
	insert_src->next==insert_pending &&
	!StrCmp(insert_pending->next->tag,"DEFG") &&
	insert_doc->cur_entry==insert_pending->next && !insert_doc->cur_col);
  }
  return error;
}

U0 DocInsertFaultDone()
{
  CDocEntry *doc_e=insert_doc->head.next,*next;
  if (insert_pending->next==insert_pending)
    Free(insert_pending);
  while (doc_e!=insert_doc) {
    next=doc_e->next;
    DocEntryDel(insert_doc,doc_e);
    doc_e=next;
  }
  if (insert_held) DocUnlock(insert_doc);
  Free(insert_doc);
}
