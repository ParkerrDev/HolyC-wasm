//Compares chain: a<b<c is a<b && b<c with b evaluated once, and ==
//and != chain with each other and with the other compares.

I64 cnt;

I64 Cnt(I64 x)
{
  cnt++;
  return x;
}

U0 Chain()
{
  I64 i;
  F64 d=0.5;
  "%d %d %d %d\n",1<2==1,2==2==1,1!=2!=1,3>2==2;
  "%d %d %d\n",1<2<3,1<3<2,1<2<3<4;
  "%d %d %d\n",1==2<3,1<2+1<4,0<d<1;
  cnt=0;
  i=1<Cnt(2)<3;
  "%d %d\n",i,cnt;
  cnt=0;
  i=5<1<Cnt(9);
  "%d %d\n",i,cnt;
  cnt=0;
  if (5<1<Cnt(9))
    "yes\n";
  if (0<=Cnt(5)<10)
    "in\n";
  "%d\n",cnt;
}

Chain;
