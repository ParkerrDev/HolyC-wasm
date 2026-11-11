I64 Read(I64 *ptr)
{
  return *ptr;
}

U0 PointerStore()
{
  I64 a[4],*p,i;
  for (i=0;i<4;i++) a[i]=i+3;
  p=a;
  *p++=p-a;
  "%d %d\n",a[0],p-a;
  p=a;
  *p++=Read(p);
  "%d %d\n",a[0],p-a;
  p=a;a[0]=3;
  *p++=(*p)+8;
  "%d %d\n",a[0],p-a;
  p=a;a[0]=3;
  (p++)[0]=p-a;
  "%d %d\n",a[0],p-a;
  p=a;a[0]=3;
  *p++=a[0]+8;
  "%d %d\n",a[0],p-a;
  a[0]=3;
  a[0]+=a[0]++;
  "%d\n",a[0];
  i=3;
  i=i++;
  "%d\n",i;
  a[0]=3;
  a[0]=a[0]++;
  "%d\n",a[0];
}

PointerStore;
