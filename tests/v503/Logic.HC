//In a test, && and || stop once the result is known. Anywhere else
//V5.03 evaluates both sides, and ^^ always does.

I64 cnt;

I64 Cnt(I64 x)
{
  cnt++;
  return x;
}

I64 AndRet(I64 a)
{
  return a && Cnt(1);
}

U0 Logic()
{
  I64 i,j;
  cnt=0;
  i=0 && Cnt(1);
  j=1 || Cnt(1);
  "%d %d %d\n",i,j,cnt;
  cnt=0;
  if (0 && Cnt(1))
    "yes\n";
  if (1 || Cnt(1))
    "yes\n";
  if (!(0 && Cnt(1)))
    "not\n";
  while (0 && Cnt(1))
    "loop\n";
  if (0 && Cnt(1) || Cnt(0))
    "yes\n";
  "%d\n",cnt;
  cnt=0;
  if ((0 && Cnt(1))+1)
    "plus\n";
  i=AndRet(0);
  "%d %d\n",i,cnt;
  cnt=0;
  i=Cnt(0) ^^ Cnt(1);
  "%d %d\n",i,cnt;
  "%d %d %d\n",5 && 3,0 || 7,!(2 && 0);
}

Logic;
