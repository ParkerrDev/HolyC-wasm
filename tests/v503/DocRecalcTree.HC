//DocRecalc lays out tree entries, collapsed and expanded, as V5.03
//Adam/DolDoc/DocRecalc.HC does, and DocCollapse opens them.
U0 DocRecalcTreeShow(CDoc *doc)
{
  CDocEntry *doc_e=doc->head.next;
  I64 i=0;
  while (doc_e!=doc && i<32) {
    "%d:%d x=%d y=%d f=%X",i++,doc_e->type_u8,doc_e->x,doc_e->y,
	  doc_e->de_flags;
    if (doc_e->de_flags&DOCEF_TAG)
      " \"%s\"",doc_e->tag;
    '\n';
    doc_e=doc_e->next;
  }
  "max_y=%d cur=%d\n",doc->max_y,doc->cur_entry->type_u8;
}

U0 DocRecalcTree()
{
  CDoc *doc=DocNew;
  CDocEntry *doc_e;
  I64 size;
  U8 *st,*src;
  DocPrint(doc,"$$TR,\"Top\"$$\n$$ID,2$$$$TR-C,\"Open\"$$\n"
	"$$ID,2$$Leaf One\nLeaf Two\n$$ID,-2$$$$ID,-2$$After\n");
  DocRecalc(doc);
  "Collapsed\n";
  DocRecalcTreeShow(doc);
  doc_e=doc->head.next;
  doc_e->de_flags&=~DOCEF_CHECKED_COLLAPSED;
  DocRecalc(doc);
  "Top open\n";
  DocRecalcTreeShow(doc);
  DocCollapse(TRUE,doc);
  "All shut\n";
  DocRecalcTreeShow(doc);
  DocCollapse(FALSE,doc);
  "All open\n";
  DocRecalcTreeShow(doc);
  st=DocSave(doc,&size);
  "Saved %d (@ for each dollar)\n",size;
  for (src=st;*src;src++)
    if (*src=='$$')
      '@';
    else
      PutChars(*src);
  Free(st);
  DocDel(doc);
}

DocRecalcTree;
