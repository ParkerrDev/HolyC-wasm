I64 shadow=11,*shadow_first=&shadow;

I64 ShadowFirst()
{
  return shadow;
}

I64 shadow=22,*shadow_second=&shadow;

I64 ShadowSecond()
{
  return shadow;
}

U8 shadow[5]="abcd";

U0 GlobalShadow()
{
  *shadow_first=17;
  "%d:%d:%s:%d:%d\n",ShadowFirst,ShadowSecond,shadow,
	shadow_first==shadow_second,shadow_second==shadow;
  *shadow_second=29;
  "%d:%d:%s\n",ShadowFirst,ShadowSecond,shadow;
}

GlobalShadow;
