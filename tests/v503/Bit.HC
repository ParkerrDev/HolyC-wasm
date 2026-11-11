I64 bits[3]={0,0,0};

U0 Bit()
{
  I64 i,bit=-1;
  "%d %d %d %d\n",Bsf(0),Bsr(0),Bsf(0x8000000000000000),Bsr(1);
  for (i=0;i<130;i+=7)
    Bts(bits,i);
  "%X %X %X\n",bits[0],bits[1],bits[2];
  "%d %d\n",Bt(bits+1,-1),Bt(bits+1,bit);
  "%d\n",Btc(bits,63);
  "%d\n",Btr(bits,64);
  "%d\n",BEqu(bits,64,TRUE);
  "%d\n",LBts(bits,64);
  "%d\n",LBtc(bits,64);
  "%d\n",LBtr(bits,7);
  "%d\n",LBEqu(bits,7,TRUE);
  "%X %X %X\n",bits[0],bits[1],bits[2];
  "%d %d %d\n",ToBool(0),ToBool(-2),ToBool(0x100);
}

Bit;
