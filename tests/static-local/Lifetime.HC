I64 st_init_cnt=0,st_seed=7;

I64 StInit()
{
  st_init_cnt++;
  return st_seed;
}

I64 StNext()
{
  static I64 value=StInit;
  return ++value;
}

"AtDef:%d\n",st_init_cnt;
I64 (*st_old)()=&StNext;
st_seed=31;

I64 StUnused()
{
  static I64 value=StInit;
  return value;
}

"Unused:%d\n",st_init_cnt;
I64 st_a=StNext,st_b=StNext;
"Calls:%d:%d:%d\n",st_a,st_b,st_init_cnt;

I64 StNext()
{
  static I64 value=500;
  return ++value;
}

st_a=st_old();st_b=StNext;
"Redef:%d:%d\n",st_a,st_b;

U8 *StText()
{
  static U8 text[4]="abc";
  return text;
}

I64 *StArray()
{
  static I64 values[3]={7,8,9};
  return values;
}

U8 *st_text=StText;
I64 *st_array=StArray;
st_text[1]='Z';st_array[1]=18;
"Data:%d:%s:%d:%d\n",st_text==StText,StText,st_array==StArray,
      StArray()[1];

I64 StRecursive(I64 n)
{
  static I64 count=0;
  count++;
  if (n)
    StRecursive(n-1);
  return count;
}

st_a=StRecursive(3);st_b=StRecursive(1);
"Recursive:%d:%d\n",st_a,st_b;

I64 *StOne()
{
  static I64 value=1;
  return &value;
}

I64 *StTwo()
{
  static I64 value=2;
  return &value;
}

"Address:%d:%d:%d:%d\n",StOne!=StTwo,StOne==StOne,*StOne,*StTwo;

I64 StNarrow()
{
  static U16 value=65535;
  return ++value;
}

st_a=StNarrow;st_b=StNarrow;
"Narrow:%d:%d\n",st_a,st_b;
