I64 ai_sizes[17]={0,1,15,16,17,31,32,33,63,64,65,127,128,129,
  4095,4096,4097};

U0 AllocIdent()
{
  U8 *src,*dst,*tmp;
  I64 i,j,size,cnt=0;
  if (MAllocIdent(NULL) || AMAllocIdent(NULL) || MSize2(NULL))
    throw('Null');
  for (i=0;i<17;i++) {
    src=MAlloc(ai_sizes[i]);
    size=MSize(src);
    if (size<ai_sizes[i] || MSize2(src)<=size) throw('Size');
    for (j=0;j<size;j++) src[j]=j*13+i;
    dst=MAllocIdent(src);
    tmp=AMAllocIdent(src);
    if (dst==src || tmp==src || dst==tmp) throw('Alias');
    if (MSize(dst)<size || MSize(tmp)<size) throw('Size');
    for (j=0;j<size;j++)
      if (dst[j]!=src[j] || tmp[j]!=src[j]) throw('Copy');
    if (size) {
      dst[0]^=0xFF;
      if (src[0]!=tmp[0] || src[0]==dst[0]) throw('Alias');
    }
    Free(src);
    Free(dst);
    Free(tmp);
    cnt++;
  }
  "AllocIdent:%d\n",cnt;
}

AllocIdent;
