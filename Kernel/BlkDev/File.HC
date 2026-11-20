
U16 mon_start_days1[12]={0,31,59,90,120,151,181,212,243,273,304,334},
  mon_start_days2[12]={0,31,60,91,121,152,182,213,244,274,305,335};
CDate local_time_offset=0;

#define CDATE_YEAR_DAYS_INT	36524225
#define CDATE_BASE_DAY_OF_WEEK	0

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

I64 DayOfWeek(I64 i)
{//Day of week, given 32-bit day since AD 0.
  i+=CDATE_BASE_DAY_OF_WEEK;
  if (i>=0)
    return i % 7;
  else
    return 6-(6-i)%7;
}

U0 Date2Struct(CDateStruct *_ds,CDate cdt)
{//Cvt CDate to CDateStruct.
  I64 i,k,date=cdt.date;
  _ds->day_of_week=DayOfWeek(date);
  _ds->year=(date+1)*100000/CDATE_YEAR_DAYS_INT;
  i=YearStartDate(_ds->year);
  while (i>date) {
    _ds->year--;
    i=YearStartDate(_ds->year);
  }
  date-=i;
  if (YearStartDate(_ds->year+1)-i==365) {
    k=0;
    while (date>=mon_start_days1[k+1] && k<11)
      k++;
    date-=mon_start_days1[k];
  } else {
    k=0;
    while (date>=mon_start_days2[k+1] && k<11)
      k++;
    date-=mon_start_days2[k];
  }
  _ds->mon=k+1;
  _ds->day_of_mon=date+1;
  k=(625*15*15*3*cdt.time)>>21+1;
  _ds->sec10000=ModU64(&k,100);
  _ds->sec100=ModU64(&k,100);
  _ds->sec=ModU64(&k,60);
  _ds->min=ModU64(&k,60);
  _ds->hour  =k;
}

I64 FirstDayOfMon(I64 i)
{//First day of month, given 32-bit day since AD 0.
  CDateStruct ds;
  CDate cdt=0;
  cdt.date=i;
  Date2Struct(&ds,cdt);
  ds.day_of_mon=1;
  cdt=Struct2Date(&ds);
  return cdt.date;
}

I64 LastDayOfMon(I64 i)
{//Last day of month, given 32-bit day since AD 0.
  CDateStruct ds;
  CDate cdt=0;
  cdt.date=i;
  Date2Struct(&ds,cdt);
  ds.mon++;
  if (ds.mon==13) {
    ds.mon=0;
    ds.year++;
  }
  ds.day_of_mon=1;
  cdt=Struct2Date(&ds);
  return cdt.date-1;
}

I64 FirstDayOfYear(I64 i)
{//First day of year, given 32-bit day since AD 0.
  CDateStruct ds;
  CDate cdt=0;
  cdt.date=i;
  Date2Struct(&ds,cdt);
  ds.day_of_mon=1;
  ds.mon=1;
  cdt=Struct2Date(&ds);
  return cdt.date;
}

