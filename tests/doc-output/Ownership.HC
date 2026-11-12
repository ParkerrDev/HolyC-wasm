U0 ParseErrorOwned()
{
  CDoc *doc=CAlloc(sizeof(CDoc));
  CDocEntry *entry;
  U8 *tag;
  I64 before,delta,span;
  doc->mem_task=Fs;
  QueInit(doc);
  before=Fs->data_heap->used_u8s;
  entry=PrsDollarCmd(doc,"TX,\"owned\",A=");
  if (entry->type!=DOCT_ERROR || entry->de_flags) throw('PrsError');
  tag=entry->tag;
  span=MSize2(tag);
  QueIns(entry,doc);
  DocEntryDel(doc,entry);
  delta=Fs->data_heap->used_u8s-before;
  if (delta!=span) throw('PrsLeak');
  "ErrorOwned:%d:%d\n",ToBool(tag),ToBool(delta);
  Free(tag);
  Free(doc);
}

ParseErrorOwned;
