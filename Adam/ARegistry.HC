//V5.03 Adam/ARegistry.HC up to RegOneTimePopUp. RegInit waits on
//sys_os_version and registry_version.

#help_index "Registry"
#define REGISTRY_FILENAME "~/Registry.HC.Z"
CDoc *sys_registry_doc=NULL;
I64 sys_msg_flags[1]={0};
F64 registry_version;

Bool RegCache()
{
  Bool old_silent;
  if (!sys_registry_doc) {
    old_silent=Silent;
    sys_registry_doc=DocRead(REGISTRY_FILENAME);
    Silent(old_silent);
    return FALSE;
  } else
    return TRUE;
}

public Bool RegDft(U8 *path,U8 *val,Bool is_adam_entry=FALSE)
{//Add code doc tree branch to registry.
  Bool res,unlock_doc;
  RegCache;
  unlock_doc=DocLock(sys_registry_doc);
  if (!DocTreeFind(sys_registry_doc,path)) {
    DocTreeMake(sys_registry_doc,path);
    DocPrint(sys_registry_doc,"%s",val);
    if (is_adam_entry) {
      if (Fs==adam_task)
	ExePrint("%s",val);
      else
	Adam("%s",val);
    }
    if (DrvIsWritable(*sys_registry_doc->filename.name))
      DocWrite(sys_registry_doc);
    res=FALSE;
  } else
    res=TRUE;
  if (unlock_doc)
    DocUnlock(sys_registry_doc);
  return res;
}

public I64 RegExe(U8 *path)
{//Execute doc tree branch in registry.
  RegCache;
  return DocTreeExe(sys_registry_doc,path);
}

public Bool RegWrite(U8 *path,U8 *fmt,...)
{//Rewrite doc tree branch in registry.
  Bool res;
  RegCache;
  res=DocTreeWriteJoin(sys_registry_doc,path,TRUE,fmt,argc,argv);
  return res;
}

public I64 RegCnt(U8 *path)
{//Tree branch cnt in registry.
  I64 res=0;
  CDocEntry *tree_branch,*start_indent,*end_indent;
  Bool unlock_doc=DocLock(sys_registry_doc);
  if (DocTreeFind(sys_registry_doc,path,
	&tree_branch,&start_indent,&end_indent)) {
    end_indent=end_indent->next;
    while (start_indent!=end_indent) {
      res++;
      start_indent=start_indent->next;
    }
  }
  if (unlock_doc)
    DocUnlock(sys_registry_doc);
  return res;
}

public Bool RegAppend(U8 *path,U8 *fmt,...)
{//Append to doc tree branch in registry.
  Bool res;
  RegCache;
  res=DocTreeAppendJoin(sys_registry_doc,path,TRUE,fmt,argc,argv);
  return res;
}
 
public Bool OneTimePopUp(U8 *_flags,I64 flag_num,U8 *msg)
{//See $LK,"::/Apps/X-Caliber/X-Caliber.HC"$.
  Bool res=FALSE;
  CDoc *doc=DocNew;
  CDocEntry *doc_e;
  if (!Bt(_flags,flag_num)) {
    if (msg) DocPrint(doc,"%s",msg);
    doc_e=DocPrint(doc,"\n$$CB,\"Do not show this msg again.\",LE=1$$");
    DocPrint(doc,"$$CM+CX,0,4$$$$BT,\"OKAY\",LE=1$$\n");
    if (PopUpMenu(doc)==1 && doc_e->de_flags&DOCEF_CHECKED_COLLAPSED) {
      LBts(_flags,flag_num);
      res=TRUE;
    }
    DocDel(doc);
  }
  return res;
}

U0 RegOneTimePopUp(I64 flag_num,U8 *msg)
{//You're not supposed to make system pop-up flags, only me.
  if (OneTimePopUp(sys_msg_flags,flag_num,msg))
    RegWrite("Adam/SysMsgFlags","sys_msg_flags[0]=0x%X;\n",
	  sys_msg_flags[0]);
}
