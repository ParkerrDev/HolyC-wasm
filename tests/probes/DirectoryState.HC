U8 *ds_paths[25]={"",".","..","../Beta","Inner","inner",
  "/DirChk/Beta","/DirChk/Alpha//DirChk/Beta","../Missing/x",
  "B:Inner","B:","B:/..","B:/DirChk/Alpha/Inner/../../Beta",
  "~","~/../Home","::/Home","~:/Home"," C:/Home ",
  "Inner/","Inner//DirChk","./Inner","../../..",
  "/DirChk/Alpha/../Beta","Inner/../../Beta","B:/DirChk/ALPHA"},
  *ds_masks[8]={"../Beta/*.HC;*.DD","Inner","Inner/","../Missing/*.HC",
  "B:/DirChk/Alpha/*.HC","::/Home/*","~","../Beta"};

U0 DirectoryState()
{
  Bool old_silent=Silent,res;
  I64 i,flags;
  U8 *old_dir=DirCur,*abs,*cur,*after;
  CDirContext *dirc;
  Cd("B:/DirChk/Alpha/Inner",TRUE);
  Cd("B:/DirChk/Beta",TRUE);
  for (i=0;i<25;i++) {
    Cd("B:/DirChk/Alpha");
    abs=DirNameAbs(ds_paths[i]);
    res=Cd(ds_paths[i]);
    cur=DirCur;
    Silent(FALSE);
    "%d|%s|%d|%s\n",i,abs,res,cur;
    Silent;
    Free(abs);
    Free(cur);
  }
  for (i=0;i<8;i++)
    for (flags=0;flags<4;flags++) {
      Cd("B:/DirChk/Alpha");
      dirc=DirContextNew(ds_masks[i],flags&1,FALSE,flags&2);
      cur=DirCur;
      Silent(FALSE);
      "%d:%d|%d|%s|",i,flags,!!dirc,cur;
      if (dirc) "%s",dirc->mask;
      Silent;
      DirContextDel(dirc);
      after=DirCur;
      Silent(FALSE);
      "|%s\n",after;
      Silent;
      Free(cur);
      Free(after);
    }
  Cd("B:/DirChk/Alpha");
  dirc=DirContextNew("../Beta",TRUE);
  DirContextDel(dirc,FALSE);
  cur=DirCur;
  Cd(old_dir);
  Silent(FALSE);
  "Keep:%s\n",cur;
  Free(cur);
  Free(old_dir);
  Silent(old_silent);
}

DirectoryState;
