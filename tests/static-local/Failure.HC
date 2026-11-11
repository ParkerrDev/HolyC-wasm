I64 StFail()
{
  throw('Init');
  return 0;
}
"BEFORE\n";
I64 StUncalled()
{
  static I64 value=StFail;
  return value;
}
"AFTER\n";
