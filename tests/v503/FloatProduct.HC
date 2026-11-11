U64 edges[10]={0,0x8000000000000000,1,
	0x8000000000000001,0x0010000000000000,0x7FEFFFFFFFFFFFFF,
	0xFFEFFFFFFFFFFFFF,0x7FF0000000000000,0x7FF8000000000001,
	0x3FF0000000000000};

I64 fp_order=0,fp_global;

F64 ProductArg(I64 n)
{
  fp_order=fp_order*10+n;
  return n/3.0;
}

I64 ProductReturn(F64 a,F64 b)
{
  return a*b;
}

I64 ProductArgI64(I64 n)
{
  return n;
}

U0 ProductResult(F64 a,F64 b)
{
  I64 res=a*b;
  F64 staged=a*b;
  fp_global=a*b;
  "%016X %016X %016X %016X %016X\n",res,fp_global,
	ProductReturn(a,b),ProductArgI64(a*b),ToI64(Trunc(staged));
}

U0 FloatProduct()
{
  U64 abits,bbits;
  F64 a,b;
  I64 i,j,res;
  for (i=1;i<=128;i++) {
    a=1.0/i;b=i*0x100000000;
    ProductResult(a,b);
    ProductResult(a,-b);
  }
  Seed(927);
  for (i=0;i<1024;i++) {
    abits=RandU64&0x800FFFFFFFFFFFFF;
    bbits=RandU64&0x800FFFFFFFFFFFFF;
    abits|=(1023+RandU16%65-32)<<52;
    bbits|=(1023+RandU16%65-32)<<52;
    ProductResult(abits(F64),bbits(F64));
  }
  for (i=0;i<10;i++)
    for (j=0;j<10;j++) ProductResult(edges[i](F64),edges[j](F64));
  res=ProductArg(1)*ProductArg(2);
  "%d %d\n",res,fp_order;
}

FloatProduct;
