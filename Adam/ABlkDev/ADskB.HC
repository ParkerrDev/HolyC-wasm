//V5.03 Adam/ABlkDev/ADskB.HC's Size.
#help_index "File/Program Routines"
I64 Size1(CDirEntry *tmpde,I64 *_fuf_flags,I64 round_to)
{
  U8 buf[BLK_SIZE];
  I64 res=0,i;
  CDrv *dv;
  while (tmpde) {
    if ((i=tmpde->size) && Bt(_fuf_flags,FUf_EXPAND) &&
	  !(tmpde->attr&RS_ATTR_DIR) &&
	  FileAttr(tmpde->name)&RS_ATTR_COMPRESSED) {
      dv=Let2Drv(*tmpde->full_name);
      BlkRead(dv,buf,Clus2Blk(dv,tmpde->clus),1);
      i=(&buf)(CArcCompress *)->expanded_size;
    }
    if (round_to)
      i=CeilU64(tmpde->size,round_to);
    if (tmpde->attr&RS_ATTR_DIR)
      i+=Size1(tmpde->sub,_fuf_flags,round_to);
    tmpde->user_data=i;
    res+=i;
    tmpde=tmpde->next;
  }
  return res;
}
public I64 Size(U8 *files_find_mask="/*",U8 *fu_flags=NULL,I64 round_to=0)
{//Total size of files in mask. "+x" for expanded size.
//Does not include directory size of base directory, but
  //does include size of sub directories.
  I64 fuf_flags=0,res=0;
  CDirEntry *tmpde1=NULL;
  ScanFlags(&fuf_flags,Define("ST_FILE_UTIL_FLAGS"),"+r");
  ScanFlags(&fuf_flags,Define("ST_FILE_UTIL_FLAGS"),fu_flags);
  if (tmpde1=FilesFind(files_find_mask,fuf_flags&FUG_FILES_FIND)) {
    fuf_flags&=FUF_EXPAND;
    res=Size1(tmpde1,&fuf_flags,round_to);
    DirTreeDel(tmpde1);
  }
  return res;
}
