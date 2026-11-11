U64 scalar_data[3]={0xFEDCBA9876543210,0x8070605040302010,0x1122334455667788};
I64 scalar_calls=0;

U64 *ScalarPtr()
{
  scalar_calls++;
  return scalar_data;
}

U0 ScalarPointer()
{
  U64 *ptr=scalar_data;
  I64 i;
  "%X %X %d %d\n",ptr->u32[0],ptr->u32[1],ptr->i8[7],ptr->i16[3];
  ptr->u16[2]=0x1234;
  ptr++;
  ptr->i8[3]=-7;
  ScalarPtr->u32[0]+=3;
  "%d\n",scalar_calls;
  for (i=0;i<3;i++) "%X ",scalar_data[i];
  '\n';
}

ScalarPointer;
