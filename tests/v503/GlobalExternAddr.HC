I64 external_value=11,*original_ptr=&external_value;
extern I64 external_value;

U8 *ExternalFirstAddr()
{
  return &external_value;
}

extern I64 external_value;

U8 *ExternalSecondAddr()
{
  return &external_value;
}

I64 external_value=33;

"%d:%d:%d:%d:%d\n",!ExternalFirstAddr,
	ExternalFirstAddr==original_ptr,ExternalFirstAddr==&external_value,
	ExternalSecondAddr==&external_value,external_value;
