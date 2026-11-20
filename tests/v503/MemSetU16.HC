U0 MemSetU16Test()
{
  U16 buf[8],*res;
  I64 i;
  MemSet(buf,0,sizeof(buf));
  res=MemSetU16(buf+1,0x12345,5);
  "%d\n",res-buf;
  for (i=0;i<8;i++)
    "%04X ",buf[i];
  '\n';
}

MemSetU16Test;
