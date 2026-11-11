I64 DeferredFail()
{
  throw('Init');
  return 0;
}
"BEFORE\n";
I64 DeferredValue(I64 value=DeferredFail)
{
  return value;
}
"AFTER:%d\n",DeferredValue;
