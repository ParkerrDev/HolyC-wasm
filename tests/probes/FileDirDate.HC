U0 FileDirDate()
{
  U8 *old_dir=DirCur;
  Bool old_silent=Silent;
  CDate before,after,date;
  CDirEntry de;
  Cd("B:/DirDate",TRUE);
  before=Now;
  DirMk("Made");
  after=Now;
  FileFind("Made",&de);
  date=de.datetime;
  Free(de.full_name);
  Silent(FALSE);
  "%d:",before<=date<=after;
  Silent;
  FileWrite("Made/Inside.TXT","a",1);
  FileFind("Made",&de);
  Silent(FALSE);
  "%d\n",date==de.datetime;
  Silent;
  Free(de.full_name);
  Cd(old_dir);
  Free(old_dir);
  Silent(old_silent);
}

FileDirDate;
