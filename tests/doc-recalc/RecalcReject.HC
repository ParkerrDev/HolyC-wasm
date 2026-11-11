import U0 RecalcRejectMark(I64 phase);
I64 recalc_callbacks=0;

U8 *RecalcRejectedTag(CDoc *,CDocEntry *,CTask *)
{
  recalc_callbacks++;
  return StrNew("called");
}

U0 RecalcReject(I64 mode,Bool inherited)
{
  CDoc *doc=RecalcNew,copy;
  CDocEntry *entry=RecalcEntry(doc,DOCT_TEXT,"must stay"),node;
  I64 flags=0,error=0,expected,task_flags,i,state_hash;
  U8 *except;
  RecalcWindow(0);
  recalc_callbacks=0;
  switch (mode) {
    case 0: flags=RECALCt_FIND_CURSOR;break;
    case 1: flags=RECALCt_TO_SCRN;break;
    case 2: flags=RECALCF_HAS_CURSOR;break;
    case 3: flags=RECALCF_ADD_CURSOR;break;
    case 4: flags=RECALCF_TO_HTML;break;
    case 5: flags=0x10000;break;
    case 6...18: entry->type=DOCT_DATA+mode-6;break;
    case 19: entry->de_flags|=DOCEF_TAG_CB;
      entry->tag_cb=&RecalcRejectedTag;break;
    case 20: entry->de_flags|=DOCEF_DEFINE;break;
    case 21: entry->de_flags|=DOCEF_REFRESH_DATA;break;
    case 22: entry->de_flags|=DOCEF_TREE;break;
    case 23: entry->de_flags|=DOCEF_LST;break;
    case 24: entry->de_flags|=DOCEF_HAS_BIN;break;
    case 25: entry->de_flags|=DOCEF_HAS_BORDER;break;
    case 26: entry->de_flags|=DOCEF_SCROLLING_X;break;
    case 27: entry->de_flags|=DOCEF_REMALLOC_DATA;break;
    case 28: doc->flags|=DOCF_HAS_SONG;break;
    case 29: doc->win_task=NULL;break;
    case 30: StrCpy(doc->filename.name,"Source.HC");break;
    case 31: entry->type=DOCT_HIGHLIGHT;entry->attr=1;
      RecalcEntry(doc,DOCT_TEXT,"highlighted");break;
    case 32: Free(entry->tag);entry->tag=NULL;break;
    case 33: doc->settings_head.page_len=0;break;
    case 34: doc->settings_head.header=66;break;
    case 35: doc->settings_head.footer=66;break;
    case 36: entry->type=DOCT_PAGE_LEN;entry->attr=0;break;
    case 37: entry->type=DOCT_HEADER;entry->attr=66;break;
    case 38: entry->type=DOCT_FOOTER;entry->attr=66;break;
    case 39: doc->max_entries=-1;break;
    case 40:
    case 44:
    case 45:
      if (mode!=45) entry->de_flags|=DOCEF_HOLD;
      for (i=0;i<1025;i++) RecalcEntry(doc,DOCT_MARKER,,,DOCEF_HOLD);
      doc->max_entries=0;
      if (mode==44) doc->max_entries=2000;
      break;
    case 41:
      StrCpy(doc->filename.name,"Source.HC");
      entry->type=DOCT_HIGHLIGHT;entry->attr=0;
      RecalcEntry(doc,DOCT_CLEAR);
      RecalcEntry(doc,DOCT_TEXT,"source");
      break;
    case 42:
      entry->type=DOCT_HIGHLIGHT;entry->attr=1;
      entry->de_flags|=DOCEF_HOLD;
      RecalcEntry(doc,DOCT_HIGHLIGHT,,0);
      RecalcEntry(doc,DOCT_CLEAR);
      RecalcEntry(doc,DOCT_TEXT,"highlighted");
      break;
    case 46:
      Free(entry->tag);entry->tag=CAlloc(1101);
      MemSet(entry->tag,'x',1100);
      entry->de_flags|=DOCEF_HOLD;doc->max_entries=0;
      break;
    case 43:
      entry->type=DOCT_PAGE_LEN;entry->attr=100;
      RecalcEntry(doc,DOCT_CLEAR);
      RecalcEntry(doc,DOCT_HEADER,,70);
      RecalcEntry(doc,DOCT_TEXT,"page");
      break;
  }
  expected='DocCaps';
  if (mode<=5 || 28<=mode<=29) expected='DocMode';
  if (30<=mode<=31) expected='DocHigh';
  if (mode==32) expected='DocTag';
  if (33<=mode<=38) expected='DocPage';
  if (39<=mode<=40 || 44<=mode<=46) expected='DocLimit';
  if (41<=mode<=42) expected='DocHigh';
  if (mode==43) expected='DocPage';
  if (inherited) DocLock(doc);
  MemCpy(&copy,doc,sizeof(CDoc));MemCpy(&node,entry,sizeof(CDocEntry));
  task_flags=Fs->task_flags;except=Fs->next_except;
  recalc_hash=0;RecalcState(doc);state_hash=recalc_hash;
  RecalcRejectMark(0);
  try DocRecalc(doc,flags);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  RecalcRejectMark(1);
  recalc_hash=0;RecalcState(doc);
  if (state_hash!=recalc_hash || error!=expected || recalc_callbacks ||
	task_flags!=Fs->task_flags ||
	except!=Fs->next_except || MemCmp(&copy,doc,sizeof(CDoc)) ||
	MemCmp(&node,entry,sizeof(CDocEntry))) throw('RecalcMu');
  if (inherited) DocUnlock(doc);
  entry->type=DOCT_TEXT;
  entry->de_flags&=DOCEF_TAG|DOCEF_HOLD;
  RecalcDel(doc);
}
