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

DocEntriesChk;
