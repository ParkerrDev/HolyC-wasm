U64 file_bounds_hash=0xCBF29CE484222325;

U0 BoundsStr(U8 *ptr)
{
  while (*ptr) file_bounds_hash=(file_bounds_hash^*ptr++)*0x100000001B3;
  file_bounds_hash=(file_bounds_hash^0)*0x100000001B3;
}

U0 FileBounds()
{
  U8 *buf=MAlloc(4200),*path=MAlloc(4200),*alt=MAlloc(4200),
	*name=MAlloc(40),*res,*old_dir=DirCur;
  I64 i,j,n,size;
  Bool old_silent=Silent,found;
  CDirEntry de;
  for (n=4094;n<=4096;n++) {
    MemSet(buf,'A',n);
    buf[n-3]='.';
    buf[n]=0;
    res=ExtDft(buf,"HC");
    BoundsStr(res);
    Free(res);
    res=ExtChg(buf,"Z");
    BoundsStr(res);
    Free(res);
  }
  MemSet(buf,'A',4093);
  StrCpy(buf+4093,".HC.Z");
  res=ToggleZorNotZ(buf);
  BoundsStr(res);
  Free(res);
  StrCpy(path,"B:/");
  MemSet(name,'X',37);
  name[37]=0;
  for (i=0;i<107;i++) CatPrint(path,"%s/",name);
  for (n=26;n<=27;n++) {
    MemSet(name,'A',n);
    name[n]=0;
    StrCpy(path+4069,name);
    found=!!FileWrite(path,"a",1,0xB2D3D12345678);
    Silent(FALSE);
    "%d:%d:",StrLen(path),found;
    Silent;
    for (j=0;j<2;j++) {
      found=FileFind(path,&de,j*FUF_Z_OR_NOT_Z);
      Silent(FALSE);
      "%d:",found;
      Silent;
      BoundsStr(de.full_name);
      Free(de.full_name);
      res=FileNameAbs(path,j*FUF_Z_OR_NOT_Z);
      BoundsStr(res);
      Free(res);
    }
    Silent(FALSE);
    '\n';
    Silent;
  }
  MemSet(name,'C',27);
  name[27]=0;
  StrCpy(path+4069,name);
  StrCpy(alt,path);
  StrLastRem(alt,"/");
  StrLastRem(alt,"/");
  CatPrint(alt,"/%s.Z",name);
  FileWrite(alt,"z",1,0xB2D3D12345678);
  found=FileFind(path,&de,FUF_Z_OR_NOT_Z|FUF_SCAN_PARENTS);
  BoundsStr(de.full_name);
  Free(de.full_name);
  res=FileRead(path,&size);
  Silent(FALSE);
  "%d:%d:%c:%016X\n",found,size,*res,file_bounds_hash;
  Silent;
  Free(res);
  Cd(old_dir);
  Free(old_dir);
  Free(buf);
  Free(path);
  Free(alt);
  Free(name);
  Silent(old_silent);
}

FileBounds;
