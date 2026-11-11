U8 u8=0xFF;
U16 u16=0xFFFF;
U32 u32=0xFFFFFFFF;
I8 i8=-1;
I16 i16=-1;
I32 i32=-1;
U64 u64=1;
Bool b=0xFF;

U0 Narrow()
{
  "%X %X %X\n",u8,u16,u32;
  "%X %X %X\n",i8,i16,i32;
  "%d %d %d\n",u8>-1,u16>-1,u32>-1;
  "%d %d %d\n",i8>-1,i16>-1,i32>-1;
  "%X %X %X\n",u8+0,u16+0,u32+0;
  "%d %d %d\n",u8+0>-1,u16+0>-1,u32+0>-1;
  "%d %d %d\n",-u8<0,-u64<0,~u8<0;
  "%X %d\n",b,b<0;
}

Narrow;
