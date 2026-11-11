I64 RgStatic(I64 value)
{
  static U16 saved=0;
  U16 res=value;
  saved++;
  "Static:%X:%X\n",saved,res;
  return res;
}
RgStatic(0x100000180);
RgStatic(0x100000180);
