CDoc *copy_src=NULL,*copy_dst=NULL;
CDocEntry *copy_entry=NULL,copy_saved;
U8 copy_borrowed[32];

U0 DocCopySetup(I64 mask,Bool empty)
{
  I64 i;
  U8 **ptr;
  CDocBin *b;
  copy_src=DocChkNew;
  copy_dst=DocChkNew;
  copy_entry=CAlloc(sizeof(CDocEntry));
  copy_entry->type=DOCT_TEXT;
  MemSet(copy_borrowed,90,31);
  copy_borrowed[31]=0;
  for (i=0;i<8;i++) {
    ptr=copy_entry(U8 *)+doc_fields[i];
    *ptr=copy_borrowed;
    if (Bt(&mask,i)) {
      copy_entry->de_flags|=doc_flags[i];
      *ptr=NULL;
      if (!empty) {
	*ptr=MAlloc(32);
	MemSet(*ptr,65+i,31);
	(*ptr)[31]=0;
      }
    }
  }
  if (mask&256) {
    copy_entry->de_flags|=DOCEF_HAS_BIN;
    b=copy_entry->bin_data=CAlloc(sizeof(CDocBin));
    b->num=copy_entry->bin_num=23;
    b->use_cnt=1;
    b->tag=StrNew("Original");
    if (!empty) {
      b->size=32;
      b->data=MAlloc(32);
      MemSet(b->data,99,32);
    }
    QueIns(b,copy_src->bin_head.last);
  }
  QueIns(copy_entry,copy_src->head.last);
  copy_src->cur_entry=copy_entry;
  MemCpy(&copy_saved,copy_entry,sizeof(CDocEntry));
}

I64 DocCopyTrial()
{
  I64 error=0,i,j,bin_num=copy_dst->cur_bin_num;
  CDocEntry *doc_ne=NULL;
  U8 **ptr,**ptr2;
  try
    doc_ne=DocEntryCopy(copy_dst,copy_entry);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error)
    DocChkAssert(copy_dst->cur_bin_num==bin_num);
  else {
    DocChkAssert(doc_ne->de_flags==copy_entry->de_flags);
    for (i=0;i<8;i++) {
      ptr=copy_entry(U8 *)+doc_fields[i];
      ptr2=doc_ne(U8 *)+doc_fields[i];
      if (copy_entry->de_flags&doc_flags[i] && *ptr)
	DocChkAssert(*ptr2!=*ptr && !MemCmp(*ptr,*ptr2,32));
      else
	DocChkAssert(*ptr2==*ptr);
    }
    DocEntryDel(copy_dst,doc_ne);
  }
  DocChkAssert(copy_dst->head.next==copy_dst &&
	copy_dst->head.last==copy_dst && copy_dst->cur_entry==copy_dst &&
	copy_dst->bin_head.next==&copy_dst->bin_head &&
	copy_dst->bin_head.last==&copy_dst->bin_head);
  DocChkAssert(!MemCmp(copy_entry,&copy_saved,sizeof(CDocEntry)));
  for (i=0;i<8;i++) {
    ptr=copy_entry(U8 *)+doc_fields[i];
    if (*ptr) {
      for (j=0;j<31;j++)
	if (copy_entry->de_flags&doc_flags[i])
	  DocChkAssert((*ptr)[j]==65+i);
	else
	  DocChkAssert((*ptr)[j]==90);
      DocChkAssert(!(*ptr)[31]);
    }
  }
  if (copy_entry->de_flags&DOCEF_HAS_BIN) {
    DocChkAssert(copy_entry->bin_data->use_cnt==1 &&
	DocBinFindNum(copy_src,23)==copy_entry->bin_data &&
	!StrCmp(copy_entry->bin_data->tag,"Original"));
    if (copy_entry->bin_data->data)
      for (j=0;j<32;j++)
	DocChkAssert(copy_entry->bin_data->data[j]==99);
  }
  return error;
}

U0 DocCopyDone()
{
  DocEntryDel(copy_src,copy_entry);
  Free(copy_src);
  Free(copy_dst);
  copy_src=copy_dst=copy_entry=NULL;
}

U0 DocCopyDiagnostics()
{
  DocBinDel(copy_src,NULL);
  DocEntryDel(NULL,copy_entry);
  DocEntryDel(copy_src,copy_src);
  DocChkAssert(!MemCmp(copy_entry,&copy_saved,sizeof(CDocEntry)));
}
