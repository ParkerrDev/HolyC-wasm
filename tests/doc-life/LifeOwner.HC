I64 life_ready=0;

U0 LifeOwnerWait(U8 *)
{
  life_ready=1;
  while (TRUE) Sleep(1000);
}

U0 LifeOwnerPtr(U8 *ptr,CTask *owner)
{
  if (ptr && MHeapCtrl(ptr)->mem_task!=owner) throw('LifeOwn');
}

U0 LifeOwner()
{
  CTask *child;
  CDoc *doc;
  CDocEntry *entry;
  CDocBin *bin;
  CDocUndo *undo;
  I64 before,retained;
  RecalcWindow(0);
  life_ready=0;
  child=Spawn(&LifeOwnerWait,,,,Fs);
  while (!life_ready) Sleep(1);
  before=child->data_heap->used_u8s;
  doc=RecalcNew(child);LifeFill(doc,7,TRUE);
  LifeOwnerPtr(doc,child);
  LifeOwnerPtr(doc->dollar_buf,child);LifeOwnerPtr(doc->find_replace,child);
  entry=doc->head.next;
  while (entry!=doc) {
    LifeOwnerPtr(entry,child);LifeOwnerPtr(entry->tag,child);
    entry=entry->next;
  }
  bin=doc->bin_head.next;
  while (bin!=&doc->bin_head) {
    LifeOwnerPtr(bin,child);LifeOwnerPtr(bin->data,child);
    LifeOwnerPtr(bin->tag,child);bin=bin->next;
  }
  undo=doc->undo_head.next;
  while (undo!=&doc->undo_head) {
    LifeOwnerPtr(undo,child);LifeOwnerPtr(undo->body,child);
    undo=undo->next;
  }
  retained=MSize2(doc)+MSize2(doc->find_replace)+MSize2(doc->dollar_buf);
  DocRst(doc,TRUE);
  if (child->data_heap->used_u8s-before!=retained) throw('LifeKeep');
  DocDel(doc);
  if (child->data_heap->used_u8s!=before) throw('LifeLeak');
  Kill(child);
  "LifeOwner:3:0\n";
}

LifeOwner;
