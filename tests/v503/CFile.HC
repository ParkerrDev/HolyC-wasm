I64 Sum(U8 *buf,I64 size)
{
  I64 i,res=0;
  for (i=0;i<size;i++)
    res=(res*31+buf[i])&0xFFFFFF;
  return res;
}

U0 CFileChk()
{
  U8 src[1300],buf[3*BLK_SIZE],*ptr;
  I64 i,size,a,b,c;
  CFile *f;
  for (i=0;i<1300;i++)
    src[i]=i*7+3;
  FileWrite("~/CFile.BIN",src,1300);
  f=FOpen("~/CFile.BIN","r");
  "%d %d %d %d\n",FSize(f),f->max_blk,f->flags&FF_CONTIGUOUS,f->fblk_num;
  a=FBlkRead(f,buf,1,2);
  "%d %d %d\n",a,f->fblk_num,Sum(buf,1300-BLK_SIZE);
  a=FBlkRead(f,buf,2,2);
  b=FBlkRead(f,buf,0);
  "%d %d %d\n",a,b,Sum(buf,BLK_SIZE);
  a=FBlkRead(f,buf);
  "%d %d %d\n",a,f->fblk_num,Sum(buf,BLK_SIZE);
  a=FBlkWrite(f,buf,0);
  b=DrvLock(f->dv);
  c=DrvLock(f->dv);
  "%d %d %d",a,b,c;
  a=DrvUnlock(f->dv);
  b=DrvUnlock(f->dv);
  " %d %d\n",a,b;
  FClose(f);
  "%d\n",FOpen("~/NotThere.BIN","r");
  for (i=0;i<BLK_SIZE;i++)
    buf[i]=0xA5;
  f=FOpen("~/CFile.BIN","w+");
  a=FBlkWrite(f,buf,3);
  "%d %d\n",f->max_blk,a;
  a=FBlkWrite(f,buf,1);
  "%d %d\n",a,f->fblk_num;
  FClose(f);
  ptr=FileRead("~/CFile.BIN",&size);
  "%d %d %d %d\n",size,Sum(ptr,1300),Sum(ptr+BLK_SIZE,BLK_SIZE),
	Sum(ptr+3*BLK_SIZE,BLK_SIZE);
  Free(ptr);
  f=FOpen("~/CFile2.BIN","w",3);
  "%d %d\n",FSize(f),f->max_blk;
  a=FBlkWrite(f,src,1,2);
  b=FBlkWrite(f,src,2,2);
  "%d %d\n",a,b;
  FClose(f);
  ptr=FileRead("~/CFile2.BIN",&size);
  "%d %d %d\n",size,Sum(ptr+BLK_SIZE,2*BLK_SIZE),Sum(src,2*BLK_SIZE);
  Free(ptr);
}

CFileChk;
