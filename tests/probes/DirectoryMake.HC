U8 *dm_names[8]={"A","A","A/B","Missing/C",
  ".",".."," /Trim ","A//Again"};

U0 DirectoryMake()
{
  U8 *old_dir=DirCur,*cur;
  Bool old_silent=Silent,res[8],dirs[8];
  I64 i;
  Cd("B:/DirMake",TRUE);
  for (i=0;i<8;i++) {
    res[i]=DirMk(dm_names[i]);
    dirs[i]=IsDir(dm_names[i]);
  }
  cur=DirCur;
  Cd(old_dir);
  Silent(FALSE);
  for (i=0;i<8;i++) "%d:%d:%d\n",i,res[i],dirs[i];
  "%s\n",cur;
  Free(cur);
  Free(old_dir);
  Silent(old_silent);
}

DirectoryMake;
