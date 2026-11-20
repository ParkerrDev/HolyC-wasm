//V5.03 Kernel/KernelB.HH's SwapI64, SwapU16, SwapU32 and SwapU8: each swaps
//just its own bytes, so the bytes beside it stay.

U0 SwapChk()
{
  U8 b[8];
  U16 w[4];
  U32 d[4];
  I64 i,q[2];
  for (i=0;i<8;i++)
    b[i]=i+0xF0;
  SwapU8(&b[1],&b[6]);
  for (i=0;i<8;i++)
    "%02X ",b[i];
  '\n';
  for (i=0;i<4;i++)
    w[i]=0xA000+i;
  SwapU16(&w[0],&w[3]);
  "%04X %04X %04X %04X\n",w[0],w[1],w[2],w[3];
  for (i=0;i<4;i++)
    d[i]=0x80000000+i;
  SwapU32(&d[2],&d[1]);
  "%08X %08X %08X %08X\n",d[0],d[1],d[2],d[3];
  q[0]=-5;q[1]=0x123456789;
  SwapI64(&q[0],&q[1]);
  "%X %d\n",q[0],q[1];
  SwapU8(&b[2],&b[2]);
  "%02X\n",b[2];
}

SwapChk;
