CDocEntry *doc_base_entry=NULL;
I64 doc_base_error=0,doc_base_tasks=0;

U0 DocBaseChild(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
  if (doc_base_entry->type!=DOCT_TEXT ||
	doc_base_entry->de_flags!=doldoc.dft_de_flags[DOCT_TEXT] ||
	doc_base_entry->x!=23 || doc_base_entry->y!=-41 ||
	doc_base_entry->page_line_num!=19) doc_base_error=1;
  doc_base_tasks++;
}

U0 DocBaseTask()
{
  CDoc doc;
  CTask *child;
  I64 i;
  doc_base_error=doc_base_tasks=0;
  MemSet(&doc,0,sizeof(CDoc));
  for (i=0;i<4;i++) {
    child=Spawn(&DocBaseChild,,,,Fs);
    doc.mem_task=child;
    doc_base_entry=DocEntryNewBase(&doc,DOCT_TEXT,0,23,-41,19);
    PostMsg(child,MSG_CMD,1,0);
    while (TaskValidate(child)) Yield;
    if (doc_base_error) throw('BaseTask');
    doc_base_entry=NULL;
  }
  "DocBaseTask:%d:%d\n",doc_base_tasks,doc_base_error;
}

DocBaseTask;
