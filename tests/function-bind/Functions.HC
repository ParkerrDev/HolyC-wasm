I64 BindValue(I64 n=0)
{
  return 11+n;
}

I64 BindOld()
{
  return BindValue;
}

I64 (*bind_ptr)(I64 n)=&BindValue;

I64 BindDefault(I64 (*fn)(I64 n)=&BindValue)
{
  return fn(0);
}

I64 BindValue(I64 n=0)
{
  return 22+n;
}

I64 BindNew()
{
  return BindValue;
}

"Functions:%d:%d:%d:%d:%d\n",BindOld,BindNew,bind_ptr(0),BindValue,
	BindDefault;
