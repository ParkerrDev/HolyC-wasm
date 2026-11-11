U0 Random()
{
  I64 i;
  F64 d;
  "%X\n",Seed(12345);
  for (i=0;i<8;i++)
    "%X\n",RandU64;
  Seed(12345);
  "%d\n",RandI16;
  "%d\n",RandU16;
  "%d\n",RandI32;
  "%d\n",RandU32;
  "%X\n",RandI64;
  Seed(12345);
  for (i=0;i<4;i++) {
    d=Rand;
    "%X\n",d(I64);
  }
  "%d\n",Bt(&Fs->task_flags,TASKf_NONTIMER_RAND);
}

Random;
