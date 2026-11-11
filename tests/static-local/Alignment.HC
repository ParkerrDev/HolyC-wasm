U8 *StByte()
{
  static U8 value=7;
  return &value;
}

U16 *StWord()
{
  static U16 value=19;
  return &value;
}

U8 *StBytes()
{
  static U8 value[3]="AB";
  return value;
}

U8 *st_a=StByte,*st_b=StWord,*st_c=StBytes;
"Align:%d:%d:%d:%d:%d:%d\n",st_a&7,st_b&7,st_c&7,
      st_a!=st_b,st_a!=st_c,st_b!=st_c;
"Data:%d:%d:%s\n",*StByte,*StWord,StBytes;
