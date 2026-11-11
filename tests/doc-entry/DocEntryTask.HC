I64 doc_task_error=0,doc_task_result=0;
CDoc *doc_task_dst=NULL;

U0 DocEntryTaskChild(U8 *)
{
  CDocEntry *doc_e;
  I64 arg1,arg2;
  GetMsg(&arg1,&arg2,1<<MSG_CMD);
  doc_e=doc_task_dst->head.next;
  if (doc_task_dst->mem_task!=Fs || doc_e==doc_task_dst ||
	StrCmp(doc_e->tag,"Foreign") || *doc_e->data!=73 ||
	doc_e->bin_data->data[0]!=91 || doc_e->bin_data->use_cnt!=1)
    doc_task_error=1;
  doc_task_result=doc_e->user_data;
}

U0 DocEntryTask()
{
  I64 i;
  CDoc *src=DocChkNew;
  CDocEntry *doc_e=CAlloc(sizeof(CDocEntry)),*doc_ne;
  CDocBin *b=CAlloc(sizeof(CDocBin));
  CTask *child;
  doc_task_error=doc_task_result=0;
  doc_e->type=DOCT_TEXT;
  doc_e->de_flags=DOCEF_TAG|DOCEF_REMALLOC_DATA|DOCEF_HAS_BIN;
  doc_e->tag=StrNew("Foreign");
  doc_e->data=MAlloc(8);
  *doc_e->data=73;
  doc_e->user_data=29;
  b->num=doc_e->bin_num=17;
  b->use_cnt=1;
  b->size=8;
  b->data=MAlloc(8);
  b->data[0]=91;
  doc_e->bin_data=b;
  QueIns(b,src->bin_head.last);
  QueIns(doc_e,src->head.last);
  for (i=0;i<4;i++) {
    child=Spawn(&DocEntryTaskChild,,,,Fs);
    doc_task_dst=CAlloc(sizeof(CDoc),child);
    doc_task_dst->mem_task=doc_task_dst->win_task=child;
    doc_task_dst->doc_signature=DOC_SIGNATURE_VAL;
    doc_task_dst->head.type=DOCT_ERROR;
    doc_task_dst->head.next=doc_task_dst->head.last=doc_task_dst;
    doc_task_dst->cur_entry=doc_task_dst;
    QueInit(&doc_task_dst->bin_head);
    doc_task_dst->cur_bin_num=31;
    doc_ne=DocEntryCopy(doc_task_dst,doc_e);
    DocInsEntry(doc_task_dst,doc_ne);
    PostMsg(child,MSG_CMD,1,0);
    while (TaskValidate(child)) Yield;
    if (doc_task_error || doc_task_result!=29 ||
	  StrCmp(doc_e->tag,"Foreign") || *doc_e->data!=73 ||
	  b->data[0]!=91 || b->use_cnt!=1)
      throw('DocTask');
  }
  DocEntryDel(src,doc_e);
  Free(src);
  doc_task_dst=NULL;
  "DocTask:%d:%d\n",doc_task_result,doc_task_error;
}

DocEntryTask;
