I64 st_heap_init=0,st_child_result=0;

U8 *StBufNew()
{
  U8 *res=CAlloc(16);
  st_heap_init++;
  res[0]=17;
  return res;
}

U8 *StBuffer()
{
  static U8 *buf=StBufNew;
  return buf;
}

I64 StCount()
{
  static I64 count=0;
  return ++count;
}

U0 StChild(U8 *)
{
  U8 *buf=StBuffer;
  buf[0]++;
  st_child_result=StCount;
}

U0 StTasks()
{
  CTask *child;
  I64 i;
  U8 *buf=StBuffer;
  "Before:%d:%d:%d\n",st_heap_init,buf[0],StCount;
  for (i=0;i<2;i++) {
    child=Spawn(&StChild,,,,Fs);
    while (TaskValidate(child))
      Yield;
    "Child:%d:%d:%d:%d\n",st_child_result,buf==StBuffer,
	buf[0],MSize(buf)>=16;
  }
  "After:%d:%d\n",st_heap_init,StCount;
  Free(buf);
}
StTasks;
