import U0 RecalcAbortMark(I64 phase);

U0 RecalcAbort()
{
  CDoc *doc;
  I64 error=0,marker;
  U8 *except;
  RecalcWindow(0);
  doc=RecalcNew;
  RecalcEntry(doc,DOCT_WORD_WRAP,,1);
  RecalcEntry(doc,DOCT_TEXT,"alpha beta gamma delta");
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  marker=doc->flags&1<<DOCf_BREAK_UNLOCKED;
  except=Fs->next_except;
  RecalcAbortMark(0);
  try DocRecalc(doc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  RecalcAbortMark(1);
  if (error!='Break' || doc->owning_task || doc->locked_flags ||
	doc->flags&1<<DOCf_BREAK_UNLOCKED!=marker ||
	Bt(&Fs->task_flags,TASKf_BREAK_LOCKED) ||
	Bt(&Fs->task_flags,TASKf_PENDING_BREAK) ||
	Fs->next_except!=except) throw('RecalcBk');
  if (!DocRecalc(doc)) throw('RecalcRt');
  RecalcDel(doc);
}
