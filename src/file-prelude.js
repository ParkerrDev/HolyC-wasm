//Native filename and whole-file APIs over the explicitly virtual volume.
export const FILE_SRC=String.raw`
public class CDateStruct
{
  U8 sec10000,sec100,sec,min,hour,day_of_week,day_of_mon,mon;
  I32 year;
};

U16 mon_start_days1[12]={0,31,59,90,120,151,181,212,243,273,304,334},
  mon_start_days2[12]={0,31,60,91,121,152,182,213,244,274,305,335};
CDate local_time_offset=0;

I64 YearStartDate(I64 year)
{//32-bit day since AD 0, given year number.
  I64 y1=year-1,yd4000=y1/4000,yd400=y1/400,yd100=y1/100,yd4=y1/4;
  return year*365+yd4-yd100+yd400-yd4000;
}

CDate Struct2Date(CDateStruct *_ds)
{//Convert native calendar fields to the packed date.
  CDate cdt;
  I64 i1,i2;
  i1=YearStartDate(_ds->year);
  i2=YearStartDate(_ds->year+1);
  if (i2-i1==365) i1+=mon_start_days1[_ds->mon-1];
  else i1+=mon_start_days2[_ds->mon-1];
  cdt.date=i1+_ds->day_of_mon-1;
  cdt.time=(_ds->sec10000+100*(_ds->sec100+100*(_ds->sec+
	60*(_ds->min+60*_ds->hour))))<<21/(15*15*3*625);
  return cdt;
}

CDate Now()
{//Read one UTC calendar sample from the host clock device.
  CDateStruct ds;
  U64 value=__date_utc;
  if (value==U64_MAX) throw('Clock');
  MemSet(&ds,0,sizeof(CDateStruct));
  ds.sec=value.u8[0];
  ds.min=value.u8[1];
  ds.hour=value.u8[2];
  ds.day_of_week=value.u8[3];
  ds.day_of_mon=value.u8[4];
  ds.mon=value.u8[5];
  ds.year=value.u16[3];
  return Struct2Date(&ds)-local_time_offset;
}

U8 *FileExtDot(U8 *src)
{//Find the first extension dot using the native pathname rules.
  I64 ch;
  while (ch=*src++)
    if (ch=='.' && *src!='/' && *src!='.') return src-1;
  return NULL;
}

U8 *FileExtRem(U8 *src,U8 *dst=NULL)
{//Remove the extension, optionally copying it without the dot.
  U8 *ptr;
  if (ptr=FileExtDot(src)) {
    if (dst) StrCpy(dst,ptr+1);
    *ptr=0;
  } else if (dst)
    *dst=0;
  return dst;
}

Bool IsDotZ(U8 *filename)
{
  I64 i=StrLen(filename);
  if (StrOcc(filename,'.')>1 && filename[i-1]=='Z' &&
	filename[i-2]=='.')
    return TRUE;
  return FALSE;
}

Bool IsDotC(U8 *filename)
{
  I64 i=StrLen(filename);
  if (StrOcc(filename,'.')>1 && filename[i-1]=='C' &&
	filename[i-2]=='.')
    return TRUE;
  return FALSE;
}

I64 FileAttr(U8 *name,I64 attr=0)
{//Derive compression and contiguous attributes from the extension.
  if (IsDotZ(name)) attr|=RS_ATTR_COMPRESSED;
  else attr&=~RS_ATTR_COMPRESSED;
  if (IsDotC(name)) attr|=RS_ATTR_CONTIGUOUS;
  return attr;
}

U8 *ToggleZorNotZ(U8 *name)
{//MAlloc the alternate compressed or uncompressed spelling.
  U8 *res;
  if (IsDotZ(name)) {
    if (StrLen(name)-2>DIR_HOST_PATH_MAX) throw('FsPath');
    res=MAlloc(StrLen(name)-1);
    MemCpy(res,name,StrLen(name)-2);
    res[StrLen(name)-2]=0;
  } else {
    if (StrLen(name)+2>DIR_HOST_PATH_MAX) throw('FsPath');
    res=MStrPrint("%s.Z",name);
  }
  return res;
}

U8 *ExtChg(U8 *filename,U8 *extension)
{//MAlloc a filename with its extension replaced.
  U8 *res,*dot=FileExtDot(filename);
  I64 len;
  if (dot) len=dot-filename;
  else len=StrLen(filename);
  if (len+StrLen(extension)+1>DIR_HOST_PATH_MAX) throw('FsPath');
  res=MAlloc(len+StrLen(extension)+2);
  MemCpy(res,filename,len);
  res[len]='.';
  StrCpy(res+len+1,extension);
  return res;
}

U8 *ExtDft(U8 *filename,U8 *extension)
{//MAlloc a filename, appending the extension only when absent.
  if (FileExtDot(filename)) {
    DirHostPathChk(filename);
    return StrNew(filename);
  }
  return ExtChg(filename,extension);
}

U8 *FileNameAbs(U8 *_filename,I64 fuf_flags=0)
{//MAlloc the native absolute filename, optionally finding its spelling.
  U8 *res=NULL,*filename,*buf,*input=NULL,*path=NULL,*name=NULL,
	*dir=NULL;
  CDirEntry de;
  I64 len;
  DirHostPathChk(_filename);
  try {
    input=filename=MStrUtil(_filename,
	  SUF_REM_LEADING|SUF_REM_TRAILING|SUF_REM_CTRL_CHARS);
    path=buf=StrNew(filename);
    if (*buf && buf[1]==':') {
      buf+=2;
      filename+=2;
    }
    name=MAlloc(StrLen(input)+1);
    StrLastRem(buf,"/",name);
    if (*filename=='/' && !*buf) StrCpy(buf,"/");
    dir=DirNameAbs(path);
    len=StrLen(dir)+StrLen(name);
    if (dir[StrLen(dir)-1]!='/') len++;
    if (len>DIR_HOST_PATH_MAX) throw('FsPath');
    res=MAlloc(len+1);
    StrCpy(res,dir);
    if (res[StrLen(res)-1]!='/') StrCpy(res+StrLen(res),"/");
    StrCpy(res+StrLen(res),name);
    if (fuf_flags && FileFind(res,&de,fuf_flags|FUF_JUST_FILES)) {
      Free(res);
      res=de.full_name;
    }
  } catch {
    Free(res);
    Free(input);
    Free(path);
    Free(name);
    Free(dir);
  }
  Free(input);
  Free(path);
  Free(name);
  Free(dir);
  return res;
}

CDirHostNode *FileHostChild(CDirContext *dirc,I64 fuf_flags)
{//Find a native single filename in the current virtual directory.
  CDirHostNode *parent,*res;
  if (!FileNameChk(dirc->mask)) {
    "Invalid FileName: \"%s\".\n",dirc->mask;
    return NULL;
  }
  parent=DirHostFind(dirc->dv,Fs->cur_dir);
  if (!parent) return NULL;
  if (!StrCmp(dirc->mask,".")) res=parent;
  else if (!StrCmp(dirc->mask,"..")) {
    res=parent->parent;
    if (!res) res=parent;
  } else
    res=DirHostChild(parent,dirc->mask);
  if (res && (fuf_flags&FUF_JUST_DIRS && !res->is_dir ||
	fuf_flags&FUF_JUST_FILES && res->is_dir))
    res=NULL;
  return res;
}

Bool FileFind(U8 *filename,CDirEntry *_de=NULL,I64 fuf_flags=0)
{//Find a file; the caller owns the returned full_name.
  I64 i,j,pass,len;
  U8 *tmp,*full=NULL;
  CDirContext *dirc=NULL;
  CDirHostNode *node=NULL;
  CDirEntry de;
  Bool old_silent=IsSilent;
  if (fuf_flags&~FUG_FILE_FIND) throw('FUF');
  if (!filename || *filename && filename[1]==':' &&
	!Let2Drv(*filename,FALSE))
    return FALSE;
  DirHostPathChk(filename);
  MemSet(&de,0,sizeof(CDirEntry));
  try {
    j=1;
    if (fuf_flags&FUF_Z_OR_NOT_Z) j=2;
    for (pass=0;pass<2 && !node;pass++)
      for (i=0;i<j && !node &&
	    (!pass || fuf_flags&FUF_SCAN_PARENTS);i++) {
	Silent;
	dirc=DirContextNew(filename);
	Silent(old_silent);
	if (dirc) {
	  if (i) {
	    if (IsDotZ(filename)) dirc->mask[StrLen(dirc->mask)-2]=0;
	    else {
	      tmp=MStrPrint("%s.Z",dirc->mask);
	      Free(dirc->mask);
	      dirc->mask=tmp;
	    }
	  }
	  if (!pass) node=FileHostChild(dirc,fuf_flags);
	  else
	    while (!node && StrCmp(Fs->cur_dir,"/")) {
	      Cd("..");
	      node=FileHostChild(dirc,fuf_flags);
	    }
	  if (node && _de) {
	    len=StrLen(Fs->cur_dir)+StrLen(dirc->mask)+2;
	    if (StrCmp(Fs->cur_dir,"/")) len++;
	    if (len>DIR_HOST_PATH_MAX) throw('FsPath');
	    if (StrCmp(Fs->cur_dir,"/"))
	      full=MStrPrint("%C:%s/%s",Drv2Let,Fs->cur_dir,dirc->mask);
	    else full=MStrPrint("%C:/%s",Drv2Let,dirc->mask);
	    StrCpy(de.name,dirc->mask);
	    de.attr=node->attr;
	    de.size=node->size;
	    de.clus=node;
	    de.datetime=node->datetime;
	    de.full_name=full;
	  }
	  DirHostContextAbort(dirc);
	  dirc=NULL;
	}
      }
  } catch {
    Silent(old_silent);
    if (dirc) DirHostContextAbort(dirc);
    Free(full);
  }
  if (_de) MemCpy(_de,&de,sizeof(CDirEntry));
  return !!node;
}

U8 *FileRead(U8 *filename,I64 *_size=NULL,I64 *_attr=NULL)
{//MAlloc a terminated copy; native compressed and resident files are explicit.
  CDirEntry de;
  CDirHostNode *node;
  U8 *abs=NULL,*res=NULL;
  I64 size=0,attr=0,blocks;
  try {
    abs=FileNameAbs(filename);
    if (FileFind(abs,&de,FUF_JUST_FILES|FUF_Z_OR_NOT_Z|FUF_SCAN_PARENTS)) {
      node=de.clus;
      Free(de.full_name);
      attr=FileAttr(node->name,node->attr);
      if (attr&RS_ATTR_COMPRESSED) throw('FsArc');
      if (attr&RS_ATTR_RESIDENT) throw('FsRes');
      size=node->size;
      blocks=(size+511)>>9;
      res=MAlloc(blocks<<9+1);
      MemCpy(res,node->data,size);
      res[size]=0;
    } else
      "File not found: \"%s\".\n",filename;
  } catch {
    Free(abs);
    Free(res);
  }
  Free(abs);
  if (_size) *_size=size;
  if (_attr) *_attr=attr;
  return res;
}

I64 FileWrite(U8 *filename,U8 *fbuf,I64 size,CDate cdt=0,I64 attr=0)
{//Replace a virtual file; return its opaque node token, zero on refusal.
  CDirContext *dirc=NULL;
  CDirHostNode *parent,*node=NULL;
  U8 *abs=NULL,*data=NULL,*name,*ptr;
  I64 used,len;
  try {
    abs=FileNameAbs(filename);
    name=abs;
    for (ptr=abs;*ptr;ptr++) if (*ptr=='/') name=ptr+1;
    attr=FileAttr(name,attr);
    if (attr&RS_ATTR_COMPRESSED) throw('FsArc');
    if (attr&RS_ATTR_RESIDENT) throw('FsRes');
    if (attr&~(RS_ATTR_READ_ONLY|RS_ATTR_HIDDEN|RS_ATTR_SYSTEM|
	  RS_ATTR_ARCHIVE|RS_ATTR_CONTIGUOUS))
      throw('FsAttr');
    if (!cdt) cdt=Now;
    if (dirc=DirContextNew(filename,FALSE,TRUE)) {
      if (size<0) size=0;
      len=StrLen(Fs->cur_dir)+StrLen(dirc->mask)+2;
      if (StrCmp(Fs->cur_dir,"/")) len++;
      if (len>DIR_HOST_PATH_MAX) throw('FsPath');
      if (!FileNameChk(dirc->mask) || !StrCmp(dirc->mask,".") ||
	    !StrCmp(dirc->mask,".."))
	"Invalid FileName: \"%s\".\n",dirc->mask;
      else {
	parent=DirHostFind(dirc->dv,Fs->cur_dir);
	if (parent) {
	  node=DirHostChild(parent,dirc->mask);
	  if (node && node->is_dir) node=NULL;
	  else {
	    used=dir_host_byte_cnt;
	    if (node) used-=node->size;
	    if (size>DIR_HOST_BYTES_MAX-used) throw('FsQuota');
	    if (size && !fbuf) throw('FsBuf');
	    if (size) {
	      data=AMAlloc(size);
	      MemCpy(data,fbuf,size);
	    }
	    if (!node) node=DirHostNodeNew(parent,dirc->dv,dirc->mask,FALSE);
	    Free(node->data);
	    node->data=data;
	    data=NULL;
	    node->size=size;
	    node->attr=attr;
	    node->datetime=cdt;
	    dir_host_byte_cnt=used+size;
	  }
	}
      }
      DirHostContextAbort(dirc);
      dirc=NULL;
    }
  } catch {
    if (dirc) DirHostContextAbort(dirc);
    Free(abs);
    Free(data);
  }
  Free(abs);
  return node;
}
`;
