//Kernel/StrA.HC: StrCmp, StrICmp, StrNCmp and StrNICmp.

U8 *strs[6]={"","a","ab","abc","Abd","b"},
      hi[4]={'a','b',0xFF,0},lo[4]={'a','b',1,0},
      high[2]={0x80,0},low[2]={0x7F,0};

U0 StrCompare()
{
  I64 i,j;
  for (i=0;i<6;i++) {
    for (j=0;j<6;j++)
      "%d,%d,%d,%d ",StrCmp(strs[i],strs[j]),StrICmp(strs[i],strs[j]),
	    StrNCmp(strs[i],strs[j],2),StrNICmp(strs[i],strs[j],2);
    '\n';
  }
  "%d %d %d %d\n",StrNCmp("abc","abd",0),StrNCmp(hi,lo,3),
	StrCmp(high,low),StrICmp(low,high);
}

StrCompare;
