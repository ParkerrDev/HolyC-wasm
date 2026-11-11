//Native directory records and a bounded session-owned virtual volume.
export const DIR_TYPES_SRC=String.raw`
#define CDIR_FILENAME_LEN 38
#define BD_SIGNATURE_VAL 'BDSV'
#define BDF_INIT_IN_PROGRESS 0x80
#define FSt_NULL 0
#define FSt_REDSEA 1
#define FSt_FAT32 2
#define FSt_ISO9660 3
#define FSt_NTFS 4
#define FSt_UNKNOWN 5
#define FSt_TYPES_NUM 6
#define FSG_TYPE_MASK 0x7FFF
#define FSt_HOST 0x1000
#define BDT_HOST 0x1000
extern class CFile;
extern class CFAT32FileInfoSect;
extern class CCacheBlk;

public class CDirEntry
{
  CDirEntry *next,*parent,*sub;
  U8	*full_name;
  I64	user_data,user_data2;

  U0	start;
  U16	attr;
  U8	name[CDIR_FILENAME_LEN];
  I64	clus,size;
  CDate datetime;
};
public class CBlkDev
{
  CBlkDev *lock_fwding; //If two blkdevs on same controller, use just one lock
  I64	locked_flags;
  U32	bd_signature,
	type,flags;
  U8	first_drv_let,unit,pad[2];
  U32	base0,base1,
	blk_size;
  I64	drv_offset,init_root_dir_blks,
	max_blk;
  U16	*dev_id_record;
  U8	*RAM_dsk,
	*file_dsk_name;
  CFile *file_dsk;
  CTask *owning_task;
  F64	last_time;
  U32	max_reads,max_writes;
};

class CFreeLst
{
  CFreeLst *next,*last;
  I64	start,size;
};

#define DRVS_NUM		26

#define DRV_SIGNATURE_VAL	'DVSV'
public class CDrv
{
//Don't access ->drv_let directly in case a drive has been remapped.
  //Use $LK,"Drv2Let",A="MN:Drv2Let"$().
  I64	locked_flags;
  U32	dv_signature;
  U8	drv_let,pad;
  U16	fs_type;
  I64	drv_offset,
	size,
	prt_num,
	file_system_info_sect,
	fat1,fat2,
	root_clus,
	data_area,
	spc; //sectors per clus
  CDate fat32_local_time_offset;
  CTask *owning_task;
  CBlkDev *bd;

  CFAT32FileInfoSect *fis;
  I64	fat_blk_dirty,
	cur_fat_blk_num;
  U32	*cur_fat_blk;
  CFreeLst *next_free,*last_free;
};

public class CBlkDevGlbls
{
  CBlkDev *blkdevs;
  U8	*dft_iso_filename;	//$TX,"\"::/Tmp/CDDVD.ISO\"",D="DFT_ISO_FILENAME"$
  U8	*dft_iso_c_filename;	//$TX,"\"::/Tmp/CDDVD.ISO.C\"",D="DFT_ISO_C_FILENAME"$
  U8	*tmp_filename;
  U8	*home_dir;
  CCacheBlk *cache_base,*cache_ctrl,**cache_hash_table;
  I64	cache_size,read_cnt,write_cnt;
  CDrv	*drvs,*let_to_drv[32];
  I64	mount_ide_auto_cnt,
	ins_base0,ins_base1;	//Install cd/dvd controller.
  U8	boot_drv_let,first_hd_drv_let,first_dvd_drv_let;
  Bool	dvd_boot_is_good,ins_unit,pad[3];
};

public class CDirContext
{
  CDrv	*old_dv,*dv;
  U8	*old_dir,*mask;
};
`;

