I8 RtCondValue0(I64 value)
{
  return value;
}

I64 RtCond0(I64 value)
{
  I64 res=0;
  if (RtCondValue0(value)) res|=1;
  if (!RtCondValue0(value)) res|=2;
  if (RtCondValue0(value)==value) res|=4;
  if (RtCondValue0(value)<0) res|=8;
  if (RtCondValue0(value) && value) res|=16;
  if (RtCondValue0(value) || !value) res|=32;
  if (0<RtCondValue0(value)==value) res|=64;
  return res;
}

U8 RtCondValue1(I64 value)
{
  return value;
}

I64 RtCond1(I64 value)
{
  I64 res=0;
  if (RtCondValue1(value)) res|=1;
  if (!RtCondValue1(value)) res|=2;
  if (RtCondValue1(value)==value) res|=4;
  if (RtCondValue1(value)<0) res|=8;
  if (RtCondValue1(value) && value) res|=16;
  if (RtCondValue1(value) || !value) res|=32;
  if (0<RtCondValue1(value)==value) res|=64;
  return res;
}

I16 RtCondValue2(I64 value)
{
  return value;
}

I64 RtCond2(I64 value)
{
  I64 res=0;
  if (RtCondValue2(value)) res|=1;
  if (!RtCondValue2(value)) res|=2;
  if (RtCondValue2(value)==value) res|=4;
  if (RtCondValue2(value)<0) res|=8;
  if (RtCondValue2(value) && value) res|=16;
  if (RtCondValue2(value) || !value) res|=32;
  if (0<RtCondValue2(value)==value) res|=64;
  return res;
}

U16 RtCondValue3(I64 value)
{
  return value;
}

I64 RtCond3(I64 value)
{
  I64 res=0;
  if (RtCondValue3(value)) res|=1;
  if (!RtCondValue3(value)) res|=2;
  if (RtCondValue3(value)==value) res|=4;
  if (RtCondValue3(value)<0) res|=8;
  if (RtCondValue3(value) && value) res|=16;
  if (RtCondValue3(value) || !value) res|=32;
  if (0<RtCondValue3(value)==value) res|=64;
  return res;
}

I32 RtCondValue4(I64 value)
{
  return value;
}

I64 RtCond4(I64 value)
{
  I64 res=0;
  if (RtCondValue4(value)) res|=1;
  if (!RtCondValue4(value)) res|=2;
  if (RtCondValue4(value)==value) res|=4;
  if (RtCondValue4(value)<0) res|=8;
  if (RtCondValue4(value) && value) res|=16;
  if (RtCondValue4(value) || !value) res|=32;
  if (0<RtCondValue4(value)==value) res|=64;
  return res;
}

U32 RtCondValue5(I64 value)
{
  return value;
}

I64 RtCond5(I64 value)
{
  I64 res=0;
  if (RtCondValue5(value)) res|=1;
  if (!RtCondValue5(value)) res|=2;
  if (RtCondValue5(value)==value) res|=4;
  if (RtCondValue5(value)<0) res|=8;
  if (RtCondValue5(value) && value) res|=16;
  if (RtCondValue5(value) || !value) res|=32;
  if (0<RtCondValue5(value)==value) res|=64;
  return res;
}

I64 RtCondValue6(I64 value)
{
  return value;
}

I64 RtCond6(I64 value)
{
  I64 res=0;
  if (RtCondValue6(value)) res|=1;
  if (!RtCondValue6(value)) res|=2;
  if (RtCondValue6(value)==value) res|=4;
  if (RtCondValue6(value)<0) res|=8;
  if (RtCondValue6(value) && value) res|=16;
  if (RtCondValue6(value) || !value) res|=32;
  if (0<RtCondValue6(value)==value) res|=64;
  return res;
}

U64 RtCondValue7(I64 value)
{
  return value;
}

I64 RtCond7(I64 value)
{
  I64 res=0;
  if (RtCondValue7(value)) res|=1;
  if (!RtCondValue7(value)) res|=2;
  if (RtCondValue7(value)==value) res|=4;
  if (RtCondValue7(value)<0) res|=8;
  if (RtCondValue7(value) && value) res|=16;
  if (RtCondValue7(value) || !value) res|=32;
  if (0<RtCondValue7(value)==value) res|=64;
  return res;
}

Bool RtCondValue8(I64 value)
{
  return value;
}

