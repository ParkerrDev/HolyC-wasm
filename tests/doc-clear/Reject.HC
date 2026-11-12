import U0 ClearRejectMark(I64 phase);

U0 ClearReject()
{
  CDoc *doc;
  CDocEntry *entry;
  U8 *except;
  I64 mode,held,holds,before,error,cnt=0,task_flags;
  RecalcWindow(0);
  for (mode=0;mode<6;mode++) for (held=0;held<2;held++)
    for (holds=0;holds<2;holds++) {
      doc=RecalcNew;
      entry=RecalcEntry(doc,DOCT_TEXT,"before");
      doc->cur_entry=entry;doc->cur_col=2;
      doc->top_line_num=7;doc->line_start_col=3;
      if (mode>=4) {
	doc->flags=mode-3;
	RecalcEntry(doc,DOCT_HIGHLIGHT,,1);
      }
      switch (mode) {
	case 0:
	  RecalcEntry(doc,DOCT_HIGHLIGHT,,1);
	  break;
	case 1:
	  RecalcEntry(doc,DOCT_PAGE_LEN,,100);
	  RecalcEntry(doc,DOCT_HEADER,,70);
	  RecalcEntry(doc,DOCT_HEADER,,0);
	  RecalcEntry(doc,DOCT_PAGE_LEN,,66);
	  break;
	case 2:
	  doc->flags|=DOCF_HAS_SONG;
	  break;
	case 3:
	  entry->de_flags|=DOCEF_TAG_CB;
	  break;
      }
      if (held) DocLock(doc);
      recalc_hash=0xCBF29CE484222325;RecalcState(doc);before=recalc_hash;
      except=Fs->next_except;task_flags=Fs->task_flags;error=0;
      ClearRejectMark(0);
      try DocClear(doc,holds);
      catch {
	error=Fs->except_ch;
	Fs->catch_except=TRUE;
      }
      ClearRejectMark(1);
      recalc_hash=0xCBF29CE484222325;RecalcState(doc);
      if (error!='DocHigh' && error!='DocPage' &&
	    error!='DocMode' && error!='DocCaps') throw('ClrCaps');
      if (Fs->next_except!=except || task_flags!=Fs->task_flags ||
	    recalc_hash!=before) throw('ClrState');
      if (held) DocUnlock(doc);
      RecalcDel(doc);cnt++;
    }
  "ClearReject:%d\n",cnt;
}

ClearReject;
