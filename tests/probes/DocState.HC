I64 doc_chk_hash=0xCBF29CE484222325;

U0 DocChkVal(I64 val)
{
  doc_chk_hash=(doc_chk_hash^val)*0x100000001B3;
}

U0 DocStateChk()
{
  I64 i,n,old_flags=Fs->task_flags;
  CDoc *doc=CAlloc(sizeof(CDoc)),*display=CAlloc(sizeof(CDoc)),
	*border=CAlloc(sizeof(CDoc)),*old_put=Fs->put_doc,
	*old_display=Fs->display_doc,*old_border=Fs->border_doc;
  CTask task;
  "DocLayout:%d:%d:%d:%d:%d:%d:%d:%d:%d:%d\n",
	sizeof(CDoc),sizeof(CDocEntryBase),sizeof(CDocEntry),
	sizeof(CDocSettings),sizeof(CDocBin),offset(CDoc.flags),
	offset(CDoc.win_task),offset(CDoc.doc_signature),
	offset(CDoc.bin_head),offset(CDoc.user_data);
  Fs->put_doc=doc;
  Fs->display_doc=display;
  Fs->border_doc=border;
  Btr(&Fs->task_flags,TASKf_INPUT_FILTER_TASK);
  MemSet(&task,0,sizeof(CTask));
  task.parent_task=Fs;
  task.put_doc=border;
  for (i=0;i<8;i++) {
    doc->doc_signature=0;
    display->doc_signature=0;
    border->doc_signature=0;
    if (i&1) doc->doc_signature=DOC_SIGNATURE_VAL;
    if (i&2) display->doc_signature=DOC_SIGNATURE_VAL;
    if (i&4) border->doc_signature=DOC_SIGNATURE_VAL;
    DocChkVal(DocPut==doc);
    DocChkVal(DocDisplay==display);
    DocChkVal(DocBorder==border);
    DocChkVal(DocPut(&task)==border);
    Bts(&task.task_flags,TASKf_INPUT_FILTER_TASK);
    DocChkVal(DocPut(&task)==doc);
    Btr(&task.task_flags,TASKf_INPUT_FILTER_TASK);
  }
  doc->doc_signature=DOC_SIGNATURE_VAL;
  for (i=0;i<512;i++) {
    doc->flags=i<<8|0x8000000000000043;
    for (n=0;n<4;n++) {
      DocChkVal(DocCursor(n&1));
      DocChkVal(DocHighlightCursor(n&1,doc));
      DocChkVal(DocScroll(n&1));
      DocChkVal(doc->flags);
    }
  }
  Fs->put_doc=NULL;
  DocChkVal(DocCursor);
  DocChkVal(DocHighlightCursor);
  DocChkVal(DocScroll);
  Fs->put_doc=old_put;
  Fs->display_doc=old_display;
  Fs->border_doc=old_border;
  Fs->task_flags=old_flags;
  Free(border);Free(display);Free(doc);
  "DocState:%016X\n",doc_chk_hash;
}

//Native manager isolation.
Suspend(sys_winmgr_task);
try DocStateChk;catch Suspend(sys_winmgr_task,FALSE);
Suspend(sys_winmgr_task,FALSE);
