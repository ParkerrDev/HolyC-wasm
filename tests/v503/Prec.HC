//V5.03's precedence: power and the shifts bind tightest, & binds
//tighter than +, + tighter than the compares, ^^ sits between && and
//||, and power and = group to the right.

U0 Prec()
{
  I64 a,b,x=2;
  "%d %d %d %d\n",1+2<<3,5>>1*2,3+1&2,7%4<<1;
  "%d %d %d %d\n",x&1==0,0<<4+15,1|1+1,1<<2-1;
  "%d %d %d\n",6-2-1,24/4/2,2*3%4;
  a=2`1`2;
  b=-2`2;
  "%d %d\n",a,b;
  a=2`2*3;
  b=-2`2+1;
  "%d %d\n",a,b;
  "%d %d %d %d\n",5 ^^ 3,5 ^^ 0,0 ^^ 0,1 || 0 ^^ 1;
  "%d %d\n",1 ^^ 1 && 0,0 ^^ 1 && 1;
  a=b=5;
  "%d %d\n",a,b;
}

Prec;
