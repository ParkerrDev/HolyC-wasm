I64 dft_seed=10;
F64 dft_float=1.25;
U8 dft_bytes[7];

I64 DftNext()
{
  return ++dft_seed;
}

I64 DftPair(I64 a=DftNext,I64 b=DftNext)
{
  return a*100+b;
}

I64 dft_early[1]={dft_seed};

I64 DftUnused(I64 a=DftNext)
{
  return a;
}

F64 DftFloat(F64 a=dft_float)
{
  return a;
}

I64 DftInt(I64 a=dft_float+1.5)
{
  return a;
}

I64 DftSize(I64 a=sizeof(dft_bytes))
{
  return a;
}

I64 DftSizeCaller()
{
  I64 dft_bytes=19;
  return DftSize+dft_bytes;
}

I64 DftIdentity(I64 a)
{
  return a;
}

"%d %d %0.2f %d\n",dft_seed,DftPair,DftFloat,DftInt;
dft_seed=40;dft_float=8.0;

I64 DftLater(I64 a=dft_seed)
{
  return a;
}

dft_seed=90;
I64 dft_saved=dft_seed,dft_late[1]={dft_seed};
I64 (*dft_ptr)(I64 a=dft_seed)=&DftIdentity;
dft_seed=100;

class DftMember
{
  I64 (*fn)(I64 a=dft_seed);
} dft_member;

I64 DftLocal()
{
  I64 (*fn)(I64 a=DftNext);
  fn=&DftIdentity;
  return fn();
}

"%d\n",dft_seed;
dft_seed=500;
dft_member.fn=&DftIdentity;
"%d %d %d %d %d %d\n",DftPair,DftLater,dft_saved,
      dft_ptr(),dft_member.fn(),DftLocal;
"%d %d %d %0.2f\n",DftLocal,DftLocal,dft_seed,DftFloat;
"%d\n",DftSizeCaller;
"%d %d\n",dft_early[0],dft_late[0];
