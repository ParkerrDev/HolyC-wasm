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
