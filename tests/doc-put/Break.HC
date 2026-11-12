U0 PutBreak()
{
  CDoc *doc;
  U8 *except;
  I64 error=0;
  RecalcWindow(0);
  recalc_hash=0xCBF29CE484222325;recalc_cnt=0;
  doc=RecalcNew;
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  except=Fs->next_except;
  try DocPrint(doc,"committed\n$$RED$$");
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error!='Break' || doc->locked_flags || doc->owning_task ||
	Bt(&Fs->task_flags,TASKf_BREAK_LOCKED) ||
	Bt(&Fs->task_flags,TASKf_PENDING_BREAK) ||
	Fs->next_except!=except) throw('PutBreak');
  RecalcState(doc);
  DocPrint(doc,"retry");RecalcState(doc);
  RecalcDel(doc);
  "PutBreak:%016X:%d\n",recalc_hash,recalc_cnt;
}

PutBreak;
