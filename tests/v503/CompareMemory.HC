U8 a[8]={0,127,128,255,0,254,2,1},
      b[8]={0,127,128,255,0,255,1,2};

U0 CompareMemory()
{
  I64 i,j;
  for (i=0;i<8;i++) {
    for (j=0;j<=8-i;j++)
      "%d,%d ",MemCmp(a+i,b+i,j),MemCmp(b+i,a+i,j);
    '\n';
  }
  "%d %d %d\n",MemCmp(a,b,0),MemCmp(a,a,8),MemCmp(a+2,a+1,1);
}

CompareMemory;
