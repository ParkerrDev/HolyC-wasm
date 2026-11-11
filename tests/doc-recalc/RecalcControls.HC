U0 RecalcControls()
{
  CDoc *doc;
  CDocEntry *entry;
  I64 type,seed,flags,attr,i;
  recalc_hash=14695981039346656037;
  recalc_cnt=0;
  for (type=0;type<=DOCT_BTTN;type++)
    for (seed=0;seed<16;seed++) {
      RecalcWindow(seed);
      doc=RecalcNew;
      doc->flags=DOCF_PLAIN_TEXT;
      if (seed&1) doc->flags|=DOCF_NO_CURSOR;
      if (seed&2) doc->flags|=DOCF_FORM;
      doc->line_start_col=seed-11;
      doc->top_line_num=seed-4;
      flags=0;
      if (seed&1) flags|=DOCEF_WIN_REL;
      if (seed&2) flags|=DOCEF_HOLD;
      if (seed&4) flags|=DOCEF_FILTER_SKIP;
      if (seed&8) flags|=DOCEF_SKIP;
      attr=seed%5-2;
      if (type==DOCT_PAGE_LEN) attr=20;
      if (type==DOCT_HEADER || type==DOCT_FOOTER) attr=seed%4;
      if (DOCT_FOREGROUND<=type<=DOCT_DFT_BACKGROUND) attr=seed;
      if (type==DOCT_RIGHT_MARGIN) attr=11;
      if (type==DOCT_WORD_WRAP || type==DOCT_HIGHLIGHT) attr=0;
      RecalcEntry(doc,DOCT_TEXT,"before");
      entry=RecalcEntry(doc,type,"tag",attr,flags);
      doc->cur_entry=entry;
      doc->cur_col=seed%4;
      RecalcEntry(doc,DOCT_TAB);
      RecalcEntry(doc,DOCT_NEW_LINE);
      if (type==DOCT_CLEAR)
	RecalcEntry(doc,DOCT_MARKER,,,DOCEF_HOLD);
      for (i=0;i<3;i++) {
	RecalcEntry(doc,DOCT_TEXT,"tail");
	RecalcEntry(doc,DOCT_NEW_LINE);
      }
      if (!DocRecalc(doc)) throw('Recalc');
      RecalcState(doc);
      RecalcDel(doc);
    }
  "RecalcControls:%016X:%d\n",recalc_hash,recalc_cnt;
}

RecalcControls;
