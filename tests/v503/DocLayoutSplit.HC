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
U0 LayoutSplit()
{
  CDoc *doc;
  CDocEntry *entry,*marker;
  I64 i,pos,kind,full;
  layout_hash=14695981039346656037;
  layout_cnt=0;
  for (full=0;full<2;full++)
    for (kind=0;kind<3;kind++)
      for (i=0;i<7;i++)
	for (pos=0;pos<3;pos++) {
	  doc=LayoutDocNew;
	  LayoutEntry(doc,DOCT_NEW_LINE);
	  entry=LayoutEntry(doc,DOCT_TEXT|0x3500,"abc def",DOCEF_LINK,
		full);
	  entry->type=DOCT_TEXT|0x3500;
	  if (kind==1) entry->type=DOCT_LINK|0x3500;
	  if (kind==2) entry->de_flags|=DOCEF_HIGHLIGHT;
	  LayoutEntry(doc,DOCT_NEW_LINE);
	  if (!pos) doc->cur_entry=entry;
	  else if (pos==1) doc->cur_entry=entry->next;
	  doc->cur_col=i;
	  marker=DocSplitTag(doc,entry,i*2,-11,29,DOCT_MARKER);
	  LayoutMix(LayoutIndex(doc,marker));
	  LayoutState(doc);
	  LayoutDocDel(doc);
	}
  "LayoutSplit:%016X:%d\n",layout_hash,layout_cnt;
}

LayoutSplit;
