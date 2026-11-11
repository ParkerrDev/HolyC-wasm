U0 FloatIntermediate()
{
  I64 i;
  F64 d;
  Seed(1234);
  for (i=0;i<64;i++) {
    d=(Rand-0.5)*1e12;
    "%016X\n",d(I64);
  }
}

FloatIntermediate;
