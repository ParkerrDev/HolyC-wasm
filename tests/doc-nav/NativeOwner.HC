U0 DocOwnerWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

U0 NativeOwner()
{
  CDoc doc;
  CDocEntry *entry;
  CTask *child=Spawn(&DocOwnerWait,,,,Fs),*owner;
  I64 i;
  MemSet(&doc,0,sizeof(CDoc));
  for (i=0;i<3;i++) {
    switch (i) {
      case 0:
	owner=Fs;
	doc.mem_task=NULL;
	break;
      case 1:
	owner=doc.mem_task=Fs;
	break;
      case 2:
	owner=doc.mem_task=child;
	break;
    }
    entry=DocEntryNewBase(&doc,DOCT_TEXT);
    if (MHeapCtrl(entry)->mem_task!=owner) throw('BaseOwn');
    Free(entry);
  }
  Kill(child);
  "NativeOwner:3\n";
}

NativeOwner;
