I64 *StAuto(I64 arg)
{
  static I64 *value=&arg;
  return value;
}
"DEFINED\n";
