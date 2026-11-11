U0 Convert()
{
  U64 u=0xFFFFFFFFFFFFFFFF;
  F64 a=u,b=1e30,c=0.0;
  I64 v;
  "%0.1f\n",a;
  v=b;
  "%X\n",v;
  v=-b;
  "%X\n",v;
  c=c/c;
  v=c;
  "%X\n",v;
  v=-2.9;
  "%d\n",v;
  "%d %0.1f\n",ToI64(-2.9),ToF64(-3);
}

Convert;
