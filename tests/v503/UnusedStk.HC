//V5.03 KDbg.HC UnusedStk: what is left of the task's stk, less as frames grow.
I64 Deep(I64 n)
{
  U8 buf[0x4000];
  buf[0]=n;
  if (n) return Deep(n-1);
  return UnusedStk;
}
I64 a=UnusedStk,b=Deep(4);
"%d %d %d\n",a>0x10000,a-b>=5*0x4000,a-b<6*0x4000+0x1000;
"%d\n",UnusedStk(Fs)>0x10000;
