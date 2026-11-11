U0 DocSharedCopyChk()
{
  CDoc *src=DocChkNew,*dst=DocChkNew;
  CDocEntry *doc_e=CAlloc(sizeof(CDocEntry)),*doc_ne;
  CDocBin *b=CAlloc(sizeof(CDocBin)),*copy;
  b->num=17;
  b->use_cnt=2;
  b->data=MAlloc(8);
  b->size=8;
  QueIns(b,src->bin_head.last);
  doc_e->de_flags=DOCEF_HAS_BIN;
  doc_e->bin_data=b;
  QueIns(doc_e,src->head.last);
  doc_ne=DocEntryCopy(dst,doc_e);
  copy=doc_ne->bin_data;
  "SharedCopy:%d:",copy->use_cnt;
  DocEntryDel(dst,doc_ne);
  "%d:%d\n",copy->use_cnt,dst->bin_head.next==copy;
  DocBinDel(dst,copy);
  DocEntryDel(src,doc_e);
  DocBinDel(src,b);
  Free(src);
  Free(dst);
}
DocSharedCopyChk;
