U0 LayoutOwnerWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

U0 LayoutOwner()
{
  CTask *child=Spawn(&LayoutOwnerWait,,,,Fs);
  CDoc *doc;
  CDocEntry *entry,*tmpde,*best;
  U8 *link;
  I64 mode,k,col=0;
  for (mode=0;mode<3;mode++) {
    doc=LayoutDocNew(child);
    entry=LayoutEntry(doc,DOCT_TEXT,"abc defgh");
    LayoutEntry(doc,DOCT_TEXT," second");
    entry->de_flags|=DOCEF_LINK;
    link=DocEntryLink(doc,entry);
    if (MHeapCtrl(link)->mem_task!=child) throw('LinkHeap');
    Free(link);
    entry->de_flags&=~DOCEF_LINK;
    doc->cur_entry=entry;doc->cur_col=7;
    k=StrLen(entry->tag);
    switch (mode) {
      case 0:
	DocSplitTag(doc,entry,3,0,0,DOCT_MARKER);
	break;
      case 1:
	DocWordWrapAdd(doc,entry,&k,0,3,0,0);
	break;
      case 2:
	best=entry;
	DocWordWrapDel(doc,entry,TRUE,FALSE,0,79,&best,&col);
	break;
    }
    tmpde=doc->head.next;
    while (tmpde!=doc) {
      if (MHeapCtrl(tmpde)->mem_task!=child) throw('EntryOwn');
      if (tmpde->tag && MHeapCtrl(tmpde->tag)->mem_task!=child)
	throw('TagOwner');
      tmpde=tmpde->next;
    }
    LayoutDocDel(doc);
  }
  Kill(child);
  "LayoutOwner:3\n";
}

LayoutOwner;
