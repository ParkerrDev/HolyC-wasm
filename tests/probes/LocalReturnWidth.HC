I64 rg_id=0;
U8 rg_byte=7;

U0 RgVal(I64 value)
{
  "VAL:%d:%016X\n",rg_id++,value;
}

I64 RgArrayCast(I64 value)
{
  U16 a=value,b=value+1,c=value+2,d=value+3,e=value+4;
  U64 buf[1];
  buf[0]=&rg_byte;
  RgVal(*buf(U8 *));
  RgVal(a);RgVal(b);RgVal(c);RgVal(d);RgVal(e);
  return a+b+c+d+e;
}

U8 RgReturnLocal(I64 value)
{
  U8 res=value;
  return res;
}

U8 RgReturnMem(I64 value)
{
  U8 noreg res=value;
  return res;
}

U8 RgReturnValue(I64 value)
{
  return value;
}

RgVal(RgArrayCast(0x1000001FF));
RgVal(RgReturnLocal(0x1000001FF));
RgVal(RgReturnMem(0x1000001FF));
RgVal(RgReturnValue(0x1000001FF));
