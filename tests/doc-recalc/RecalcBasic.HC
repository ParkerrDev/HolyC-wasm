U0 RecalcBasic()
{
  CDoc *doc;
  CDocEntry *first,*entry;
  I64 seed,kind,pass;
  recalc_hash=14695981039346656037;
  recalc_cnt=0;
  for (seed=0;seed<16;seed++)
    for (kind=0;kind<8;kind++) {
      RecalcWindow(seed);
      doc=RecalcNew;
      if (kind&1) doc->flags|=DOCF_BORDER_DOC;
      if (kind&2) doc->flags|=DOCF_SIZE_MIN;
      if (kind&4) RecalcEntry(doc,DOCT_WORD_WRAP,,1);
      first=RecalcEntry(doc,DOCT_TEXT,"alpha ");
      RecalcEntry(doc,DOCT_FOREGROUND,,seed%16);
      RecalcEntry(doc,DOCT_TEXT,"beta",,DOCEF_BLINK);
      RecalcEntry(doc,DOCT_TAB);
      RecalcEntry(doc,DOCT_NEW_LINE);
      RecalcEntry(doc,DOCT_INDENT,,seed%5-2);
      RecalcEntry(doc,DOCT_TEXT,
	    " gamma abcdefgh ijklmnop qrstuv wxyz");
      entry=RecalcEntry(doc,DOCT_CURSOR_MOVEMENT,,2);
      entry->cursor_y_offset=seed%7-3;
      if (seed&1) entry->de_flags|=DOCEF_PAGE_REL_Y|DOCEF_TOP_Y;
      RecalcEntry(doc,DOCT_CURSOR);
      RecalcEntry(doc,DOCT_LINK,"link");
      RecalcEntry(doc,DOCT_BTTN,"go");
      RecalcEntry(doc,DOCT_TEXT,"");
      entry=RecalcEntry(doc,DOCT_TEXT,"Tail.");
      if (seed&2) doc->cur_entry=first;
      else if (seed&4) doc->cur_entry=entry;
      doc->cur_col=seed%9;
      doc->line_start_col=seed*3-10;
      doc->top_line_num=seed-7;
      for (pass=0;pass<2;pass++) {
	if (pass) {
	  doc->old_win_top=Fs->win_top;doc->old_win_bottom=Fs->win_bottom;
	  doc->old_win_left=Fs->win_left;doc->old_win_right=Fs->win_right;
	  doc->old_cur_entry=doc->cur_entry;doc->old_cur_col=doc->cur_col;
	}
	if (!DocRecalc(doc)) throw('Recalc');
	RecalcState(doc);
      }
      RecalcDel(doc);
    }
  "RecalcBasic:%016X:%d\n",recalc_hash,recalc_cnt;
}

RecalcBasic;
