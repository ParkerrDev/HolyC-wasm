I64 ReversedCase(I64 n)
{
  switch (n) {
    case 3...1:
      return 11;
    case:
      return 22;
    case:
      return 33;
    default:
      return 0;
  }
}

I64 LastDefault(I64 n)
{
  switch (n) {
    case 0:
      return 11;
    default:
      return 22;
    default:
      return 33;
  }
}

I64 GotoDefault(I64 n)
{
  I64 res=0;
  switch (n) {
    case 3...1:
      res=11;
      goto done;
    default:
      res=22;
      goto done;
    default:
      res=33;
      goto done;
  }
done:
  return res;
}

I64 SignedCase(I64 n)
{
  switch (n) {
    case 0xFFFFFFFFFFFFFFFF:
      return -1;
    case:
      return 9;
    case 1:
      return 1;
    default:
      return 2;
  }
}

I64 WideCase(I64 n)
{
  switch (n) {
    case 0:
      return 1;
    case 65534:
      return 2;
    default:
      return 3;
  }
}

I64 OffsetCase(I64 n)
{
  switch (n) {
    case 17:
      return 1;
    case 65551:
      return 2;
    default:
      return 3;
  }
}

I64 MinCase(I64 n)
{
  switch (n) {
    case 0x8000000000000000...I64_MIN+1:
      return 1;
    case:
      return 2;
    default:
      return 3;
  }
}

I64 SparseMinCase(I64 n)
{
  switch (n) {
    case I64_MIN:
      return 1;
    case I64_MIN+65534:
      return 2;
    default:
      return 3;
  }
}

I64 MaxCase(I64 n)
{
  switch (n) {
    case I64_MAX-1:
      return 1;
    case:
      return 2;
    default:
      return 3;
  }
}

I64 i;
for (i=-2;i<7;i++)
  "%d:%d:%d:%d\n",ReversedCase(i),LastDefault(i),
	GotoDefault(i),SignedCase(i);
"%d:%d:%d:%d\n",WideCase(0),WideCase(65534),
      OffsetCase(17),OffsetCase(65551);
"%d:%d:%d:%d:%d:%d\n",MinCase(I64_MIN),MinCase(I64_MIN+1),
      MinCase(I64_MIN+2),MinCase(I64_MAX),SparseMinCase(I64_MIN),
      SparseMinCase(I64_MIN+65534);
"%d:%d:%d\n",MaxCase(I64_MAX-1),MaxCase(I64_MAX),MaxCase(I64_MIN);
