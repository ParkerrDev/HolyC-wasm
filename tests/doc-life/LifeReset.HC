U0 LifeReset()
{
  CDoc *doc,*old_put=Fs->put_doc;
  U8 *head,*data;
  I64 seed,old,valid,held,break_flags;
  recalc_hash=14695981039346656037;recalc_cnt=0;
  for (seed=0;seed<16;seed++)
    for (old=0;old<2;old++)
      for (valid=0;valid<2;valid++)
	for (held=0;held<2;held++) {
	  RecalcWindow(seed);
	  doc=RecalcNew;
	  LifeFill(doc,seed,old);
	  if (!old) {
	    doc->head.next=doc->head.last=NULL;
	    doc->bin_head.next=doc->bin_head.last=NULL;
	    doc->undo_head.next=doc->undo_head.last=NULL;
	    doc->cur_entry=NULL;
	  }
	  if (seed&1) StrCpy(doc->filename.name,"Source.HC");
	  if (!valid) {
	    doc->doc_signature=0;
	    doc->win_task=NULL;doc->max_entries=-7;
	  }
	  head=doc->head.tag;data=doc->user_put_data;
	  BEqu(&Fs->task_flags,TASKf_BREAK_LOCKED,seed&4);
	  if (held) DocLock(doc);
	  break_flags=Bt(&Fs->task_flags,TASKf_BREAK_LOCKED);
	  Fs->put_doc=doc;
	  if (seed&2 && valid) DocRst(NULL,old);
	  else DocRst(doc,old);
	  if (head!=doc->head.tag || data!=doc->user_put_data ||
		doc->left_click_link!=&LifeLink ||
		doc->right_click_link!=&LifeLink) throw('LifeKeep');
	  if (Bt(&Fs->task_flags,TASKf_BREAK_LOCKED)!=break_flags)
	    throw('LifeLock');
	  LifeState(doc);
	  if (held) DocUnlock(doc);
	  Fs->put_doc=old_put;
	  Free(doc->dollar_buf);Free(doc->find_replace);Free(doc);BreakUnlock;
	}
  Fs->put_doc=NULL;DocRst(NULL,TRUE);Fs->put_doc=old_put;
  "LifeReset:%016X:%d\n",recalc_hash,recalc_cnt;
}

LifeReset;
