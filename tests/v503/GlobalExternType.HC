extern I64 typed_value;

I64 TypedValue()
{
  return typed_value;
}

U8 typed_value[8]={1,2,3,4,5,6,7,8};

"%016X:%d:%d\n",TypedValue,typed_value[0],typed_value[7];
