I64 file_sizes[7]={0,1,511,512,513,10000,-9};
U8 *file_queries[16]={"A.TXT","a.txt","../Parent","Parent",
  "Choice","Only","Inner",".","..","","Missing","Missing/X",
  "B:/FileState/A.TXT","B:/FileState/Inner/A.TXT","~/None",
  "B:/FileState/Inner/../Choice"};
U64 file_hash=0xCBF29CE484222325;

U0 FileVal(I64 value)
{
  file_hash=(file_hash^value)*0x100000001B3;
}

U0 FileStr(U8 *ptr)
{
  if (!ptr) FileVal(-1);
  else {
    while (*ptr) FileVal(*ptr++);
    FileVal(0);
  }
}

U0 FileState()
{
  I64 i,j,size,attr,flags,error,blocks;
  CDate date=0xB2D3D12345678;
  U8 *old_dir=DirCur,*buf=MAlloc(10000),*data,*cur,*abs;
  Bool old_silent=Silent,res;
  CDirEntry de;
  for (i=0;i<10000;i++) buf[i]=i*29+i>>5;
  Cd("B:/FileState/Inner",TRUE);
  for (i=0;i<7;i++) {
    FileVal(!!FileWrite("A.TXT",buf,file_sizes[i],date));
    size=attr=-1;
    data=FileRead("A.TXT",&size,&attr);
    FileVal(!!data);
    FileVal(size);
    FileVal(attr&~RS_ATTR_CONTIGUOUS);
    blocks=(size+511)>>9;
    FileVal(MSize(data)>=blocks<<9+1);
    for (j=0;j<=size;j++) FileVal(data[j]);
    FileVal(FileFind("A.TXT",&de));
    FileVal(de.size);
    FileVal(de.attr&~RS_ATTR_CONTIGUOUS);
    FileVal(de.datetime);
    FileVal(!!de.clus);
    FileStr(de.name);
    FileStr(de.full_name);
    Free(de.full_name);
    Free(data);
  }
  FileWrite("A.TXT","Final",5,date,RS_ATTR_READ_ONLY|RS_ATTR_HIDDEN);
  FileWrite("../Parent","P",1,date);
  FileWrite("../Choice","P",1,date);
  FileWrite("Choice.Z","A",1,date);
  FileWrite("Only.Z","Z",1,date);
  for (i=0;i<16;i++) {
    size=attr=-1;
    data=FileRead(file_queries[i],&size,&attr);
    FileVal(!!data);
    FileVal(size);
    FileVal(attr&~RS_ATTR_CONTIGUOUS);
    for (j=0;j<size;j++) FileVal(data[j]);
    Free(data);
    for (j=0;j<16;j++) {
      flags=0;
      if (j&1) flags|=FUF_JUST_DIRS;
      if (j&2) flags|=FUF_JUST_FILES;
      if (j&4) flags|=FUF_Z_OR_NOT_Z;
      if (j&8) flags|=FUF_SCAN_PARENTS;
      MemSet(&de,0x55,sizeof(CDirEntry));
      res=FileFind(file_queries[i],&de,flags);
      FileVal(res);
      FileVal(de.attr&RS_ATTR_DIR);
      if (!(de.attr&RS_ATTR_DIR)) FileVal(de.size);
      FileStr(de.name);
      FileStr(de.full_name);
      FileVal(!!de.clus);
      Free(de.full_name);
      abs=FileNameAbs(file_queries[i],flags);
      FileStr(abs);
      Free(abs);
      cur=DirCur;
      FileStr(cur);
      Free(cur);
    }
  }
  MemSet(&de,0x55,sizeof(CDirEntry));
  FileVal(FileFind(NULL,&de));
  FileVal(de.user_data);
  FileVal(FileFind("Y:/None",&de));
  FileVal(de.user_data);
  error=0;
  try FileFind("A.TXT",&de,1);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  FileVal(error);
  Cd(old_dir);
  Free(old_dir);
  Free(buf);
  Silent(FALSE);
  "FileState:%016X\n",file_hash;
  Silent(old_silent);
}

FileState;
