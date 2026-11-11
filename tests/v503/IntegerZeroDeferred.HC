I64 zero_value=1;

I64 ZeroDeferred()
{
  return zero_value+1/0;
}

I64 (*zero_fun)()=&ZeroDeferred;
"Deferred:%d\n",zero_fun!=0;
