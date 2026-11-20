I64 Two()
{
  return 2;
}

U0 LocalListEnd()
{//A local list also ends at ) or }, which it eats.
  I64 i=Two());
  F64 d=1.5}
  "%d %5.2f\n",i,d;
}

LocalListEnd;
