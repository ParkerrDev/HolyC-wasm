I64 recalc_live=0;

U0 RecalcRejectMark(I64 phase)
{
  if (!phase) recalc_live=Fs->data_heap->used_u8s;
  else if (Fs->data_heap->used_u8s!=recalc_live) throw('RecalcAl');
}
