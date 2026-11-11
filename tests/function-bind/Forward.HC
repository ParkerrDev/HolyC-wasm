extern I64 BindForward(I64 n=3);
I64 BindEarly()
{
  return BindForward;
}

I64 BindForward(I64 n=5)
{
  return n+10;
}

I64 BindMiddle()
{
  return BindForward;
}

extern I64 BindForward(I64 n=7);
I64 BindSecond()
{
  return BindForward;
}

I64 BindForward(I64 n=9)
{
  return n+20;
}

"Forward:%d:%d:%d:%d\n",BindEarly,BindMiddle,BindSecond,BindForward;

extern I64 BindRepeat(I64 n=1);
I64 RepeatFirst()
{
  return BindRepeat;
}

extern I64 BindRepeat(I64 n=2);
I64 RepeatSecond()
{
  return BindRepeat;
}

I64 BindRepeat(I64 n=3)
{
  return n+30;
}

"Repeat:%d:%d:%d\n",RepeatFirst,RepeatSecond,BindRepeat;

I64 BindRec(I64 n)
{
  if (n) return BindRec(n-1)+1;
  return 0;
}

I64 RecOld()
{
  return BindRec(4);
}

I64 BindRec(I64 n)
{
  return n+100;
}

"Recursion:%d:%d\n",RecOld,BindRec(4);
