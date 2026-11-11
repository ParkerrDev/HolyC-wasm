U0 AllocSpan()
{
  I64 i;
  U8 *ptr;
  for (i=0;i<130;i++) {
    ptr=MAlloc(i);
    "%d %d %d\n",i,MSize(ptr),MSize2(ptr);
    Free(ptr);
  }
}

AllocSpan;
