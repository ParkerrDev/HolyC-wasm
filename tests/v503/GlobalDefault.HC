I64 default_value=11,*default_old=&default_value;

I64 DefaultScalar(I64 value=default_value)
{
  return value;
}

I64 DefaultPointer(I64 *ptr=&default_value)
{
  return *ptr;
}

I64 default_value=22;

*default_old=17;
"%d:%d:%d\n",DefaultScalar,DefaultPointer,default_value;
