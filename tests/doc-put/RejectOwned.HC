U0 PutRejectOwned()
{
  I64 before=Fs->data_heap->used_u8s;
  PutReject;
  if (Fs->data_heap->used_u8s!=before) throw('PutLeak');
  "PutRejectOwned:32:0\n";
}

PutRejectOwned;
