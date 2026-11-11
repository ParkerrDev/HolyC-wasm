U64 ps_hash=0xCBF29CE484222325;
F64 ps_scales[6]={0.0,0.25,0.5,1.0,2.5,4.0};
U8 *ps_words[8]={"","alpha","/one/two/","a//b","..../~",":A;B:C",
  "\t abc\n\tdef",",;:both:;,"},
  *ps_marks[6]={"","/",";:"," .","abc",NULL};

U0 PathStringHash(U8 *st)
{
  I64 i;
  for (i=0;st[i];i++) ps_hash=(ps_hash^st[i])*0x100000001B3;
  ps_hash=(ps_hash^0xFF)*0x100000001B3;
}

U0 PathString()
{
  U8 src[513],dst[513],*ptr,*res;
  I64 i,j,k,n,flags,first,last,cnt=0;
  ps_hash=0xCBF29CE484222325;
  for (i=0;i<8;i++)
    for (j=0;j<6;j++) {
      StrCpy(src,ps_words[i]);
      first=last=-1;
      if (ptr=StrFirstOcc(src,ps_marks[j])) first=ptr-src;
      if (ptr=StrLastOcc(src,ps_marks[j])) last=ptr-src;
      ps_hash=(ps_hash^first)*0x100000001B3;
      ps_hash=(ps_hash^last)*0x100000001B3;
      StrFirstRem(src,ps_marks[j],dst);
      PathStringHash(src);
      PathStringHash(dst);
      StrCpy(src,ps_words[i]);
      StrLastRem(src,ps_marks[j],dst);
      PathStringHash(src);
      PathStringHash(dst);
      StrCpy(src,ps_words[i]);
      StrFirstRem(src,ps_marks[j]);
      PathStringHash(src);
      StrCpy(src,ps_words[i]);
      StrLastRem(src,ps_marks[j]);
      PathStringHash(src);
      for (k=-1;k<257;k++)
	ps_hash=(ps_hash^StrOcc(ps_words[i],k))*0x100000001B3;
      cnt++;
    }
  for (n=0;n<=256;n++) {
    for (i=0;i<n;i++)
      if (i%3)
	src[i]='\t';
      else
	src[i]='\n';
    src[n]=0;
    ptr=Tabs2Spaces(src);
    PathStringHash(ptr);
    Free(ptr);
  }
  for (flags=0;flags<2048;flags++)
    for (j=0;j<6;j++) {
      StrCpy(src," \t Ab C\t\tD\n\tEf $$ G \t");
      src[6]=CH_CURSOR;
      src[11]=CH_SHIFT_SPACE;
      res=MStrUtil(src,flags,ps_scales[j]);
      PathStringHash(res);
      Free(res);
    }
  for (i=0;i<65;i++)
    for (j=0;j<6;j++) {
      MemSet(src,CH_SPACE,i);
      StrCpy(src+i,"abc");
      ptr=ScaleIndent(src,ps_scales[j]);
      PathStringHash(ptr);
      Free(ptr);
    }
  "PathString:%d %016X\n",cnt,ps_hash;
}

PathString;
