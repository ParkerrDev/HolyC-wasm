U0 ClearFill(CDoc *doc,I64 mask,I64 shape)
{
  CDocEntry *entry;
  I64 i,flags;
  if (shape) RecalcEntry(doc,DOCT_WORD_WRAP,,1);
  for (i=0;i<4;i++) {
    flags=0;
    if (mask&1<<i) flags|=DOCEF_HOLD;
    if (Bt(&mask,i+4)) flags|=DOCEF_FILTER_SKIP;
    entry=RecalcEntry(doc,DOCT_TEXT|0x3C00,"alpha beta",,flags);
    if (shape==2 && i==1) {
      Free(entry->tag);entry->tag=StrNew("one\ttwo",doc->mem_task);
      entry->max_col=StrLen(entry->tag);
    }
    RecalcEntry(doc,DOCT_NEW_LINE,,,flags);
  }
  doc->cur_entry=doc->head.next;
  doc->cur_col=2;
  doc->top_line_num=7;doc->line_start_col=3;
}

U0 ClearTest()
{
  CDoc *doc,*old_doc;
  I64 mask,holds,shape,plain;
  recalc_hash=0xCBF29CE484222325;recalc_cnt=0;
  for (mask=0;mask<256;mask++) for (holds=0;holds<2;holds++)
    for (shape=0;shape<3;shape++) {
      RecalcWindow(mask%7);
      doc=RecalcNew;
      ClearFill(doc,mask,shape);
      DocClear(doc,holds);
      RecalcState(doc);
      DocClear(doc,holds);
      RecalcState(doc);
      RecalcDel(doc);
    }
  for (plain=0;plain<4;plain++) for (mask=0;mask<16;mask++)
    for (holds=0;holds<2;holds++) {
      RecalcWindow(mask%5);
      doc=RecalcNew;doc->flags=plain;
      ClearFill(doc,mask,0);
      DocClear(doc,holds);RecalcState(doc);RecalcDel(doc);
    }
  for (plain=1;plain<=2;plain++) {
    doc=RecalcNew;doc->flags=plain;
    RecalcEntry(doc,DOCT_TEXT,"before");
    RecalcEntry(doc,DOCT_PAGE_LEN,,100);
    RecalcEntry(doc,DOCT_HEADER,,70);
    RecalcEntry(doc,DOCT_HEADER,,0);
    RecalcEntry(doc,DOCT_PAGE_LEN,,66);
    DocClear(doc);RecalcState(doc);RecalcDel(doc);
  }
  RecalcWindow(0);
  doc=RecalcNew;
  DocClear(doc);RecalcState(doc);
  doc->doc_signature=0;
  doc->cur_col=7;doc->top_line_num=4;
  DocClear(doc);RecalcState(doc);
  doc->doc_signature=DOC_SIGNATURE_VAL;
  ClearFill(doc,5,0);
  old_doc=Fs->put_doc;Fs->put_doc=doc;
  DocClear;RecalcState(doc);
  Fs->put_doc=NULL;DocClear;
  Fs->put_doc=old_doc;
  RecalcDel(doc);
  "Clear:%016X:%d\n",recalc_hash,recalc_cnt;
}

ClearTest;
