U64 StringUtilHash(U8 *str)
{
  U64 res=0;
  while (*str) res=res*65599+*str++;
  return res;
}

U0 StringUtil()
{
  U8 src[384],dst[384],work[384],bits[64],*ptr;
  I64 i,j,k,len,changed;
  for (i=0;i<8;i++) src[i]=CH_SPACE;
  for (i=1;i<256;i++) src[i+7]=i;
  for (i=263;i<280;i++) src[i]=CH_SPACE;
  src[280]='\t';src[281]='\r';src[282]='\n';src[283]=0;
  for (k=0;k<2048;k++) {
    StrCpy(work,src);
    ptr=StrUtil(work,k);
    "%d %d %d %016X\n",k,ptr==work,StrLen(work),StringUtilHash(work);
  }
  for (k=0;k<128;k++) {
    len=0;
    for (i=0;i<k%8;i++) src[len++]='a'+i;
    for (i=0;i<k/8;i++) src[len++]=CH_SPACE;
    src[len++]='\t';src[len++]='x';src[len++]='\n';
    for (i=0;i<k%17;i++) src[len++]=CH_SPACE;
    src[len++]='y';src[len]=0;
    changed=Spaces2Tabs(dst,src);
    StrCpy(work,src);
    j=Spaces2Tabs(work,work);
    "%d %d %d %d %016X %016X\n",k,changed,j,StrLen(dst),
	  StringUtilHash(dst),StringUtilHash(work);
  }
  for (i=0;i<64;i++) bits[i]=(i*73+19)&255;
  for (i=0;i<128;i++)
    for (j=0;j<=32;j++)
      "%d %d %08X\n",i,j,BFieldExtU32(bits,i,j);
}

StringUtil;
