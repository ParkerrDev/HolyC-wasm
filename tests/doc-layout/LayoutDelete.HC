U0 LayoutDelete()
{
  CDoc *doc;
  CDocEntry *entries[4],*entry;
  I64 flags,mode,n,pos,i,mask;
  layout_hash=14695981039346656037;
  layout_cnt=0;
  for (flags=0;flags<16;flags++)
    for (mode=0;mode<3;mode++)
      for (n=-1;n<6;n++)
	for (pos=0;pos<5;pos++) {
	  doc=LayoutDocNew;
	  for (i=0;i<4;i++) {
	    mask=0;
	    if (Bt(&flags,i)) mask=DOCEF_HOLD;
	    if (Bt(&flags,3-i)) mask|=DOCEF_FILTER_SKIP;
	    entries[i]=entry=LayoutEntry(doc,DOCT_TEXT,"keep",mask);
	    entry->min_col=i+2;
	  }
	  if (pos<4) doc->cur_entry=entries[pos];
	  doc->cur_col=17;
	  if (!mode) DocDelToNum(doc,n);
	  else {
	    entry=doc;
	    if (0<=n<4) entry=entries[n];
	    DocDelToEntry(doc,entry,mode==2);
	  }
	  LayoutState(doc);
	  LayoutDocDel(doc);
	}
  "LayoutDelete:%016X:%d\n",layout_hash,layout_cnt;
}

LayoutDelete;
