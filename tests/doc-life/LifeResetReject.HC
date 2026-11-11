U0 LifeResetReject(I64 mode,Bool held)
{
  CDoc *doc=RecalcNew,copy;
  CDocEntry entry;
  I64 error=0,task_flags;
  U8 *except;
  RecalcWindow(0);LifeFill(doc,9,TRUE);
  if (mode) doc->max_entries=-1;
  else doc->win_task=NULL;
  if (held) DocLock(doc);
  MemCpy(&copy,doc,sizeof(CDoc));
  MemCpy(&entry,doc->head.next,sizeof(CDocEntry));
  task_flags=Fs->task_flags;except=Fs->next_except;
  RecalcRejectMark(0);
  try DocRst(doc,TRUE);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  RecalcRejectMark(1);
  if (mode && error!='DocLimit' || !mode && error!='DocMode' ||
	task_flags!=Fs->task_flags || except!=Fs->next_except ||
	MemCmp(&copy,doc,sizeof(CDoc)) ||
	MemCmp(&entry,doc->head.next,sizeof(CDocEntry))) throw('LifeMut');
  DocDel(doc);
}

U0 LifeRejectRun()
{
  I64 op,i,held;
  for (op=0;op<2;op++) {
    life_op=op;
    for (i=6;i<=46;i++)
      for (held=0;held<2;held++) RecalcReject(i,held);
  }
  for (i=0;i<2;i++)
    for (held=0;held<2;held++) LifeResetReject(i,held);
  "LifeReject:168\n";
}

Raw(OFF);
LifeRejectRun;
