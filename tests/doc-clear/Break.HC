U0 ClearBreak()
{
  CDoc *doc;
  U8 *except;
  I64 error=0;
  RecalcWindow(0);
  recalc_hash=0xCBF29CE484222325;recalc_cnt=0;
  doc=RecalcNew;
  RecalcEntry(doc,DOCT_TEXT,"held",,DOCEF_HOLD);
  RecalcEntry(doc,DOCT_TEXT,"removed");
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  except=Fs->next_except;
  try DocClear(doc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error!='Break' || doc->locked_flags || doc->owning_task ||
	Bt(&Fs->task_flags,TASKf_BREAK_LOCKED) ||
	Bt(&Fs->task_flags,TASKf_PENDING_BREAK) ||
	Fs->next_except!=except) throw('ClrBreak');
  RecalcState(doc);
  DocClear(doc,TRUE);RecalcState(doc);
  RecalcDel(doc);
  "ClearBreak:%016X:%d\n",recalc_hash,recalc_cnt;
}

ClearBreak;
