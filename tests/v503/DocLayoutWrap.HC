U64 layout_hash=0;
I64 layout_cnt=0;

U0 LayoutMix(I64 n)
{
  layout_hash=(layout_hash^n)*1099511628211;
}

U0 LayoutBytes(U8 *ptr,I64 size)
{
  I64 i;
  for (i=0;i<size;i++) LayoutMix(ptr[i]);
}

CDoc *LayoutDocNew(CTask *task=NULL)
{
  CDoc *doc=CAlloc(sizeof(CDoc));
  doc->doc_signature=DOC_SIGNATURE_VAL;
  doc->mem_task=task;
  doc->win_task=Fs;
  QueInit(&doc->head);
  QueInit(&doc->bin_head);
  doc->head.type=DOCT_ERROR;
  doc->cur_entry=&doc->head;
  return doc;
}

CDocEntry *LayoutEntry(CDoc *doc,I64 type,U8 *tag=NULL,
	I64 flags=0,Bool full=TRUE)
{
  CDocEntry *entry;
  I64 size=sizeof(CDocEntryBase);
  if (full) size=sizeof(CDocEntry);
  entry=CAlloc(size,doc->mem_task);
  entry->type=type;
  entry->de_flags=flags;
  entry->x=13;
  entry->y=-7;
  entry->page_line_num=9;
  entry->min_col=0;
  entry->user_data=91;
  entry->settings.left_margin=-2;
  entry->settings.page_len=66;
  entry->settings.cur_text_attr=0x37;
  if (tag) {
    entry->de_flags|=DOCEF_TAG;
    entry->tag=StrNew(tag,doc->mem_task);
    entry->max_col=StrLen(tag);
  }
  QueIns(entry,doc->head.last);
  return entry;
}

I64 LayoutIndex(CDoc *doc,CDocEntry *entry)
{
  CDocEntry *tmpde=doc->head.next;
  I64 i=0;
  if (entry==doc) return -1;
  if (!entry) return -2;
  while (tmpde!=doc) {
    if (tmpde==entry) return i;
    tmpde=tmpde->next;
    if (++i>16) throw('LayQueue');
  }
  throw('LayPtr');
}

U0 LayoutState(CDoc *doc)
{
  CDocEntry *entry=doc->head.next;
  I64 cnt=0,size;
  LayoutMix(doc->flags);
  LayoutMix(doc->x);LayoutMix(doc->y);LayoutMix(doc->page_line_num);
  LayoutMix(LayoutIndex(doc,doc->cur_entry));
  LayoutMix(doc->cur_col);
  while (entry!=doc) {
    if (entry->next->last!=entry || entry->last->next!=entry)
      throw('LayLinks');
    size=sizeof(CDocEntryBase);
    if (MSize(entry)>=sizeof(CDocEntry)) size=sizeof(CDocEntry);
    LayoutMix(size);
    LayoutBytes(&entry->type,size-offset(CDocEntry.type));
    if (entry->tag) {
      LayoutMix(StrLen(entry->tag));
      LayoutBytes(entry->tag,StrLen(entry->tag));
    } else
      LayoutMix(-1);
    entry=entry->next;
    if (++cnt>16) throw('LayQueue');
  }
  LayoutMix(cnt);
  layout_cnt++;
}

U0 LayoutDocDel(CDoc *doc)
{
  while (doc->head.next!=doc) DocEntryDel(doc,doc->head.next);
  Free(doc);
}

Raw(OFF);
U0 LayoutWrap()
{
  CDoc *doc;
  CDocEntry *entry,*added,*best,*tmpde;
  I64 prev,text,width,pos,mode,k,best_col,full,same,soft,limit;
  U8 *tag;
  layout_hash=14695981039346656037;
  layout_cnt=0;
  for (prev=0;prev<4;prev++)
    for (text=0;text<3;text++)
      for (width=-1;width<11;width++)
	for (pos=0;pos<3;pos++)
	  for (mode=0;mode<2;mode++) {
	    doc=LayoutDocNew;
	    LayoutEntry(doc,prev);
	    switch (text) {
	      case 0:
		tag="12345 abcdefgh";
		break;
	      case 1:
		tag="a b c d";
		break;
	      case 2:
		tag="ab\x1Fcd";
		break;
	    }
	    entry=LayoutEntry(doc,DOCT_TEXT,tag,mode*DOCEF_DEFINE);
	    LayoutEntry(doc,DOCT_NEW_LINE);
	    if (!pos) doc->cur_entry=entry;
	    else if (pos==1) doc->cur_entry=entry->next;
	    doc->cur_col=width-5;
	    k=StrLen(tag);
	    added=DocWordWrapAdd(doc,entry,&k,3,width,2,-1);
	    LayoutMix(k);LayoutMix(LayoutIndex(doc,added));
	    LayoutState(doc);
	    LayoutDocDel(doc);
	  }
  for (full=0;full<2;full++)
    for (same=0;same<2;same++)
      for (soft=0;soft<2;soft++)
	for (mode=0;mode<4;mode++)
	  for (pos=0;pos<4;pos++)
	    for (limit=0;limit<2;limit++) {
	      doc=LayoutDocNew;
	      entry=LayoutEntry(doc,DOCT_TEXT,"First",0);
	      if (mode&1) entry->de_flags|=DOCEF_SCROLLING_X;
	      entry->scroll_len=23;
	      if (soft) LayoutEntry(doc,DOCT_SOFT_NEW_LINE);
	      tmpde=LayoutEntry(doc,DOCT_TEXT," second",0);
	      tmpde->min_col=2;
	      if (mode&2) tmpde->type|=0x2200;
	      LayoutEntry(doc,DOCT_TEXT," third",0);
	      LayoutEntry(doc,DOCT_NEW_LINE);
	      best=entry;
	      for (k=0;k<pos;k++) best=best->next;
	      doc->cur_entry=best;doc->cur_col=3;
	      best_col=5;
	      k=DocWordWrapDel(doc,entry,full,same,0,limit*20,&best,
		    &best_col);
	      LayoutMix(k);LayoutMix(LayoutIndex(doc,best));
	      LayoutMix(best_col);LayoutState(doc);
	      LayoutDocDel(doc);
	    }
  "LayoutWrap:%016X:%d\n",layout_hash,layout_cnt;
}

LayoutWrap;
