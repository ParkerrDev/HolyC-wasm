import U0 LayoutFaultMark(I64 phase,CTask *owner,I64 nodes,I64 error);

CDoc *layout_doc=NULL;
CDocEntry *layout_entry=NULL;

U0 LayoutFaultWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

I64 LayoutFaultNodes()
{
  CDocEntry *entry=layout_doc->head.next;
  I64 n=0;
  while (entry!=layout_doc) {
    if (entry->next->last!=entry || entry->last->next!=entry)
      throw('LayChain');
    entry=entry->next;
    if (++n>8) throw('LayCount');
  }
  return n;
}

I64 LayoutFaultOp(I64 mode)
{
  CDoc saved;
  CDocEntry copy,*best=layout_entry,*entry;
  I64 error=0,k=StrLen(layout_entry->tag),col=9;
  U8 original[32],*link;
  MemCpy(&saved,layout_doc,sizeof(CDoc));
  MemCpy(&copy,layout_entry,sizeof(CDocEntry));
  StrCpy(original,layout_entry->tag);
  try {
    switch (mode) {
      case 0:
	DocSplitTag(layout_doc,layout_entry,3,11,17,DOCT_CURSOR);
	break;
      case 1:
      case 2:
	DocWordWrapAdd(layout_doc,layout_entry,&k,0,3,0,0);
	break;
      case 3:
	DocWordWrapDel(layout_doc,layout_entry,TRUE,FALSE,0,79,
	      &best,&col);
	break;
      case 4:
	link=DocEntryLink(layout_doc,layout_entry);
	if (!link || StrCmp(link,layout_entry->tag)) throw('LayLink');
	Free(link);
	break;
    }
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error && mode!=3)
    if (MemCmp(&saved,layout_doc,sizeof(CDoc)) ||
	MemCmp(&copy,layout_entry,sizeof(CDocEntry)) ||
	StrCmp(original,layout_entry->tag)) throw('LayMut');
  if (mode==3) {
    entry=layout_doc->head.next;
    if (entry!=layout_entry || entry->type!=DOCT_TEXT ||
	StrCmp(entry->tag,"abc defgh") &&
	StrCmp(entry->tag,"abc defgh second") &&
	StrCmp(entry->tag,"abc defgh second third")) throw('LayJoin');
  }
  LayoutFaultNodes;
  return error;
}

I64 LayoutFault(I64 mode,Bool foreign)
{
  CTask *child=NULL,*owner=Fs;
  I64 error;
  if (foreign) owner=child=Spawn(&LayoutFaultWait,,,,Fs);
  layout_doc=LayoutDocNew(owner);
  if (mode!=3) LayoutEntry(layout_doc,DOCT_TEXT,"before");
  layout_entry=LayoutEntry(layout_doc,DOCT_TEXT,"abc defgh");
  if (mode==2) layout_entry->de_flags|=DOCEF_DEFINE;
  if (mode==4) layout_entry->de_flags|=DOCEF_LINK;
  if (mode==3) {
    LayoutEntry(layout_doc,DOCT_TEXT," second");
    LayoutEntry(layout_doc,DOCT_TEXT," third");
  }
  LayoutEntry(layout_doc,DOCT_NEW_LINE);
  layout_doc->cur_entry=layout_entry;
  layout_doc->cur_col=7;
  LayoutFaultMark(0,owner,LayoutFaultNodes,0);
  error=LayoutFaultOp(mode);
  LayoutFaultMark(1,owner,LayoutFaultNodes,error);
  if (error && LayoutFaultOp(mode)) throw('LayRetry');
  LayoutDocDel(layout_doc);
  layout_doc=NULL;layout_entry=NULL;
  if (child) Kill(child);
  return error;
}
