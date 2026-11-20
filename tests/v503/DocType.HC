//V5.03 Adam/DolDoc/DocFile.HC DocType and DocInsDoc: a text file into a doc.

U0 DTChk()
{
  CDoc *doc=DocNew;
  CDocEntry *doc_e;
  FileWrite("~/DT.DD","Line one\nTwo\n",13);
  "%d ",DocType(doc,"~/DT.DD");
  "%d ",DocType(doc,"~/DT.BIN");
  "%d\n",DocType(doc,"~/DT.DD",0);
  doc_e=doc->head.next;
  while (doc_e!=doc) {
    if (doc_e->type_u8==DOCT_TEXT)
      "%s",doc_e->tag;
    else if (doc_e->type_u8==DOCT_NEW_LINE)
      "/\n";
    else
      "[%d]",doc_e->type_u8;
    doc_e=doc_e->next;
  }
  DocDel(doc);
}

DTChk;
