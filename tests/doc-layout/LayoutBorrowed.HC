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
