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
I64 layout_fields[6]={offset(CDocEntry.aux_str),
  offset(CDocEntry.define_str),offset(CDocEntry.html_link),
  offset(CDocEntry.left_macro),offset(CDocEntry.right_macro),
  offset(CDocEntry.bin_ptr_link)};
I64 layout_flags[6]={DOCEF_AUX_STR,DOCEF_DEFINE,DOCEF_HTML_LINK,
  DOCEF_LEFT_MACRO,DOCEF_RIGHT_MACRO,DOCEF_BIN_PTR_LINK};

U0 LayoutBorrowed()
{
  CDoc *doc;
  CDocEntry *entry,*marker,*clone;
  CDocBin *bin;
  U8 **ptr,**other;
  I64 mask,i;
  layout_hash=14695981039346656037;
  layout_cnt=0;
  for (mask=0;mask<128;mask++) {
    doc=LayoutDocNew;
    entry=LayoutEntry(doc,DOCT_TEXT,"abcdef");
    for (i=0;i<6;i++)
      if (Bt(&mask,i)) {
	ptr=entry(U8 *)+layout_fields[i];
	*ptr=StrNew("owned");
	entry->de_flags|=layout_flags[i];
      }
    if (mask&64) {
      bin=CAlloc(sizeof(CDocBin));
      bin->use_cnt=2;
      bin->data=StrNew("binary");
      bin->tag=StrNew("tag");
      QueIns(bin,doc->bin_head.last);
      entry->bin_data=bin;
      entry->de_flags|=DOCEF_HAS_BIN;
    }
    marker=DocSplitTag(doc,entry,3,0,0,DOCT_CURSOR);
    clone=marker->next;
    if (clone==doc || clone->de_flags&DOCEG_HAS_ALLOC!=DOCEF_TAG ||
	StrCmp(entry->tag,"abc") || StrCmp(clone->tag,"def"))
      throw('LayClone');
    LayoutMix(clone->de_flags);
    for (i=0;i<6;i++) {
      ptr=entry(U8 *)+layout_fields[i];
      other=clone(U8 *)+layout_fields[i];
      if (*ptr!=*other) throw('LayAlias');
      LayoutMix(!!*other);
    }
    if (mask&64) {
      if (clone->bin_data!=bin || bin->use_cnt!=2) throw('LayCount');
      DocEntryDel(doc,clone);
      if (bin->use_cnt!=1) throw('LayBin');
      LayoutMix(bin->use_cnt);
    }
    LayoutDocDel(doc);
    layout_cnt++;
  }
  "LayoutBorrowed:%016X:%d\n",layout_hash,layout_cnt;
}

LayoutBorrowed;
