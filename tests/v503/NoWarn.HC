I64 nw_value=17;

I64 NoWarnLocals(I64 arg)
{
  I64 nw_value,unused;
  U8 *ptr;
  no_warn arg,nw_value,ptr;
  no_warn unused,;
  no_warn;
  return 23;
}

no_warn;
"NoWarn:%d:%d\n",NoWarnLocals(31),nw_value;
