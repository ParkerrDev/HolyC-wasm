U0 DirectoryTypes()
{
  I64 i;
  CDrv *dv;
  "Types:%d %d %d %d %d\n",sizeof(CBlkDev),sizeof(CDrv),
    sizeof(CBlkDevGlbls),sizeof(CDirContext),sizeof(CDirEntry);
  "Fields:%d %d %d %d %d %d %d %d\n",
    offset(CDrv.bd),offset(CDrv.fs_type),offset(CDrv.root_clus),
    offset(CBlkDev.flags),offset(CBlkDevGlbls.home_dir),
    offset(CBlkDevGlbls.let_to_drv),offset(CBlkDevGlbls.boot_drv_let),
    offset(CDirEntry.start);
  for (i='A';i<='Z';i++)
    if (dv=Let2Drv(i,FALSE))
      "Drive:%c %d\n",i,dv->fs_type;
  "Boot:%c Home:%s\n",blkdev.boot_drv_let,blkdev.home_dir;
}

DirectoryTypes;
