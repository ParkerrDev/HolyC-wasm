I64 trace;

I64 Value(I64 n)
{
  trace=trace*10+2;
  return n;
}

I64 *Place(I64 *p)
{
  trace=trace*10+1;
  return p;
}

U0 AssignOrder()
{
  I64 a[4],i,*p=a;
  MemSet(a,0,sizeof(a));
  trace=0;
  *Place(a)=Value(7);
  "%d %d\n",trace,a[0];
  trace=0;
  *Place(a)+=Value(3);
  "%d %d\n",trace,a[0];
  i=0;
  a[i++]=i;
  "%d %d\n",i,a[0];
  a[0]=3;a[1]=7;
  *p++=*p;
  "%d %d %d\n",p-a,a[0],a[1];
  p=a;a[0]=3;a[1]=7;
  *p++^=*p;
  "%d %d %d\n",p-a,a[0],a[1];
  i=2;
  i+=i++;
  "%d\n",i;
  i=2;
  a[0]=i+=i++;
  "%d %d\n",i,a[0];
  a[1]=0;
  a[a[1]=2]=a[1]=1;
  "%d %d\n",a[1],a[2];
}

AssignOrder;
