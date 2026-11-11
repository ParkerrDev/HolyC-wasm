I64 value=11,*value_first=&value;
extern I64 value;

I64 ValueExtern()
{
  return value;
}

I64 value=22;

U0 GlobalExtern()
{
  *value_first=17;
  "%d:%d:%d\n",ValueExtern,value,value_first==&value;
}

GlobalExtern;
