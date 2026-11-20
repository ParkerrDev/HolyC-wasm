
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
  I64 attr;
  CDate datetime;
};

CBlkDevGlbls blkdev;
CDrv dir_host_drvs[DRVS_NUM];
CBlkDev dir_host_bds[DRVS_NUM];
CDirHostNode *dir_host_nodes=NULL;
I64 dir_host_node_cnt=0,dir_host_byte_cnt=0;
Bool dir_host_ready=FALSE;

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
  if (is_dir) res->attr=RS_ATTR_DIR;
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

U0 DirHostNodeDel(CDirHostNode *node)
{//Unlink a node, and a dir's sub tree, then free them.
  CDirHostNode **_ptr;
  while (node->child)
    DirHostNodeDel(node->child);
  _ptr=&node->parent->child;
  while (*_ptr!=node)
    _ptr=&(*_ptr)->next;
  *_ptr=node->next;
  _ptr=&dir_host_nodes;
  while (*_ptr!=node)
    _ptr=&(*_ptr)->all_next;
  *_ptr=node->all_next;
  dir_host_byte_cnt-=node->size;
  dir_host_node_cnt--;
  Free(node->data);
  Free(node);
}

CDrv *DirHostVolume(U8 letter)
{//A drive like any other; its blks and files are the host store's.
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
  if (letter=='B') //V5.03's B: is a RAM disk and C: a hard drive.
    bd->type=BDT_RAM;
  else
    bd->type=BDT_ATA;
  bd->flags=BDF_INITIALIZED;
  bd->blk_size=BLK_SIZE;
  bd->first_drv_let=letter;
  dv->dv_signature=DRV_SIGNATURE_VAL;
  dv->drv_let=letter;
  dv->fs_type=FSt_HOST;
  dv->spc=1; //As RedSea: a clus is a blk.
  dv->bd=bd;
  dv->root_clus=root;
  blkdev.let_to_drv[i]=dv;
  return dv;
}

