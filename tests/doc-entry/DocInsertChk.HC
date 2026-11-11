I64 doc_insert_hash,doc_insert_cnt;

U0 DocInsertMix(I64 val)
{
  doc_insert_hash=(doc_insert_hash^val)*0x100000001B3;
}

CDocEntry *DocInsertEntry(CDoc *doc,I64 type,U8 *tag=NULL)
{
  CDocEntry *doc_e=CAlloc(sizeof(CDocEntry));
  doc_e->type=type;
  if (tag) {
    doc_e->tag=StrNew(tag);
    doc_e->de_flags=DOCEF_TAG;
    doc_e->max_col=StrLen(tag);
  }
  QueIns(doc_e,doc->head.last);
  return doc_e;
}

U0 DocInsertRead(CDoc *doc)
{
  I64 i,cnt=0;
  CDocEntry *doc_e=doc->head.next;
  U8 *ptr;
  while (doc_e!=doc) {
    DocChkAssert(doc_e->next->last==doc_e && doc_e->last->next==doc_e);
    DocInsertMix(doc_e==doc->cur_entry);
    DocInsertMix(doc_e->type);
    DocInsertMix(doc_e->de_flags);
    DocInsertMix(doc_e->x);
    DocInsertMix(doc_e->y);
    DocInsertMix(doc_e->page_line_num);
    DocInsertMix(doc_e->min_col);
    DocInsertMix(doc_e->max_col);
    DocInsertMix(doc_e->user_data);
    ptr=&doc_e->settings;
    for (i=0;i<sizeof(CDocSettings);i++)
      DocInsertMix(ptr[i]);
    if (doc_e->tag) {
      ptr=doc_e->tag;
      while (*ptr)
	DocInsertMix(*ptr++);
    }
    DocInsertMix(-1);
    cnt++;
    doc_e=doc_e->next;
  }
  DocInsertMix(cnt);
  DocInsertMix(doc->cur_entry==doc);
  DocInsertMix(doc->cur_col);
}

U0 DocInsertCase(I64 len,I64 col,I64 guard,I64 mode,Bool held)
{
  I64 i;
  U8 buf[32];
  CDoc *doc=DocChkNew;
  CDocEntry *doc_e,*ins,*next;
  doc->head.type=DOCT_ERROR;
  DocInsertEntry(doc,DOCT_TEXT,"before");
  for (i=0;i<len;i++) buf[i]='A'+i;
  buf[len]=0;
  doc_e=DocInsertEntry(doc,DOCT_TEXT|0x210000,buf);
  switch (guard) {
    case 1:
      doc_e->de_flags|=DOCEF_TAG_CB;
      break;
    case 2:
      doc_e->de_flags|=DOCEF_DEFINE;
      doc_e->define_str=StrNew("Define");
      break;
    case 3:
      doc_e->de_flags|=DOCEF_AUX_STR;
      doc_e->aux_str=StrNew("Aux");
      break;
    case 4:
      doc_e->de_flags|=DOCEF_HTML_LINK;
      doc_e->html_link=StrNew("Html");
      break;
    case 5:
      doc_e->de_flags|=DOCEF_BIN_PTR_LINK;
      doc_e->bin_ptr_link=StrNew("BinPtr");
      break;
  }
  doc_e->x=-7;
  doc_e->y=19;
  doc_e->page_line_num=3;
  doc_e->min_col=1;
  doc_e->user_data=123;
  MemSet(&doc_e->settings,0x5A,sizeof(CDocSettings));
  DocInsertEntry(doc,DOCT_SOFT_NEW_LINE);
  DocInsertEntry(doc,DOCT_NEW_LINE);
  DocInsertEntry(doc,DOCT_SOFT_NEW_LINE);
  DocInsertEntry(doc,DOCT_TEXT,"after");
  doc->cur_entry=doc_e;
  doc->cur_col=col;
  if (mode==1) doc->cur_entry=doc_e->next;
  else if (mode==2) doc->cur_entry=doc_e->next->next;
  else if (mode==3) doc->cur_entry=doc;
  ins=CAlloc(sizeof(CDocEntry));
  ins->type=DOCT_TAB;
  ins->next=ins->last=ins;
  if (held) DocChkAssert(DocLock(doc));
  DocInsEntry(doc,ins);
  DocChkAssert(Bt(&doc->locked_flags,DOClf_LOCKED)==held &&
	!(doc->owning_task==Fs ^^ held));
  if (held) DocChkAssert(DocUnlock(doc));
  DocInsertRead(doc);
  DocRemSoftNewLines(doc);
  DocInsertRead(doc);
  doc_e=doc->head.next;
  while (doc_e!=doc) {
    next=doc_e->next;
    DocEntryDel(doc,doc_e);
    doc_e=next;
  }
  Free(doc);
  doc_insert_cnt++;
}

U0 DocInsertChk()
{
  I64 len,col,guard,mode,held;
  doc_insert_hash=0xCBF29CE484222325;
  doc_insert_cnt=0;
  for (len=0;len<=8;len++)
    for (col=0;col<=len+1;col++)
      for (guard=0;guard<6;guard++)
	for (mode=0;mode<4;mode++)
	  for (held=0;held<2;held++)
	    DocInsertCase(len,col,guard,mode,held);
  "DocInsert:%016X:%d\n",doc_insert_hash,doc_insert_cnt;
}

DocInsertChk;
