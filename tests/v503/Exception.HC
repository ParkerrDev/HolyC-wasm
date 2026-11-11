I64 visits;

U0 Leaf(I64 code)
{
  I64 data[8];
  data[0]=code;
  visits++;
  throw(data[0],TRUE);
}

U0 Middle(I64 code)
{
  I64 data[8];
  data[0]=code+1;
  Leaf(data[0]-1);
  visits+=100;
}

U0 (*raiser)(I64)=&Middle;

I64 Safe(I64 code)
{
  I64 res=-1;
  try
    raiser(code);
  catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}

Bool SafeReturn()
{
  Bool res=FALSE;
  try
    Leaf(77);
  catch
    return res;
  return TRUE;
}

U0 Exception()
{
  I64 i,res;
  visits=0;
  "%X\n",Safe('First');
  try {
    try
      Middle('Next');
    catch
      "inner:%X\n",Fs->except_ch;
    "bad\n";
  } catch {
    "outer:%X\n",Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  "after\n";
  for (i=1;i<4;i++) {
    res=Safe(i);
    "%d:%X\n",i,res;
  }
  "visits:%d\n",visits;
  "%d\n",SafeReturn;
}

Exception;