export const DIR_SRC=String.raw`
#define DIR_HOST_NODES_MAX 4096
#define DIR_HOST_BYTES_MAX 0x4000000
#define DIR_HOST_PATH_MAX 4096

class CDirHostNode
{
  CDirHostNode *all_next,*parent,*next,*child;
  CDrv *dv;
  U8 name[CDIR_FILENAME_LEN];
  Bool is_dir;
  U8 *data;
  I64 size;
};

CBlkDevGlbls blkdev;
CDrv dir_host_drvs[DRVS_NUM];
CBlkDev dir_host_bds[DRVS_NUM];
CDirHostNode *dir_host_nodes=NULL;
I64 dir_host_node_cnt=0,dir_host_byte_cnt=0;
Bool dir_host_ready=FALSE;
U32 char_bmp_filename[16]={0,0x03FF73FB,0xEFFFFFFF,0x6FFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0,0,0,0,0,0,0,0};

U8 *AStrNew(U8 *buf)
{//Copy a string into the session kernel's heap.
  U8 *res;
  I64 size=1;
  if (buf) size=StrLen(buf)+1;
  res=AMAlloc(size);
  if (buf) MemCpy(res,buf,size);
  else *res=0;
  return res;
}

Bool FileNameChk(U8 *filename)
{//Check a native filename without checking existence.
  U8 *ptr=filename;
  if (!filename || !*ptr) return FALSE;
  if (*ptr=='.') {
    if (!ptr[1]) return TRUE;
    if (ptr[1]=='.' && !ptr[2]) return TRUE;
  }
  if (StrLen(filename)>=CDIR_FILENAME_LEN) return FALSE;
  while (*ptr)
    if (!Bt(char_bmp_filename,*ptr++)) return FALSE;
  return TRUE;
}

CDirHostNode *DirHostChild(CDirHostNode *parent,U8 *name)
{
  CDirHostNode *tmpd;
  if (!parent || !parent->is_dir) return NULL;
  for (tmpd=parent->child;tmpd;tmpd=tmpd->next)
    if (!StrCmp(tmpd->name,name)) return tmpd;
  return NULL;
}

CDirHostNode *DirHostNodeNew(CDirHostNode *parent,CDrv *dv,U8 *name,
	Bool is_dir)
{//Publish a session-owned node only after allocation succeeds.
  CDirHostNode *res;
  if (dir_host_node_cnt>=DIR_HOST_NODES_MAX) throw('FsQuota');
  res=ACAlloc(sizeof(CDirHostNode));
  res->parent=parent;
  res->dv=dv;
  res->is_dir=is_dir;
  StrCpy(res->name,name);
  if (parent) {
    res->next=parent->child;
    parent->child=res;
  }
  res->all_next=dir_host_nodes;
  dir_host_nodes=res;
  dir_host_node_cnt++;
  return res;
}

CDrv *DirHostVolume(U8 letter)
{//Create an explicitly virtual volume, with no block-device emulation.
  I64 i;
  CDrv *dv;
  CBlkDev *bd;
  CDirHostNode *root;
  letter=ToUpper(letter);
  if (!('A'<=letter<='Z')) throw('Drv');
  i=letter-'A';
  dv=&dir_host_drvs[i];
  if (dv->dv_signature==DRV_SIGNATURE_VAL) return dv;
  root=DirHostNodeNew(NULL,dv,"",TRUE);
  bd=&dir_host_bds[i];
  bd->bd_signature=BD_SIGNATURE_VAL;
  bd->type=BDT_HOST;
  bd->first_drv_let=letter;
  dv->dv_signature=DRV_SIGNATURE_VAL;
  dv->drv_let=letter;
  dv->fs_type=FSt_HOST;
  dv->bd=bd;
  dv->root_clus=root;
  blkdev.let_to_drv[i]=dv;
  return dv;
}

CDirHostNode *DirHostFind(CDrv *dv,U8 *path)
{//Look up a canonical absolute path using exact byte names.
  CDirHostNode *tmpd;
  U8 name[CDIR_FILENAME_LEN];
  I64 len,i=0;
  if (!dv || dv->fs_type!=FSt_HOST) throw('FsHost');
  if (!path || *path!='/') return NULL;
  tmpd=dv->root_clus;
  while (path[i]) {
    i++;
    len=0;
    while (path[i] && path[i]!='/') {
      if (len>=CDIR_FILENAME_LEN-1) return NULL;
      name[len++]=path[i++];
    }
    name[len]=0;
    if (len) {
      tmpd=DirHostChild(tmpd,name);
      if (!tmpd) return NULL;
    } else if (path[i])
      return NULL;
  }
  return tmpd;
}

U0 DirHostPathChk(U8 *path)
{
  I64 i;
  if (path)
    for (i=0;path[i];i++)
      if (i>=DIR_HOST_PATH_MAX) throw('FsPath');
}

U0 DirHostClear()
{
  CDirHostNode *tmpd=dir_host_nodes,*next;
  while (tmpd) {
    next=tmpd->all_next;
    Free(tmpd->data);
    Free(tmpd);
    tmpd=next;
  }
  Free(blkdev.home_dir);
  Free(blkdev.tmp_filename);
  Free(Fs->cur_dir);
  Fs->cur_dir=NULL;
  Fs->cur_dv=NULL;
  dir_host_nodes=NULL;
  dir_host_node_cnt=dir_host_byte_cnt=0;
  dir_host_ready=FALSE;
  MemSet(&blkdev,0,sizeof(blkdev));
  MemSet(dir_host_drvs,0,sizeof(dir_host_drvs));
  MemSet(dir_host_bds,0,sizeof(dir_host_bds));
}

U0 DirHostInit()
{//Initialize directory state before user global initializers.
  CDrv *dv;
  if (dir_host_ready) return;
  try {
    blkdev.drvs=dir_host_drvs;
    blkdev.blkdevs=dir_host_bds;
    blkdev.boot_drv_let='C';
    blkdev.home_dir=AStrNew("C:/Home");
    blkdev.tmp_filename=AStrNew("~/Tmp.DD.Z");
    DirHostVolume('B');
    dv=DirHostVolume('C');
    DirHostNodeNew(dv->root_clus,dv,"Home",TRUE);
    DirHostNodeNew(dv->root_clus,dv,"Tmp",TRUE);
    Fs->cur_dv=dv;
    Fs->cur_dir=StrNew(blkdev.home_dir+2);
    if (!__fs_seed) throw('FsSeed');
    dir_host_ready=TRUE;
  } catch
    DirHostClear;
}

U0 DirHostTaskInit(CTask *task)
{//Start at home after the child has a registered heap owner.
  U8 *dir;
  if (blkdev.home_dir) {
    dir=StrNew(blkdev.home_dir+2,task);
    task->cur_dv=blkdev.let_to_drv[*blkdev.home_dir-'A'];
  } else
    dir=StrNew("/Home",task);
  task->cur_dir=dir;
}

CDrv *DrvChk(CDrv *dv,Bool except=TRUE)
{//Check for a valid drive record.
  if (!dv || dv->dv_signature!=DRV_SIGNATURE_VAL) {
    if (except) throw('Drv');
    return NULL;
  }
  return dv;
}

U8 Drv2Let(CDrv *dv=NULL)
{
  if (!dv) dv=Fs->cur_dv;
  return DrvChk(dv)->drv_let;
}

U8 Let2Let(U8 drv_let=0)
{
  if (!drv_let) drv_let=Drv2Let;
  else if (drv_let==':') drv_let=blkdev.boot_drv_let;
  else if (drv_let=='~') drv_let=*blkdev.home_dir;
  return ToUpper(drv_let);
}

CDrv *Let2Drv(U8 drv_let=0,Bool except=TRUE)
{
  CDrv *dv;
  if (!drv_let) dv=Fs->cur_dv;
  else {
    drv_let=Let2Let(drv_let);
    if (!('A'<=drv_let<='Z')) {
      if (except) throw('Drv');
      return NULL;
    }
    dv=blkdev.let_to_drv[drv_let-'A'];
  }
  return DrvChk(dv,except);
}

Bool Drv(U8 drv_let)
{//Select a virtual volume and reset its current directory.
  CDrv *dv=Let2Drv(drv_let);
  U8 *dir;
  if (dv->fs_type!=FSt_HOST) throw('FsHost');
  dir=StrNew("/");
  Free(Fs->cur_dir);
  Fs->cur_dir=dir;
  Fs->cur_dv=dv;
  return TRUE;
}

U8 *DirCur(CTask *task=NULL,CTask *mem_task=NULL)
{//MAlloc the current directory with its drive letter.
  U8 *st;
  if (!task) task=Fs;
  if (!task->cur_dir) return NULL;
  st=MAlloc(StrLen(task->cur_dir)+3,mem_task);
  *st=Drv2Let(task->cur_dv);
  st[1]=':';
  StrCpy(st+2,task->cur_dir);
  return st;
}

U8 *DirNameAbs(U8 *_dirname)
{//MAlloc the native absolute directory spelling without lookup.
  I64 maxlen;
  U8 drv[3],*res,*buf=NULL,*tail=NULL,*part=NULL,*dirname,
	*input=NULL;
  DirHostPathChk(_dirname);
  if (!Fs->cur_dir || !*Fs->cur_dir) return StrNew(_dirname);
  try {
    input=dirname=MStrUtil(_dirname,
	  SUF_REM_LEADING|SUF_REM_TRAILING|SUF_REM_CTRL_CHARS);
    *drv=Drv2Let;
    drv[1]=':';
    drv[2]=0;
    maxlen=MaxI64(StrLen(Fs->cur_dir),StrLen(blkdev.home_dir))+3+
	  StrLen(dirname);
    buf=MAlloc(maxlen);
    part=MAlloc(maxlen);
    if (*dirname && dirname[1]==':') {
      if (*dirname==':') *drv=blkdev.boot_drv_let;
      else if (*dirname=='~') *drv=*blkdev.home_dir;
      else *drv=*dirname;
      dirname+=2;
      StrCpy(buf,"/");
    } else
      StrCpy(buf,Fs->cur_dir);
    if (*dirname=='/') {
      StrCpy(buf,"/");
      dirname++;
    }
    tail=StrNew(dirname);
    while (*tail) {
      StrFirstRem(tail,"/",part);
      if (!*part) StrCpy(buf,"/");
      else if (!StrCmp(part,"..")) {
	StrLastRem(buf,"/");
	if (!*buf) StrCpy(buf,"/");
      } else if (!StrCmp(part,"~")) {
	StrCpy(buf,blkdev.home_dir+2);
	*drv=*blkdev.home_dir;
      } else if (StrCmp(part,".")) {
	if (StrCmp(buf,"/")) StrCpy(buf+StrLen(buf),"/");
	StrCpy(buf+StrLen(buf),part);
      }
    }
    if (StrLen(buf)+2>DIR_HOST_PATH_MAX) throw('FsPath');
    res=MAlloc(StrLen(buf)+3);
    StrCpy(res,drv);
    StrCpy(res+2,buf);
  } catch {
    Free(buf);
    Free(tail);
    Free(part);
    Free(input);
  }
  Free(buf);
  Free(tail);
  Free(part);
  Free(input);
  return res;
}

U0 HomeSet(U8 *dirname)
{//Set the session's native home directory spelling.
  U8 *abs=DirNameAbs(dirname),*home;
  try home=AStrNew(abs);
  catch Free(abs);
  Free(abs);
  Free(blkdev.home_dir);
  blkdev.home_dir=home;
}

Bool Cd(U8 *dirname=NULL,Bool make_dirs=FALSE)
{//Change directory, retaining the last valid prefix after failure.
  I64 maxlen;
  U8 *input=NULL,*dir=NULL,*part=NULL,*tmp;
  CDrv *dv;
  CDirHostNode *parent,*node;
  Bool res=TRUE;
  DirHostPathChk(dirname);
  if (!dirname) dirname="~";
  else if (!*dirname) return TRUE;
  if (dirname[1]==':') {
    if (Fs->cur_dv!=Let2Drv(*dirname) && !Drv(*dirname)) return FALSE;
    dirname+=2;
  }
  if (*dirname=='/' || !*dirname || !Fs->cur_dir) {
    tmp=StrNew("/");
    Free(Fs->cur_dir);
    Fs->cur_dir=tmp;
    if (*dirname=='/') dirname++;
  }
  try {
    input=MStrUtil(dirname,
	  SUF_REM_LEADING|SUF_REM_TRAILING|SUF_REM_CTRL_CHARS);
    maxlen=MaxI64(StrLen(Fs->cur_dir),StrLen(blkdev.home_dir))+
	  StrLen(input)+3;
    dir=MAlloc(maxlen);
    part=MAlloc(maxlen);
    StrCpy(dir,Fs->cur_dir);
    while (*input && res) {
      StrFirstRem(input,"/",part);
      if (!*part) StrCpy(dir,"/");
      else if (!StrCmp(part,"..")) {
	StrLastRem(dir,"/");
	if (!*dir) StrCpy(dir,"/");
      } else if (!StrCmp(part,"~")) {
	StrCpy(dir,blkdev.home_dir+2);
	if (Fs->cur_dv!=Let2Drv('~')) res=Drv('~');
      } else if (StrCmp(part,".")) {
	if (StrLen(dir)+StrLen(part)+2+(StrCmp(dir,"/")!=0)>
	      DIR_HOST_PATH_MAX)
	  throw('FsPath');
	dv=Fs->cur_dv;
	parent=DirHostFind(dv,dir);
	node=DirHostChild(parent,part);
	res=node && node->is_dir;
	if (!res && make_dirs && parent && parent->is_dir &&
	      FileNameChk(part) && !node) {
	  DirHostNodeNew(parent,dv,part,TRUE);
	  "Make Directory:%s\n",part;
	  res=TRUE;
	}
	if (res) {
	  if (StrCmp(dir,"/")) StrCpy(dir+StrLen(dir),"/");
	  StrCpy(dir+StrLen(dir),part);
	} else
	  "File not found: \"%s\".\n",part;
      }
    }
    if (StrLen(dir)+2>DIR_HOST_PATH_MAX) throw('FsPath');
    tmp=StrNew(dir);
    Free(Fs->cur_dir);
    Fs->cur_dir=tmp;
  } catch {
    Free(input);
    Free(dir);
    Free(part);
  }
  Free(input);
  Free(dir);
  Free(part);
  return res;
}

U0 DirContextDel(CDirContext *dirc,Bool restore=TRUE)
{//Restore the saved drive and current directory, then release the context.
  U8 *dir;
  if (!dirc) return;
  try {
    if (restore) {
      if (!(dirc->old_dv->bd->flags&BDF_INIT_IN_PROGRESS)) {
	if (dirc->old_dir) {
	  Drv(Drv2Let(dirc->old_dv));
	  Cd(dirc->old_dir);
	}
      } else {
	dir=StrNew("/");
	Free(Fs->cur_dir);
	Fs->cur_dv=dirc->old_dv;
	Fs->cur_dir=dir;
      }
    }
  } catch {
    Free(dirc->old_dir);
    Free(dirc->mask);
    Free(dirc);
  }
  Free(dirc->old_dir);
  Free(dirc->mask);
  Free(dirc);
}

U0 DirHostContextAbort(CDirContext *dirc)
{//Restore a constructor's saved state without allocating during failure.
  if (dirc->old_dir) {
    Free(Fs->cur_dir);
    Fs->cur_dir=dirc->old_dir;
    Fs->cur_dv=dirc->old_dv;
  }
  Free(dirc->mask);
  Free(dirc);
}

CDirContext *DirContextNew(U8 *_mask,Bool make_mask=FALSE,
	Bool make_dirs=FALSE,Bool no_mask=FALSE)
{//Save directory state and split the native directory/mask expression.
  Bool valid=TRUE,old_silent=IsSilent;
  I64 mask_len;
  U8 *buf=NULL,*mask,*tmp_mask=NULL,*semicolon_mask=NULL,*tmp;
  CDirContext *dirc;
  DirHostPathChk(_mask);
  mask_len=StrLen(_mask);
  dirc=CAlloc(sizeof(CDirContext));
  try {
    dirc->old_dv=Fs->cur_dv;
    dirc->old_dir=StrNew(Fs->cur_dir);
    tmp_mask=mask=MStrUtil(_mask,
	  SUF_REM_LEADING|SUF_REM_TRAILING|SUF_REM_CTRL_CHARS);
    if (*mask && mask[1]==':') {
      if (Fs->cur_dv!=Let2Drv(*mask) && !Drv(*mask)) valid=FALSE;
      mask+=2;
    }
    if (*mask=='~' && Fs->cur_dv!=Let2Drv('~') && !Drv('~'))
      valid=FALSE;
    dirc->dv=Fs->cur_dv;
    DrvChk(dirc->dv);
    buf=MAlloc(mask_len+2);
    StrCpy(buf,mask);
    dirc->mask=MAlloc(mask_len+2);
    if (no_mask) *dirc->mask=0;
    else if (StrOcc(buf,';')) {
      semicolon_mask=MAlloc(mask_len+2);
      StrCpy(semicolon_mask,mask);
      StrFirstRem(semicolon_mask,";",buf);
      StrLastRem(buf,"/",dirc->mask);
      CatPrint(dirc->mask,";%s",semicolon_mask);
      Free(semicolon_mask);
      semicolon_mask=NULL;
    } else
      StrLastRem(buf,"/",dirc->mask);
    if (*mask=='/' && !*buf) StrCpy(buf,"/");
    if (*buf && !Cd(buf,make_dirs)) valid=FALSE;
    if (valid && make_mask) {
      if (!*dirc->mask) {
	tmp=StrNew("*");
	Free(dirc->mask);
	dirc->mask=tmp;
      } else if (!make_dirs || FileNameChk(dirc->mask)) {
	Silent;
	if (Cd(dirc->mask,make_dirs)) {
	  tmp=StrNew("*");
	  Free(dirc->mask);
	  dirc->mask=tmp;
	}
	Silent(old_silent);
      }
    }
  } catch {
    Silent(old_silent);
    Free(buf);
    Free(tmp_mask);
    Free(semicolon_mask);
    DirHostContextAbort(dirc);
  }
  Free(buf);
  Free(tmp_mask);
  if (!valid) {
    DirContextDel(dirc);
    dirc=NULL;
  }
  return dirc;
}

Bool IsDir(U8 *dir_name)
{//Check directory existence without leaving a changed current directory.
  U8 *mask=MStrPrint("%s/*",dir_name);
  Bool res=FALSE,old_silent=Silent;
  CDirContext *dirc;
  try {
    if (dirc=DirContextNew(mask)) {
      DirContextDel(dirc);
      res=TRUE;
    }
  } catch {
    Silent(old_silent);
    Free(mask);
  }
  Free(mask);
  Silent(old_silent);
  return res;
}

Bool DirMk(U8 *filename,I64 entry_cnt=0)
{//Make a directory in the session volume.
  U8 *name=NULL;
  CDirHostNode *parent;
  CDirContext *dirc;
  Bool res=FALSE;
  if (entry_cnt) throw('FsHost');
  if (!(dirc=DirContextNew(filename))) return FALSE;
  try {
    name=MStrUtil(dirc->mask,
	  SUF_REM_LEADING|SUF_REM_TRAILING|SUF_REM_CTRL_CHARS);
    parent=DirHostFind(dirc->dv,Fs->cur_dir);
    if (StrLen(Fs->cur_dir)+StrLen(name)+2+
	  (StrCmp(Fs->cur_dir,"/")!=0)>DIR_HOST_PATH_MAX)
      throw('FsPath');
    if (FileNameChk(name) && StrCmp(name,".") && StrCmp(name,"..") &&
	  parent && parent->is_dir && !DirHostChild(parent,name)) {
      DirHostNodeNew(parent,dirc->dv,name,TRUE);
      "Make Directory:%s\n",filename;
      res=TRUE;
    }
  } catch {
    Free(name);
    DirHostContextAbort(dirc);
  }
  Free(name);
  DirContextDel(dirc);
  return res;
}

Bool DirHostSeed(U8 *path,U8 *bytes,I64 size,Bool directory=FALSE)
{//Seed exact absolute byte paths; reject aliases instead of normalizing them.
  I64 i,len,part_start;
  U8 name[CDIR_FILENAME_LEN],*data=NULL;
  CDrv *dv;
  CDirHostNode *node,*child;
  DirHostPathChk(path);
  if (!path || StrLen(path)<3 || path[1]!=':' || path[2]!='/' ||
	!('A'<=ToUpper(*path)<='Z') || size<0 ||
	size>DIR_HOST_BYTES_MAX || size && !bytes || directory && size)
    return FALSE;
  i=3;
  while (path[i]) {
    len=0;
    while (path[i] && path[i]!='/') {
      if (len>=CDIR_FILENAME_LEN-1) return FALSE;
      name[len++]=path[i++];
    }
    name[len]=0;
    if (!FileNameChk(name) || !StrCmp(name,".") || !StrCmp(name,".."))
      return FALSE;
    if (path[i] && !path[++i] && !directory) return FALSE;
  }
  dv=DirHostVolume(*path);
  node=dv->root_clus;
  i=3;
  if (!path[i]) return directory;
  while (path[i]) {
    part_start=i;
    while (path[i] && path[i]!='/') i++;
    len=i-part_start;
    MemCpy(name,path+part_start,len);
    name[len]=0;
    if (path[i]) i++;
    child=DirHostChild(node,name);
    if (path[i] || directory) {
      if (child && !child->is_dir) return FALSE;
      if (!child) child=DirHostNodeNew(node,dv,name,TRUE);
    } else {
      if (child && child->is_dir) return FALSE;
      len=dir_host_byte_cnt;
      if (child) len-=child->size;
      if (size>DIR_HOST_BYTES_MAX-len) throw('FsQuota');
      if (size) {
	data=AMAlloc(size);
	MemCpy(data,bytes,size);
      }
      try {
	if (!child) child=DirHostNodeNew(node,dv,name,FALSE);
      } catch
	Free(data);
      Free(child->data);
      child->data=data;
      child->size=size;
      dir_host_byte_cnt=len+size;
    }
    node=child;
  }
  return TRUE;
}

Bool DirHostReady()
{
  return dir_host_ready;
}

CDirHostNode *DirHostNext(CDirHostNode *node=NULL)
{
  if (!node) return dir_host_nodes;
  return node->all_next;
}

U8 *DirHostName(CDirHostNode *node)
{//MAlloc a node's exact absolute byte path for the host bridge.
  CDirHostNode *tmpd;
  I64 len=2,at,size;
  U8 *res;
  for (tmpd=node;tmpd->parent;tmpd=tmpd->parent)
    len+=StrLen(tmpd->name)+1;
  if (len==2) len=3;
  res=MAlloc(len+1);
  res[len]=0;
  at=len;
  for (tmpd=node;tmpd->parent;tmpd=tmpd->parent) {
    size=StrLen(tmpd->name);
    at-=size;
    MemCpy(res+at,tmpd->name,size);
    res[--at]='/';
  }
  res[0]=Drv2Let(node->dv);
  res[1]=':';
  if (!node->parent) res[2]='/';
  return res;
}

U8 *DirHostData(CDirHostNode *node)
{
  return node->data;
}

I64 DirHostSize(CDirHostNode *node)
{
  return node->size;
}

Bool DirHostIsDir(CDirHostNode *node)
{
  return node->is_dir;
}

I64 DirHostMaxPath()
{
  return DIR_HOST_PATH_MAX;
}

I64 DirHostMaxBytes()
{
  return DIR_HOST_BYTES_MAX;
}

I64 DirHostMaxNodes()
{
  return DIR_HOST_NODES_MAX;
}
`;
