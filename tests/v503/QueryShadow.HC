class CQueryShadow
{
  U8 tag;
  I64 value;
};

I64 OffsetShadow(I64 offset)
{
  return offset+1;
}

I64 SizeShadow(I64 sizeof)
{
  return sizeof+2;
}

I64 LocalShadow()
{
  I64 offset=8;
  return offset;
}

"%d %d %d\n",OffsetShadow(4),SizeShadow(5),LocalShadow;
"%d %d\n",offset(CQueryShadow.value),sizeof(CQueryShadow.value);
