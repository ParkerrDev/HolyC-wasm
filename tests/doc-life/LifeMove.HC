U0 LifeMove()
{
  CDoc *doc,*old_put=Fs->put_doc;
  CDocEntry *entry;
  I64 seed,kind,op,held,valid,break_flags;
  recalc_hash=14695981039346656037;recalc_cnt=0;
  for (valid=0;valid<2;valid++)
    for (seed=0;seed<16;seed++)
      for (kind=0;kind<4;kind++)
	for (op=0;op<2;op++)
	  for (held=0;held<2;held++) {
	    RecalcWindow(seed);
	    doc=RecalcNew;
	    if (!valid) doc->doc_signature=0;
	    doc->flags=kind*DOCF_FORM;
	    RecalcEntry(doc,DOCT_WORD_WRAP,,1);
	    RecalcEntry(doc,DOCT_INDENT,,1);
	    RecalcEntry(doc,DOCT_TEXT,"before middle after");
	    entry=RecalcEntry(doc,DOCT_LINK,"jump",,DOCEF_LINK);
	    if (seed&1) entry->de_flags|=DOCEF_SKIP_IN_FORM;
	    RecalcEntry(doc,DOCT_NEW_LINE);
	    RecalcEntry(doc,DOCT_BTTN,"button");
	    RecalcEntry(doc,DOCT_INDENT,,1);
	    doc->cur_entry=entry;doc->cur_col=seed-3;
	    doc->line_start_col=seed-7;doc->top_line_num=seed-4;
	    BEqu(&Fs->task_flags,TASKf_BREAK_LOCKED,seed&4);
	    if (held) DocLock(doc);
	    break_flags=Bt(&Fs->task_flags,TASKf_BREAK_LOCKED);
	    Fs->put_doc=doc;
	    if (op) {
	      if (seed&2 && valid) DocBottom;
	      else DocBottom(doc);
	    } else {
	      if (seed&2 && valid) DocTop;
	      else DocTop(doc);
	    }
	    if (Bt(&Fs->task_flags,TASKf_BREAK_LOCKED)!=break_flags)
	      throw('LifeLock');
	    RecalcState(doc);
	    if (held) DocUnlock(doc);
	    Fs->put_doc=old_put;
	    RecalcDel(doc);BreakUnlock;
	  }
  Fs->put_doc=NULL;
  DocTop;DocBottom;
  Fs->put_doc=old_put;
  "LifeMove:%016X:%d\n",recalc_hash,recalc_cnt;
}

LifeMove;
