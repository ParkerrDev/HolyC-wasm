U8 *lm_needles[16]={"","A","Al","Alpha","Alp","Alpine","B","Beta",
  "beta","BET","betamax","Z","@A","a","alpha","\x82"};
U8 *lm_lists[3]={"Alpha\0@A\0Alpine\0Beta\0@B\0beta\0",
  "@First\0A\0@a\0AB\0\x82\0",""};
U64 lm_seed=0,lm_hash=0;
I64 lm_cnt=0;

I64 LmRand()
{
  lm_seed=lm_seed*6364136223846793005+1442695040888963407;
  return lm_seed>>32;
}

U0 LmMix(I64 val)
{
  lm_hash=(lm_hash^val)*0x100000001B3;
  lm_cnt++;
}

U0 ListMatch()
{
  I64 i,j,k,n,flags,len;
  U8 buf[128],needle[8],*ptr,*list;
  lm_seed=37;
  lm_hash=0xCBF29CE484222325;
  lm_cnt=0;
  for (i=0;i<3;i++)
    for (j=0;j<16;j++)
      for (flags=0;flags<8;flags++)
	LmMix(LstMatch(lm_needles[j],lm_lists[i],flags));
  LmMix(LstMatch(NULL,NULL));
  for (i=0;i<2048;i++) {
    ptr=list=buf;
    for (j=0;j<6;j++) {
      if (LmRand%3==0) *ptr++='@';
      len=1+LmRand%4;
      for (k=0;k<len;k++) *ptr++='A'+LmRand%6;
      *ptr++=0;
    }
    *ptr=0;
    n=LmRand%5;
    for (j=0;j<n;j++) {
      needle[j]='A'+LmRand%6;
      if (LmRand&1) needle[j]+='a'-'A';
    }
    needle[n]=0;
    for (flags=0;flags<8;flags++)
      LmMix(LstMatch(needle,list,flags));
  }
  "ListMatch:%016X:%d\n",lm_hash,lm_cnt;
}

ListMatch;
