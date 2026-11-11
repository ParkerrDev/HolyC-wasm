I64 st_value=91;

I64 StScope(I64 arg)
{
  static I64 a=7,b=a+3,self=&self;
  U8 buf[3];
  static I64 sizes=sizeof(arg)+sizeof(buf);
  return a*100+b*10+sizes+(self==&self);
}

I64 StShadow()
{
  static I64 st_value=7;
  return st_value;
}

I64 StGlobalBefore()
{
  static I64 before=st_value;
  I64 st_value=3;
  return before*100+st_value;
}

class CStData
{
  I64 value;
  U16 width;
};

CStData *StStruct()
{
  static CStData data={17,65535};
  return &data;
}

I64 StSize()
{
  static U8 data[4]="abc";
  return sizeof(data);
}

"Scope:%d:%d:%d:%d\n",StScope(3),StShadow,StGlobalBefore,StSize;
CStData *st_data=StStruct;
st_data->value=23;st_data->width++;
"Struct:%d:%d:%d\n",st_data==StStruct,StStruct()->value,
      StStruct()->width;