I64 RtCond8(I64 value)
{
  I64 res=0;
  if (RtCondValue8(value)) res|=1;
  if (!RtCondValue8(value)) res|=2;
  if (RtCondValue8(value)==value) res|=4;
  if (RtCondValue8(value)<0) res|=8;
  if (RtCondValue8(value) && value) res|=16;
  if (RtCondValue8(value) || !value) res|=32;
  if (0<RtCondValue8(value)==value) res|=64;
  return res;
}

"CTX:0:0:%X\n",RtCond0(0);
"CTX:0:128:%X\n",RtCond0(128);
"CTX:0:256:%X\n",RtCond0(256);
"CTX:0:65536:%X\n",RtCond0(65536);
"CTX:0:0x100000000:%X\n",RtCond0(0x100000000);
"CTX:0:-256:%X\n",RtCond0(-256);
"CTX:0:0x8000000000000000:%X\n",RtCond0(0x8000000000000000);
"CTX:1:0:%X\n",RtCond1(0);
"CTX:1:128:%X\n",RtCond1(128);
"CTX:1:256:%X\n",RtCond1(256);
"CTX:1:65536:%X\n",RtCond1(65536);
"CTX:1:0x100000000:%X\n",RtCond1(0x100000000);
"CTX:1:-256:%X\n",RtCond1(-256);
"CTX:1:0x8000000000000000:%X\n",RtCond1(0x8000000000000000);
"CTX:2:0:%X\n",RtCond2(0);
"CTX:2:128:%X\n",RtCond2(128);
"CTX:2:256:%X\n",RtCond2(256);
"CTX:2:65536:%X\n",RtCond2(65536);
"CTX:2:0x100000000:%X\n",RtCond2(0x100000000);
"CTX:2:-256:%X\n",RtCond2(-256);
"CTX:2:0x8000000000000000:%X\n",RtCond2(0x8000000000000000);
"CTX:3:0:%X\n",RtCond3(0);
"CTX:3:128:%X\n",RtCond3(128);
"CTX:3:256:%X\n",RtCond3(256);
"CTX:3:65536:%X\n",RtCond3(65536);
"CTX:3:0x100000000:%X\n",RtCond3(0x100000000);
"CTX:3:-256:%X\n",RtCond3(-256);
"CTX:3:0x8000000000000000:%X\n",RtCond3(0x8000000000000000);
"CTX:4:0:%X\n",RtCond4(0);
"CTX:4:128:%X\n",RtCond4(128);
"CTX:4:256:%X\n",RtCond4(256);
"CTX:4:65536:%X\n",RtCond4(65536);
"CTX:4:0x100000000:%X\n",RtCond4(0x100000000);
"CTX:4:-256:%X\n",RtCond4(-256);
"CTX:4:0x8000000000000000:%X\n",RtCond4(0x8000000000000000);
"CTX:5:0:%X\n",RtCond5(0);
"CTX:5:128:%X\n",RtCond5(128);
"CTX:5:256:%X\n",RtCond5(256);
"CTX:5:65536:%X\n",RtCond5(65536);
"CTX:5:0x100000000:%X\n",RtCond5(0x100000000);
"CTX:5:-256:%X\n",RtCond5(-256);
"CTX:5:0x8000000000000000:%X\n",RtCond5(0x8000000000000000);
"CTX:6:0:%X\n",RtCond6(0);
"CTX:6:128:%X\n",RtCond6(128);
"CTX:6:256:%X\n",RtCond6(256);
"CTX:6:65536:%X\n",RtCond6(65536);
"CTX:6:0x100000000:%X\n",RtCond6(0x100000000);
"CTX:6:-256:%X\n",RtCond6(-256);
"CTX:6:0x8000000000000000:%X\n",RtCond6(0x8000000000000000);
"CTX:7:0:%X\n",RtCond7(0);
"CTX:7:128:%X\n",RtCond7(128);
"CTX:7:256:%X\n",RtCond7(256);
"CTX:7:65536:%X\n",RtCond7(65536);
"CTX:7:0x100000000:%X\n",RtCond7(0x100000000);
"CTX:7:-256:%X\n",RtCond7(-256);
"CTX:7:0x8000000000000000:%X\n",RtCond7(0x8000000000000000);
"CTX:8:0:%X\n",RtCond8(0);
"CTX:8:128:%X\n",RtCond8(128);
"CTX:8:256:%X\n",RtCond8(256);
"CTX:8:65536:%X\n",RtCond8(65536);
"CTX:8:0x100000000:%X\n",RtCond8(0x100000000);
"CTX:8:-256:%X\n",RtCond8(-256);
"CTX:8:0x8000000000000000:%X\n",RtCond8(0x8000000000000000);