CDirHostNode *DirHostDirNew(CDirHostNode *parent,CDrv *dv,U8 *name)
{//Stamp a runtime-created directory before publishing it.
  CDate date=Now;
  CDirHostNode *res=DirHostNodeNew(parent,dv,name,TRUE);
  res->datetime=date;
  return res;
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
	  DirHostDirNew(parent,dv,part);
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

//V5.03 Kernel/BlkDev/DskDirB.HC Dir, with the defaults of KernelC.HH:283,
//the prototype everything after the kernel sees.
I64 Dir(U8 *files_find_mask="*",Bool full=FALSE)
{//List directory.
  CDirEntry *tmpde1=NULL,*tmpde2;
  U8 *st;
  CDateStruct ds;
  I64 csize=0xFFFF,c=0xFFFF,res=0;
  tmpde1=FilesFind(files_find_mask);
  if (!(st=DirCur))
    PrintErr("Invalid Drive\n");
  else {
    if (tmpde1) {
      Free(st);
      st=MAllocIdent(tmpde1->full_name);
      StrLastRem(st,"/");
      if (!st[2])
	StrCpy(st+2,"/");
//Find max columns
      tmpde2=tmpde1;
      while (tmpde2) {
	if (tmpde2->size>csize)
	  csize=tmpde2->size;
	if (tmpde2->clus>c)
	  c=tmpde2->clus;
	tmpde2=tmpde2->next;
      }
      csize=Bsr(csize)/4+1;
      c=Bsr(c)/4+1;

      "$$MA,T=\"Directory\",LM=\"PopUpCd;Dir;\n\"$$ of %s\n",st;
      if (full)
	"__DATE__ __TIME__ %*ts %*ts\n",
	      csize,"SIZE",c,"BLK";
      else
	"DATE_ TIME_ %*ts\n",csize,"SIZE";
      while (tmpde1) {
	tmpde2=tmpde1->next;
	res++;
	if (full)
	  "%D %T %0*tX %0*tX ",tmpde1->datetime,tmpde1->datetime,
		csize,tmpde1->size,c,tmpde1->clus;
	else {
	  Date2Struct(&ds,tmpde1->datetime+local_time_offset);
	  "%02d/%02d %02d:%02d %0*tX ",ds.mon,ds.day_of_mon,ds.hour,ds.min,
		csize,tmpde1->size;
	}
	if (tmpde1->attr & RS_ATTR_DIR)
	  PutDirLink(tmpde1->name,tmpde1->full_name);
	else
	  PutFileLink(tmpde1->name,tmpde1->full_name);
	'\n';
	DirEntryDel(tmpde1);
	tmpde1=tmpde2;
      }
    } else
      "No matching entries\n";
    Free(st);
  }
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
      DirHostDirNew(parent,dirc->dv,name);
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
      child->attr=FileAttr(child->name);
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

//V5.03 Kernel/BlkDev/DskDirA.HC.
U0 DirEntryDel(CDirEntry *tmpde)
{//Free node returned from $LK,"FilesFind",A="MN:FilesFind"$().  Doesn't Free user_data.
//Does not change the directory on disk.
  if (tmpde) {
    Free(tmpde->full_name);
    Free(tmpde);
  }
}

U0 DirEntryDel2(CDirEntry *tmpde)
{//Free node returned from $LK,"FilesFind",A="MN:FilesFind"$().  Frees user_data
//Does not change the directory on disk.
  if (tmpde) {
    Free(tmpde->full_name);
    Free(tmpde->user_data);
    Free(tmpde);
  }
}

U0 DirTreeDel(CDirEntry *tmpde)
{//Free tree returned from $LK,"FilesFind",A="MN:FilesFind"$().  Doesn't Free user_data.
//Does not change the directory on disk.
  CDirEntry *tmpde2;
  while (tmpde) {
    tmpde2=tmpde->next;
    if (tmpde->sub)
      DirTreeDel(tmpde->sub);
    DirEntryDel(tmpde);
    tmpde=tmpde2;
  }
}

U0 DirTreeDel2(CDirEntry *tmpde)
{//Free tree returned from $LK,"FilesFind",A="MN:FilesFind"$().  Frees user_data
//Does not change the directory on disk.
  CDirEntry *tmpde2;
  while (tmpde) {
    tmpde2=tmpde->next;
    if (tmpde->sub)
      DirTreeDel2(tmpde->sub);
    DirEntryDel2(tmpde);
    tmpde=tmpde2;
  }
}

I64 DirEntryCompareName(CDirEntry *e1,CDirEntry *e2)
{
  U8 buf1[CDIR_FILENAME_LEN],buf2[CDIR_FILENAME_LEN],
	buf3[CDIR_FILENAME_LEN],buf4[CDIR_FILENAME_LEN];
  I64 d1=0,d2=0;
  if (e1->attr & RS_ATTR_DIR)
    d1=1;
  if (e2->attr & RS_ATTR_DIR)
    d2=1;
  if (d1!=d2)
    return d2-d1;
  else {
    StrCpy(buf1,e1->name);
    StrCpy(buf2,e2->name);
    FileExtRem(buf1,buf3);
    FileExtRem(buf2,buf4);
    if (d1=StrCmp(buf3,buf4))
      return d1;
    return StrCmp(buf1,buf2);
  }
}

I64 DirEntryCompareClus(CDirEntry *e1,CDirEntry *e2)
{
  return e1->clus-e2->clus;
}

#define SK_NAME		0
#define SK_CLUS	1

U0 DirFilesSort(CDirEntry **_tmpde,I64 key)
{
  I64 i,cnt;
  CDirEntry *tmpde=*_tmpde,*tmpde1,**sort_buf;
  if (tmpde) {
    cnt=LinkedLstCnt(tmpde);
    if (cnt>1) {
      sort_buf=MAlloc(cnt*sizeof(U8 *));
      i=0;
      tmpde1=tmpde;
      while (tmpde1) {
	sort_buf[i++]=tmpde1;
	tmpde1=tmpde1->next;
      }
      switch [key] {
	case SK_NAME:
	  QSortI64(sort_buf,cnt,&DirEntryCompareName);
	  break;
	case SK_CLUS:
	  QSortI64(sort_buf,cnt,&DirEntryCompareClus);
	  break;
      }
      tmpde=sort_buf[0];
      *_tmpde=tmpde;
      for (i=0;i<cnt-1;i++) {
	tmpde1=sort_buf[i];
	tmpde1->next=sort_buf[i+1];
      }
      tmpde1=sort_buf[i];
      tmpde1->next=NULL;
      Free(sort_buf);

      tmpde1=tmpde;
      while (tmpde1) {
	if (tmpde1->sub)
	  DirFilesSort(&tmpde1->sub,key);
	tmpde1=tmpde1->next;
      }
    } else
      if (tmpde->sub)
	DirFilesSort(&tmpde->sub,key);
  }
}

CDirEntry *DirFilesFlatten(CDirEntry *tmpde,CDirEntry **_res,I64 fuf_flags)
{//Returns last node
  CDirEntry *tmpde1;
  Bool del;
  if (tmpde)
    while (TRUE) {
      tmpde1=tmpde->next;
      if (!(tmpde->attr&RS_ATTR_DIR)||!(fuf_flags&FUF_JUST_FILES)) {
	_res=*_res=tmpde;
	del=FALSE;
      } else
	del=TRUE;
      if (tmpde->sub) {
	_res=DirFilesFlatten(tmpde->sub,_res,fuf_flags);
	tmpde->sub=NULL;
      }
      if (del)
	DirEntryDel(tmpde);
      if (tmpde1)
	tmpde=tmpde1;
      else
	break;
    }
  *_res=NULL;
  return _res;
}

//V5.03 Kernel/BlkDev/DskDirA.HC PutFileLink and PutDirLink.
U0 PutFileLink(U8 *filename,U8 *full_name=NULL,I64 line=0,Bool plain_text=FALSE)
{//Put $LK,"DolDoc",A="FI:::/Doc/DolDocOverview.DD"$ file,line link to StdOut, $LK,"DocPut",A="MN:DocPut"$.
  U8 *st;
  if (!filename) return;
  if (IsRaw) {
    if (line)
      "%s,%04d",filename,line;
    else
      "%s",filename;
  } else {
//LK_DOC,LK_DOC_ANCHOR,LK_DOC_FIND,LK_DOC_LINE
    if (filename[0]=='A'&&filename[2]==':') {
      if (line) //See $LK,"SpriteEdText",A="MN:SpriteEdText"$()
	"$$LK,\"%s,%04d\",A=\"AL:%s,%d\"$$",filename+3,line,filename+3,line;
      else
	"$$LK,\"%s\",A=\"AI:%s\"$$",filename+3,filename+3;
    } else {
      if (!full_name)
	full_name=st=FileNameAbs(filename);
      else
	st=NULL;
      if (plain_text) {
	if (line)
	  "$$LK,\"%s,%04d\",A=\"PL:%s,%d\"$$",filename,line,full_name,line;
	else
	  "$$LK,\"%s\",A=\"PI:%s\"$$",filename,full_name;
      } else {
	if (line)
	  "$$LK,\"%s,%04d\",A=\"FL:%s,%d\"$$",filename,line,full_name,line;
	else
	  "$$LK,\"%s\",A=\"FI:%s\"$$",filename,full_name;
      }
      Free(st);
    }
  }
}

U0 PutDirLink(U8 *dirname,U8 *full_name=NULL)
{//Put $LK,"DolDoc",A="FI:::/Doc/DolDocOverview.DD"$ dir macro to StdOut, $LK,"DocPut",A="MN:DocPut"$.
  U8 *st;
  if (!dirname) return;
  if (IsRaw)
    "%s",dirname;
  else {
    if (!full_name)
      full_name=st=DirNameAbs(dirname);
    else
      st=NULL;
    "$$MA,T=\"%s\",LM=\"Cd(\\\"%s\\\");Dir;\n\"$$",dirname,full_name;
    Free(st);
  }
}

//V5.03 Kernel/BlkDev/DskStrA.HC DirFile.
U8 *DirFile(U8 *dirname,U8 *name=NULL,U8 *_extension=NULL)
{/*Strips file from dirname, scans for file upward until found or
returns default.

("/Kernel/KHashA.HC.Z",NULL,NULL)	returns "D:/Kernel"
("/Kernel",NULL,"PRJ.Z")		returns "D:/Kernel/Kernel.PRJ.Z"
("/Kernel/BlkDev",NULL,"PRJ.Z")		returns "D:/Kernel/Kernel.PRJ.Z"
("/Apps/Psalmody","Load","HC.Z")	returns "D:/Apps/Psalmody/Load.HC.Z"
*/
  U8 *st=DirNameAbs(dirname),*st2,*st3,*res,*dft=NULL,*ext;
  if (_extension && *_extension) {
    if (*_extension=='.')
      ext=StrNew(_extension);
    else
      ext=MStrPrint(".%s",_extension);
  } else
    ext=StrNew("");
  while (StrOcc(st,'/')&&!IsDir(st))
    StrLastRem(st,"/");
  while (StrOcc(st,'/')) {
    st2=StrNew(st);
    st3=StrNew(st);
    StrLastRem(st2,"/",st3);

    if (name)
      res=MStrPrint("%s/%s%s",st,name,ext);
    else {
      if (*ext)
	res=MStrPrint("%s/%s%s",st,st3,ext);
      else
	res=StrNew(st);
    }
    if (!dft)
      dft=StrNew(res);
    if (!*ext && (!name||!*name) || FileFind(res)) {
      Free(st3);
      Free(st2);
      Free(st);
      Free(dft);
      Free(ext);
      return res;
    }
    Free(st);
    st=st2;
    Free(st3);
  }
  Free(st);
  Free(ext);
  return dft;
}
