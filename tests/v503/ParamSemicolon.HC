I64 Sum(I64 a;I64 b=2,I64 c=3)
{//Arguments may be split by ; as well as by a comma.
  return a+b+c;
}

"%d %d\n",Sum(1),Sum(1,,10);
