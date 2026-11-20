//Kernel/Compress.HC: CompressBuf and ExpandBuf, 7 and 8 bit and none.

U0 CompressShow(U8 *src,I64 size)
{
  I64 i,sum=0;
  CArcCompress *arc=CompressBuf(src,size);
  U8 *dst=ExpandBuf(arc);
  for (i=0;i<arc->compressed_size;i++)
    sum=sum*31+arc(U8 *)[i];
  "%d %d %d %X %d %d\n",arc->compressed_size,arc->expanded_size,
	arc->compression_type,sum,!MemCmp(src,dst,size),dst[size];
  Free(dst);
  Free(arc);
}

U0 CompressExpand()
{
  I64 i;
  U8 buf[2048];
  CompressShow("",0);
  CompressShow("a",1);
  CompressShow("TOBEORNOTTOBEORTOBEORNOT",24);
  for (i=0;i<2048;i++)
    buf[i]=i*i>>3;
  CompressShow(buf,2048);
  for (i=0;i<2048;i++)
    buf[i]='a'+i%7;
  CompressShow(buf,2048);
  for (i=0;i<16;i++)
    buf[i]=i*0x9D+0x41;
  CompressShow(buf,16);
}

CompressExpand;
