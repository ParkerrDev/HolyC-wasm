U0 Heap()
{
  U8 *a=CAlloc(37),*b,*zero=MAlloc(0),*other=MAlloc(0),buf[16];
  I64 i,bad=0;
  for (i=0;i<37;i++)
    if (a[i]) bad++;
  "%d %d %d\n",bad,zero!=other,a&7;
  "%d\n",MemSet(a,0xA5,37)-a;
  Free(a);
  b=CAlloc(37);
  bad=0;
  for (i=0;i<37;i++)
    if (b[i]) bad++;
  "%d\n",bad;
  for (i=0;i<16;i++) buf[i]=i;
  "%d\n",MemCpy(buf+2,buf,10)-buf;
  for (i=0;i<12;i++) "%02X",buf[i];
  '\n';
  for (i=0;i<16;i++) buf[i]=i;
  "%d\n",MemCpy(buf,buf+2,10)-buf;
  for (i=0;i<12;i++) "%02X",buf[i];
  '\n';
  Free(zero);Free(other);Free(b);Free(NULL);
}

Heap;
