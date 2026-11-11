I64 DeferredFail()
{
  throw('Init');
  return 0;
}
"BEFORE\n";
I64 deferred_value=DeferredFail;
"AFTER:%d\n",deferred_value;
