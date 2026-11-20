//V5.03 Adam/God/GodBible.HC BibleVerse: a book's line from ST_BIBLE_BOOK_LINES,
//then the verse found after it. It reads a Bible written here; V5.03's goes back.
U8 *old=NULL,*bible=MAlloc(6000*24),*ptr=bible;
I64 i,old_size;
Bool s;
CDoc *doc=DocNew;
CDocEntry *doc_e;
if (FileFind(BIBLE_FILENAME))
  old=FileRead(BIBLE_FILENAME,&old_size);
for (i=1;i<=6000;i++) {
  StrPrint(ptr,"%d:1 line %d\n",i,i);
  ptr+=StrLen(ptr);
}
s=Silent;
FileWrite(BIBLE_FILENAME,bible,ptr-bible);
Silent(s);
BibleVerse(doc,"Exodus,5070:1",2);
BibleVerse(doc,"genesis",1);
BibleVerse(doc,"Leviticus",1);
BibleVerse(doc,"Nobody",1);
BookLines(doc,12,2);
for (doc_e=doc->head.next;doc_e!=doc;doc_e=doc_e->next)
  if (doc_e->type_u8==DOCT_TEXT)
    "%s",doc_e->tag;
  else if (doc_e->type_u8==DOCT_NEW_LINE)
    '\n';
"%s\n",DefineSub(1,"ST_BIBLE_BOOKS");
if (old)
  FileWrite(BIBLE_FILENAME,old,old_size);
