I64 NarrowReg(I64 value)
{
  U16 res=value;
  return res;
}

I64 NarrowMem(I64 value)
{
  U16 res[1];
  res[0]=value;
  return res[0];
}

I64 NarrowProduct(I64 a,I64 b)
{
  I32 res=(a*b)>>16;
  return res;
}

"Register:%d\n",NarrowReg(0x10017);
"Memory:%d\n",NarrowMem(0x10017);
"Product:%d\n",NarrowProduct(-2147483648,-2147483648);
