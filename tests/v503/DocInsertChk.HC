I64 doc_fields[8]={offset(CDocEntry.tag),offset(CDocEntry.aux_str),
  offset(CDocEntry.define_str),offset(CDocEntry.html_link),
  offset(CDocEntry.left_macro),offset(CDocEntry.right_macro),
  offset(CDocEntry.bin_ptr_link),offset(CDocEntry.data)};
I64 doc_flags[8]={DOCEF_TAG,DOCEF_AUX_STR,DOCEF_DEFINE,DOCEF_HTML_LINK,
  DOCEF_LEFT_MACRO,DOCEF_RIGHT_MACRO,DOCEF_BIN_PTR_LINK,DOCEF_REMALLOC_DATA};

U0 DocChkAssert(Bool val)
{
  if (!val) throw('DocChk');
}

CDoc *DocChkNew()
{
  CDoc *doc=CAlloc(sizeof(CDoc));
  doc->doc_signature=DOC_SIGNATURE_VAL;
  doc->mem_task=doc->win_task=Fs;
  doc->head.next=doc->head.last=doc;
  doc->cur_entry=doc;
  QueInit(&doc->bin_head);
  doc->cur_bin_num=17;
  return doc;
}

U0 DocEntriesChk()
{
  I64 mask,i,j,span,hash=0xCBF29CE484222325;
  CDoc *src=DocChkNew,*dst=DocChkNew;
  CDocEntry *doc_e,*doc_ne;
  CDocBin *b;
  U8 **ptr,**ptr2;
  for (mask=0;mask<512;mask++) {
    doc_e=CAlloc(sizeof(CDocEntry));
    doc_e->type=DOCT_TEXT;
    doc_e->user_data=mask;
    for (i=0;i<8;i++)
      if (Bt(&mask,i)) {
	doc_e->de_flags|=doc_flags[i];
	ptr=doc_e(U8 *)+doc_fields[i];
	*ptr=MAlloc(32);
	MemSet(*ptr,65+i,31);
	(*ptr)[31]=0;
      }
    if (mask&256) {
      doc_e->de_flags|=DOCEF_HAS_BIN;
      b=doc_e->bin_data=CAlloc(sizeof(CDocBin));
      b->num=doc_e->bin_num=mask;
      b->size=32;
      b->use_cnt=1;
      b->tag=StrNew("Bin");
      b->data=MAlloc(32);
      MemSet(b->data,mask.u8[0],32);
      QueIns(b,src->bin_head.last);
      DocChkAssert(DocBinFindNum(src,mask)==b);
      DocChkAssert(DocBinFindTag(src,"Bin")==b);
    }
    QueIns(doc_e,src->head.last);
    src->cur_entry=doc_e;
    DocChkAssert(IsEditableText(doc_e)==
      !(doc_e->de_flags&DOCEG_DONT_EDIT));
    doc_ne=DocEntryCopy(dst,doc_e);
    DocChkAssert(doc_ne!=doc_e && doc_ne->next==doc_ne &&
      doc_ne->last==doc_ne && doc_ne->user_data==mask);
    span=MSize2(doc_e);
    for (i=0;i<8;i++)
      if (Bt(&mask,i)) {
	ptr=doc_e(U8 *)+doc_fields[i];
	ptr2=doc_ne(U8 *)+doc_fields[i];
	span+=MSize2(*ptr);
	DocChkAssert(*ptr2!=*ptr && !MemCmp(*ptr,*ptr2,32));
	for (j=0;j<32;j++)
	  hash=(hash^(*ptr2)[j])*0x100000001B3;
      }
    DocChkAssert(DocEntrySize(src,doc_e)==span &&
	DocEntrySize(dst,doc_ne)==span && !DocEntrySize(src,NULL));
    if (mask&256) {
      b=doc_ne->bin_data;
      DocChkAssert(b!=doc_e->bin_data &&
	b->data!=doc_e->bin_data->data &&
	!MemCmp(b->data,doc_e->bin_data->data,32));
      DocChkAssert(b->num==doc_ne->bin_num &&
	DocBinFindNum(dst,b->num)==b && b->use_cnt==1);
      if (mask&1)
	DocChkAssert(b->tag!=doc_ne->tag && !StrCmp(b->tag,doc_ne->tag));
      else
	DocChkAssert(!b->tag);
      hash=(hash^b->num)*0x100000001B3;
    }
    QueIns(doc_ne,dst->head.last);
    dst->cur_entry=doc_ne;
    DocEntryDel(dst,doc_ne);
    DocChkAssert(dst->cur_entry==dst && dst->head.next==dst &&
      dst->bin_head.next==&dst->bin_head);
    DocChkAssert(src->cur_entry==doc_e);
    DocEntryDel(src,doc_e);
    DocChkAssert(src->cur_entry==src && src->head.next==src &&
      src->bin_head.next==&src->bin_head);
    hash=(hash^mask)*0x100000001B3;
  }
  b=CAlloc(sizeof(CDocBin));
  b->tag=StrNew("Shared");
  b->data=MAlloc(8);
  b->num=3;
  b->use_cnt=2;
  QueIns(b,src->bin_head.last);
  DocBinDel(src,b);
  DocChkAssert(b->use_cnt==1 && DocBinFindTag(src,"Shared")==b);
  DocBinDel(src,b);
  DocChkAssert(!DocBinFindNum(src,3));
  Free(dst);
  Free(src);
  "DocEntries:%016X\n",hash;
}


Raw(OFF);
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