I64 LastDayOfYear(I64 i)
{//Last day of year, given 32-bit day since AD 0.
  CDateStruct ds;
  CDate cdt=0;
  cdt.date=i;
  Date2Struct(&ds,cdt);
  ds.day_of_mon=1;
  ds.mon=1;
  ds.year++;
  cdt=Struct2Date(&ds);
  return cdt.date-1;
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

Bool FilesFindMatch(U8 *_test_name,U8 *files_find_mask,I64 fuf_flags=0)
{//Does filename meet $LK,"Files Find",A="FI:::/Doc/FileUtils.DD"$ mask?
  I64 tn_len=StrLen(_test_name),mask_len=StrLen(files_find_mask);
  U8 *mask1=MAlloc(mask_len+1),*mask2=MAlloc(mask_len+1),
	*ptr,*test_name1,*test_name2;
  Bool res=FALSE;
  StrCpy(mask1,files_find_mask);
  if (StrOcc(_test_name,'/')) {
    test_name1=MAlloc(tn_len+1);
    test_name2=MAlloc(tn_len+1);
    StrCpy(test_name1,_test_name);
    StrLastRem(test_name1,"/",test_name2);
  } else {
    test_name1=NULL;
    test_name2=NULL;
  }
  while (TRUE) {
    StrFirstRem(mask1,";",mask2);
    if (!test_name2 || StrOcc(mask2,'/'))
      ptr=_test_name;
    else
      ptr=test_name2;
    if (*mask2) {
      if (*mask2=='!') {
	if (WildMatch(ptr,mask2+1)) {
	  res=FALSE;
	  break;
	}
      } else {
	if (WildMatch(ptr,mask2)) {
	  if (Bt(&fuf_flags,FUf_JUST_TXT) &&
		!FilesFindMatch(_test_name,FILEMASK_TXT)) {
	    res=FALSE;
	    break;
	  } else if (Bt(&fuf_flags,FUf_JUST_DD) &&
		!FilesFindMatch(_test_name,FILEMASK_DD)) {
	    res=FALSE;
	    break;
	  } else if (Bt(&fuf_flags,FUf_JUST_SRC) &&
		!FilesFindMatch(_test_name,FILEMASK_SRC)) {
	    res=FALSE;
	    break;
	  } else if (Bt(&fuf_flags,FUf_JUST_AOT) &&
		!FilesFindMatch(_test_name,FILEMASK_AOT)) {
	    res=FALSE;
	    break;
	  } else if (Bt(&fuf_flags,FUf_JUST_JIT) &&
		!FilesFindMatch(_test_name,FILEMASK_JIT)) {
	    res=FALSE;
	    break;
	  } else if (Bt(&fuf_flags,FUf_JUST_GR) &&
		!FilesFindMatch(_test_name,FILEMASK_GR)) {
	    res=FALSE;
	    break;
	  } else
	    res=TRUE;
	}
      }
    } else
      break;
  }
  Free(test_name1);
  Free(test_name2);
  Free(mask1);
  Free(mask2);
  return res;
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

//V5.03 Kernel/BlkDev/DskFind.HC.
CDirEntry *DirHostFilesFind(U8 *files_find_mask,
	I64 fuf_flags,CDirEntry *parent=NULL,I64 *_dir_size=NULL)
{//V5.03 FAT32FilesFind over the host store: "." and ".." but in the root.
  CDrv *dv=Fs->cur_dv;
  CDirHostNode *dir,*node;
  I64 i,entry_cnt=0,sub_dir_size;
  CDirEntry *res=NULL,*tmpde;
  if (fuf_flags&~FUG_FILES_FIND)
    throw('FUF');
  try {
    DrvLock(dv);
    dir=DirHostFind(dv,Fs->cur_dir);
    node=dir->child;
    if (dir->parent)
      i=-2;
    else
      i=0;
    while (i<0 || node) {
      tmpde=CAlloc(sizeof(CDirEntry));
      if (i==-2) {
	StrCpy(tmpde->name,".");
	tmpde->attr=RS_ATTR_DIR;
	tmpde->clus=dir;
      } else if (i==-1) {
	StrCpy(tmpde->name,"..");
	tmpde->attr=RS_ATTR_DIR;
	tmpde->clus=dir->parent;
      } else {
	StrCpy(tmpde->name,node->name);
	tmpde->clus=node;
	tmpde->size=node->size;
	tmpde->attr=node->attr;
	tmpde->datetime=node->datetime;
	node=node->next;
      }
      i++;
      entry_cnt++;
      tmpde->parent=parent;
      if (Bt(&fuf_flags,FUf_RECURSE) && tmpde->attr&RS_ATTR_DIR &&
	    *tmpde->name!='.') {
	tmpde->next=res;
	res=tmpde;
	tmpde->full_name=DirNameAbs(tmpde->name);
	DrvUnlock(dv);
	if (Cd(tmpde->name)) {
	  tmpde->sub=DirHostFilesFind(files_find_mask,fuf_flags,
		tmpde,&sub_dir_size);
	  tmpde->size=sub_dir_size;
	  Cd("..");
	}
	DrvLock(dv);
      } else {
	tmpde->full_name=FileNameAbs(tmpde->name);
	if ((tmpde->attr&RS_ATTR_DIR || !Bt(&fuf_flags,FUf_JUST_DIRS)) &&
	      !(Bt(&fuf_flags,FUf_RECURSE) &&
	      *tmpde->name=='.' && tmpde->attr&RS_ATTR_DIR) &&
	      FilesFindMatch(tmpde->full_name,files_find_mask,
	      fuf_flags)) {
	  tmpde->next=res;
	  res=tmpde;
	} else
	  DirEntryDel(tmpde);
      }
    }
    DrvUnlock(dv);
  } catch
    DrvUnlock(dv);
  if (_dir_size) //His clus count: blks of CDIR_SIZE entries.
    *_dir_size=(entry_cnt*CDIR_SIZE+BLK_SIZE-1)&-BLK_SIZE;
  return res;
}

//V5.03 Kernel/BlkDev/FileSysRedSea.HC's RedSeaFilesDel over the host store:
//the dir's nodes are his entries, and a node goes with its blks.
I64 DirHostFilesDel(CDrv *dv,U8 *cur_dir,U8 *files_find_mask,I64 fuf_flags,
		     Bool del_dir,Bool print_msg)
{
  CDirHostNode *dir,*ptr,*next;
  I64 res=0;
  Bool unlock_break;
  try {
    unlock_break=BreakLock;
    DrvLock(dv);
    if (dir=DirHostFind(dv,cur_dir))
      ptr=dir->child;
    else
      ptr=NULL;
    while (ptr) {
      next=ptr->next;
      if (*ptr->name!='.' && (del_dir || !ptr->is_dir) &&
	    FilesFindMatch(ptr->name,files_find_mask,fuf_flags)) {
	if (!ptr->is_dir) res++;
	if (print_msg)
	  "Del %s\n",ptr->name;
	DirHostNodeDel(ptr);
      }
      ptr=next;
    }
    DrvUnlock(dv);
    if (unlock_break)
      BreakUnlock;
  } catch {
    DrvUnlock(dv);
    if (unlock_break)
      BreakUnlock;
  }
  return res;
}

CDirEntry *FilesFind2(U8 *files_find_mask,I64 fuf_flags)
{
  CDrv *dv=Fs->cur_dv;
  CDirEntry *res=NULL;
  DrvChk(dv);
  res=DirHostFilesFind(files_find_mask,fuf_flags); //His switch on fs_type.
  if (res) {
    DirFilesSort(&res,SK_NAME);
    if (fuf_flags&(FUF_FLATTEN_TREE|FUF_JUST_FILES))
      DirFilesFlatten(res,&res,fuf_flags);
    if (fuf_flags&FUF_CLUS_ORDER)
      DirFilesSort(&res,SK_CLUS);
  }
  return res;
}

CDirEntry *FilesFind(U8 *files_find_mask,I64 fuf_flags=0)
{/* See $LK,"::/Doc/FileUtils.DD"$.

Find files and make a directory tree in memory.

When done, you free with $LK,"DirEntryDel",A="MN:DirEntryDel"$(),$LK,"DirEntryDel2",A="MN:DirEntryDel2"$(),
$LK,"DirTreeDel",A="MN:DirTreeDel"$() or $LK,"DirTreeDel2",A="MN:DirTreeDel2"$().

*/
  CDirEntry *res;
  CDirContext *dirc;
  if (fuf_flags&~FUG_FILES_FIND)
    throw('FUF');
  if (fuf_flags&FUF_SINGLE) {
    res=MAlloc(sizeof(CDirEntry));
    if (!FileFind(files_find_mask,res)) {
      Free(res);
      return NULL;
    }
  } else if (dirc=DirContextNew(files_find_mask,TRUE)) {
    res=FilesFind2(dirc->mask,fuf_flags);
    DirContextDel(dirc);
  } else
    return NULL;
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
{//MAlloc a terminated copy; resident files are explicit.
  CDirEntry de;
  CDirHostNode *node;
  U8 *abs=NULL,*res=NULL;
  I64 size=0,attr=0,blocks;
  CArcCompress *arc;
  try {
    abs=FileNameAbs(filename);
    if (FileFind(abs,&de,FUF_JUST_FILES|FUF_Z_OR_NOT_Z|FUF_SCAN_PARENTS)) {
      node=de.clus;
      Free(de.full_name);
      attr=FileAttr(node->name,node->attr);
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
  if (res && attr & RS_ATTR_COMPRESSED) {
    arc=res;
    size=arc->expanded_size;
    res=ExpandBuf(arc);
    Free(arc);
  }
  if (_attr) *_attr=attr;
  if (_size) *_size=size;
  return res;
}

I64 FileWrite(U8 *filename,U8 *fbuf,I64 size,CDate cdt=0,I64 attr=0)
{//Replace a virtual file; return its opaque node token, zero on refusal.
  CDirContext *dirc=NULL;
  CDirHostNode *parent,*node=NULL;
  U8 *abs=NULL,*data=NULL,*name,*ptr,*fbuf2=NULL;
  I64 used,len;
  try {
    abs=FileNameAbs(filename);
    name=abs;
    for (ptr=abs;*ptr;ptr++) if (*ptr=='/') name=ptr+1;
    attr=FileAttr(name,attr);
    if (attr&RS_ATTR_RESIDENT) throw('FsRes');
    if (attr&~(RS_ATTR_READ_ONLY|RS_ATTR_HIDDEN|RS_ATTR_SYSTEM|
	  RS_ATTR_ARCHIVE|RS_ATTR_CONTIGUOUS|RS_ATTR_COMPRESSED))
      throw('FsAttr');
    if (size<0) size=0;
    if (size && !fbuf) throw('FsBuf');
    if (attr&RS_ATTR_COMPRESSED) {//V5.03 DskFile.HC FileWrite.
      fbuf=CompressBuf(fbuf,size,Fs);
      size=fbuf(CArcCompress *)->compressed_size;
      fbuf2=fbuf;
    }
    if (!cdt) cdt=Now;
    if (dirc=DirContextNew(filename,FALSE,TRUE)) {
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
    Free(fbuf2);
  }
  Free(abs);
  Free(fbuf2);
  return node;
}

U0 DirHostSizeSet(CDirHostNode *node,I64 size)
{//Grow or cut a host file; what is new is zero.
  U8 *data=NULL;
  I64 used=dir_host_byte_cnt-node->size;
  if (size==node->size) return;
  if (!(0<=size<=DIR_HOST_BYTES_MAX-used)) throw('FsQuota');
  if (size) {
    data=ACAlloc(size);
    MemCpy(data,node->data,MinI64(size,node->size));
  }
  Free(node->data);
  node->data=data;
  node->size=size;
  dir_host_byte_cnt=used+size;
}

U0 DirHostBlkRead(CDirHostNode *node,U8 *buf,I64 blk,I64 cnt)
{//Blks [blk,blk+cnt) of a host file, zero past its end.
  I64 i=blk<<BLK_SIZE_BITS,n=cnt<<BLK_SIZE_BITS;
  MemSet(buf,0,n);
  if (i<node->size)
    MemCpy(buf,node->data+i,MinI64(n,node->size-i));
}

U0 DirHostBlkWrite(CDirHostNode *node,U8 *buf,I64 blk,I64 cnt)
{//Blks [blk,blk+cnt) into a host file, which grows to hold them.
  I64 i=blk<<BLK_SIZE_BITS,n=cnt<<BLK_SIZE_BITS;
  if (!(0<=blk<=DIR_HOST_BYTES_MAX>>BLK_SIZE_BITS-cnt)) throw('FsQuota');
  if (i+n>node->size) DirHostSizeSet(node,i+n);
  MemCpy(node->data+i,buf,n);
}

//V5.03 Kernel/BlkDev/DskClus.HC's Clus2Blk and DskBlk.HC's BlkRead. A host
//clus is its node, as a RedSea clus is its blk, and BlkRead reads that
//file's blks from its start: his drv_offset check, cache and switch on
//bd->type are the host store's.
I64 Clus2Blk(CDrv *dv,I64 c)
{//Drv clus num to blk num.
  DrvChk(dv);
  return c; //His switch on fs_type.
}

Bool BlkRead(CDrv *dv,U8 *buf, I64 blk, I64 cnt)
{//Read blk cnt from Drv to buf.
  Bool res=TRUE,unlock;
  if (cnt<=0) return TRUE;
  DrvChk(dv);
  try {
    unlock=DrvLock(dv);
    DirHostBlkRead(blk,buf,0,cnt);
    if (unlock)
      DrvUnlock(dv);
  } catch
    if (unlock)
      DrvUnlock(dv);
  return res;
}

//V5.03 Kernel/BlkDev/DskCFile.HC. A host volume's files act as his FAT32
//ones: not contiguous unless asked, and a write past the end grows the
//file. The host store keeps a file in one buffer, so both of his
//branches are DirHostBlkRead and DirHostBlkWrite of the file's node.

I64 FSize(CFile *f)
{//Report size of opened file in bytes.
  if (f)
    return f->de.size;
  else
    return 0;
}

CFile *FOpen(U8 *filename,U8 *flags,I64 cnt=0)
{//Allows flags "r","w","w+". "c" for contiguous.
//(It uses $LK,"StrOcc",A="MN:StrOcc"$() for 'w', 'r', '+', 'c')
  CFile *f=CAlloc(sizeof(CFile));
  U8 *full_name;
  Bool contiguous=StrOcc(flags,'c');

  f->clus=INVALID_CLUS;
  f->fblk_num=0;
  if (cnt>0)
    f->max_blk=cnt-1;
  else
    f->max_blk=I64_MAX;
  f->file_clus_num=INVALID_CLUS;
  full_name=FileNameAbs(filename);
  f->dv=Let2Drv(*full_name);
  if (f->dv->fs_type==FSt_REDSEA)
    contiguous=TRUE;
  if (contiguous) {
    f->flags|=FF_CONTIGUOUS;
    if (f->dv->fs_type!=FSt_REDSEA &&
	  !(FileAttr(filename) & RS_ATTR_CONTIGUOUS))
      throw('File');
  }
  f->clus_buf=CAlloc(f->dv->spc<<BLK_SIZE_BITS);
  if (StrOcc(flags,'w')) {
    f->flags=f->flags|FF_WRITE|FF_NEEDS_WRITE;
    if (StrOcc(flags,'+')) {
      if (FileFind(full_name,&f->de,FUF_JUST_FILES)) {
	Free(full_name);
	if (contiguous)
	  f->max_blk=(FSize(f)+BLK_SIZE-1)>>BLK_SIZE_BITS-1;
	return f;
      }
    }
//His Del, ClusAlloc and DirNew: the host store makes the entry at once.
    if (FileWrite(full_name,NULL,0) &&
	  FileFind(full_name,&f->de,FUF_JUST_FILES)) {
      Free(full_name);
      if (cnt>0) {//We pre-alloc the whole thing.
	f->de.size=cnt<<BLK_SIZE_BITS;
	DirHostSizeSet(f->de.clus,f->de.size);
      }
      return f;
    }
  } else {
    if (FileFind(full_name,&f->de,FUF_JUST_FILES)) {
      Free(full_name);
      f->max_blk=(FSize(f)+BLK_SIZE-1)>>BLK_SIZE_BITS-1;
      return f;
    }
  }
  Free(f->clus_buf);
  Free(full_name);
  Free(f);
  return NULL;
}

U0 FClose(CFile *f)
{//Close CFile, updating directory.
  CDirHostNode *node;
  if (f) {
    if (f->flags & FF_NEEDS_WRITE) {
      if (!(f->flags & FF_USE_OLD_DATETIME))
	f->de.datetime=Now;
      node=f->de.clus; //His DirNew.
      DirHostSizeSet(node,f->de.size);
      node->datetime=f->de.datetime;
    }
    Free(f->clus_buf);
    Free(f->de.full_name);
    Free(f);
  }
}

Bool FBlkRead(CFile *f,U8 *buf,I64 blk=FFB_NEXT_BLK,I64 cnt=1)
{//Read [nth,n+cnt) blks of file.
  CDrv *dv=f->dv;
  I64 c=f->de.clus;
  if (!f || !dv) return FALSE;
  if (blk==FFB_NEXT_BLK)
    blk=f->fblk_num;
  if (blk+cnt-1>f->max_blk)
    return FALSE;
  if (cnt<=0) return TRUE;
  DirHostBlkRead(c,buf,blk,cnt);
  blk+=cnt;
  f->fblk_num=blk;
  return TRUE;
}

Bool FBlkWrite(CFile *f,U8 *buf,I64 blk=FFB_NEXT_BLK,I64 cnt=1)
{//Write [nth,n+cnt) blks of file.
  CDrv *dv=f->dv;
  I64 c=f->de.clus;
  if (!f || !dv) return FALSE;
  if (blk==FFB_NEXT_BLK)
    blk=f->fblk_num;
  if (blk+cnt-1>f->max_blk)
    return FALSE;
  if (!(f->flags & FF_WRITE))
    return FALSE;
  if (cnt<=0) return TRUE;
  DirHostBlkWrite(c,buf,blk,cnt);
  blk+=cnt;
  if (f->de.size<blk<<BLK_SIZE_BITS)
    f->de.size=blk<<BLK_SIZE_BITS;
  f->fblk_num=blk;
  return TRUE;
}
