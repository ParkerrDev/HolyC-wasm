I64 clear_reject_heap=0;

U0 ClearRejectMark(I64 phase)
{
  if (!phase) clear_reject_heap=Fs->data_heap->used_u8s;
  else if (Fs->data_heap->used_u8s!=clear_reject_heap) throw('ClrLeak');
}
