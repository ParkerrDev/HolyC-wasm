I64 layout_value=11;

I64 FirstSize()
{
  return sizeof(layout_value);
}

U8 layout_value[3]={1,2,3};

I64 SecondSize()
{
  return sizeof(layout_value);
}

class CFirstLayout
{
  U8 tag;
  I64 value;
} layout_obj;

I64 FirstOffset()
{
  return offset(layout_obj.value);
}

class CSecondLayout
{
  I64 tag;
  U8 value;
} layout_obj;

"%d:%d:%d:%d\n",FirstSize,SecondSize,FirstOffset,
	offset(layout_obj.value);
