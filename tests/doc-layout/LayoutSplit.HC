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
