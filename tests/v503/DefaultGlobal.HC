I64 dft_num=2;

I64 DefaultGlobal(I64 value=dft_num)
{
  return value;
}

"%d\n",DefaultGlobal;
dft_num=4;
"%d %d\n",DefaultGlobal,DefaultGlobal(7);
