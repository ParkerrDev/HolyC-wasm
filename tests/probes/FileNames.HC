U8 *fn_names[24]={"",".","..","A","A.Z","A.HC.Z","A.HC.z",
  "A.C","A.B.C",".Z","..Z","A..B","A./B.C","../A.HC",
  "A.B/C.D","A.Z/","~","~:/Home/x.HC","::/Home/x.HC",
  " B:/FileChk/ A.HC ","A//B.HC","../A.HC","/A.HC","B:A.HC"};

U0 FileNames()
{
  U8 *old_dir=DirCur,*ptr,*buf,*ext,*abs,*changed,*dft,*toggle;
  Bool old_silent=Silent;
  I64 i;
  Cd("B:/FileChk/Inner",TRUE);
  Silent(FALSE);
  for (i=0;i<24;i++) {
    buf=StrNew(fn_names[i]);
    ext=MAlloc(StrLen(buf)+1);
    ptr=FileExtDot(buf);
    "%d:%d:%d:%d:%X|",i,!!ptr,IsDotZ(buf),IsDotC(buf),
	  FileAttr(buf,RS_ATTR_READ_ONLY|RS_ATTR_COMPRESSED);
    if (ptr) "%d|",ptr-buf;
    else "-|";
    FileExtRem(buf,ext);
    changed=ExtChg(fn_names[i],"DD.Z");
    dft=ExtDft(fn_names[i],"HC");
    toggle=ToggleZorNotZ(fn_names[i]);
    abs=FileNameAbs(fn_names[i]);
    "%s|%s|%s|%s|%s|%s\n",buf,ext,changed,dft,toggle,abs;
    Free(buf);
    Free(ext);
    Free(changed);
    Free(dft);
    Free(toggle);
    Free(abs);
  }
  Silent;
  Cd(old_dir);
  Free(old_dir);
  Silent(old_silent);
}

FileNames;
