U64 doc_base_hash=0;
I64 doc_base_cnt=0;

U0 DocBaseCase(I64 type,I64 flags,I64 x,I64 y,I64 line,Bool own)
{
  CDoc doc,saved;
  CDocEntry *entry;
  U8 *ptr;
  I64 i;
  MemSet(&doc,0,sizeof(CDoc));
  if (own) doc.mem_task=Fs;
  MemCpy(&saved,&doc,sizeof(CDoc));
  entry=DocEntryNewBase(&doc,type,flags,x,y,line);
  ptr=entry;
  for (i=0;i<sizeof(CDocEntryBase);i++)
    doc_base_hash=(doc_base_hash^ptr[i])*1099511628211;
  if (MemCmp(&saved,&doc,sizeof(CDoc))) throw('BaseDoc');
  Free(entry);
  doc_base_cnt++;
}

U0 DocBase()
{
  I64 i,j,k,flags,attr,x,y,line;
  doc_base_hash=14695981039346656037;
  doc_base_cnt=0;
  for (i=0;i<DOCT_TYPES_NUM;i++)
    for (j=0;j<4;j++) {
      attr=j<<30;
      flags=j*0x123456789ABCDEF;
      x=0x7FFFFFFF+j;
      y=-0x80000000-j;
      line=j-2;
      for (k=0;k<2;k++) DocBaseCase(i|attr,flags,x,y,line,k);
    }
  "DocBase:%016X:%d\n",doc_base_hash,doc_base_cnt;
}

DocBase;
