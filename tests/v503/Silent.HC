U0 SilentCheck()
{
  Bool old=Silent(FALSE),a,b,c;
  U64 packed=0x4847004645004241;
  PutS(NULL);
  PutChars(packed);
  '\n';
  'abc';
  PutChars('def');
  '\n';
  a=Silent;
  "hidden%d",42;
  'HIDE';
  PutS("hidden");
  PutChars(packed);
  PutKey('X',SCF_KEY_DESC);
  b=Silent;
  c=IsSilent;
  Silent(FALSE);
  "%d %d %d %d\n",a,b,c,IsSilent;
  "visible ";
  PutChars(packed);
  '\n';
  Silent(old);
}

SilentCheck;
