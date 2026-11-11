U0 RecalcOwnerWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

U0 RecalcOwner()
{
  CTask *child=Spawn(&RecalcOwnerWait,,,,Fs);
  CDoc *doc;
  CDocEntry *entry;
  I64 cnt=0;
  RecalcWindow(0);
  doc=RecalcNew(child);
  RecalcEntry(doc,DOCT_WORD_WRAP,,1);
  RecalcEntry(doc,DOCT_TEXT,"one two three four five six seven eight");
  if (!DocRecalc(doc)) throw('Recalc');
  if (MHeapCtrl(doc)->mem_task!=child) throw('RecalcOw');
  entry=doc->head.next;
  while (entry!=doc) {
    if (MHeapCtrl(entry)->mem_task!=child) throw('RecalcOw');
    if (entry->tag && MHeapCtrl(entry->tag)->mem_task!=child)
      throw('RecalcOw');
    cnt++;
    entry=entry->next;
  }
  RecalcDel(doc);Kill(child);
  "RecalcOwner:%d\n",cnt;
}

RecalcOwner;
