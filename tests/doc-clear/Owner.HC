CDoc *clear_owner_doc=NULL;
Bool clear_owner_done=FALSE;

U0 ClearOwnerWait(U8 *)
{
  while (TRUE) Yield;
}

U0 ClearOwnerBody(U8 *)
{
  DocClear(clear_owner_doc);
  clear_owner_done=TRUE;
  while (TRUE) Yield;
}

U0 ClearOwnerTest()
{
  CTask *owner,*caller;
  CDocEntry *entry;
  I64 before,i,cnt=0;
  RecalcWindow(0);
  owner=Spawn(&ClearOwnerWait,NULL,"Doc owner");
  before=owner->data_heap->used_u8s;
  for (i=0;i<3;i++) {
    clear_owner_doc=RecalcNew(owner);
    RecalcEntry(clear_owner_doc,DOCT_WORD_WRAP,,1);
    RecalcEntry(clear_owner_doc,DOCT_TEXT,
	  "held text remains owned after wrapping",,DOCEF_HOLD);
    RecalcEntry(clear_owner_doc,DOCT_TEXT,"removed");
    clear_owner_done=FALSE;
    caller=Spawn(&ClearOwnerBody,NULL,"Clear");
    while (!clear_owner_done) Yield;
    Kill(caller);
    entry=clear_owner_doc->head.next;
    while (entry!=clear_owner_doc) {
      if (MHeapCtrl(entry)->mem_task!=owner ||
	    entry->tag && MHeapCtrl(entry->tag)->mem_task!=owner)
	throw('ClrOwner');
      cnt++;entry=entry->next;
    }
    DocClear(clear_owner_doc,TRUE);
    RecalcDel(clear_owner_doc);clear_owner_doc=NULL;
    if (owner->data_heap->used_u8s!=before) throw('ClrLeak');
  }
  Kill(owner);
  "ClearOwner:3:%d\n",cnt;
}

ClearOwnerTest;
