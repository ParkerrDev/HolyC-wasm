I64 Plus(I64 x)
{
  return x+1;
}

U0 CallbackInit()
{
  I64 (*fn)(I64)=&Plus;
  "%d\n",fn(3);
}
