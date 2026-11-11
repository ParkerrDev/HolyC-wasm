extern U0 LexBackupLastChar(CCmpCtrl *cc);

U0 BindingExportOld(CCmpCtrl *cc)
{
  LexBackupLastChar(cc);
}

U0 LexBackupLastChar(CCmpCtrl *cc)
{
  cc->last_U16=999;
}

U0 BindingExportNew(CCmpCtrl *cc)
{
  LexBackupLastChar(cc);
}

extern U0 LexBackupLastChar(CCmpCtrl *cc);

U0 BindingExportForward(CCmpCtrl *cc)
{
  LexBackupLastChar(cc);
}

U0 LexBackupLastChar(CCmpCtrl *cc)
{
  cc->last_U16=777;
}

U0 BindingExports()
{
  CCmpCtrl cc;
  CLexFile file;
  U8 *buf="ab";
  MemSet(&cc,0,sizeof(CCmpCtrl));
  MemSet(&file,0,sizeof(CLexFile));
  cc.lex_include_stk=&file;
  cc.cur_buf_ptr=buf+1;
  cc.flags=CCF_USE_LAST_U16;
  cc.last_U16=65;
  BindingExportOld(&cc);
  "Exports:%d:%d:%d:",file.last_U16,cc.flags,file.buf_ptr==buf+1;
  BindingExportNew(&cc);
  cc.flags=CCF_USE_LAST_U16;
  BindingExportForward(&cc);
  "%d:%d:%d\n",cc.last_U16,file.last_U16,cc.flags;
}

BindingExports;
