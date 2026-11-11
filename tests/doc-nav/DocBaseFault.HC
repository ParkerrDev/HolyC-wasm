import U0 DocBaseMark(I64 phase,CTask *owner,I64 error);

U0 DocBaseWait(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

I64 DocBaseTrial(CDoc *doc)
{
  CDoc saved;
  CDocEntry *entry=NULL;
  I64 error=0;
  MemCpy(&saved,doc,sizeof(CDoc));
  try
    entry=DocEntryNewBase(doc,DOCT_DATA,DOCEF_LINK,13,-17,23);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (MemCmp(&saved,doc,sizeof(CDoc))) throw('BaseMut');
  if (entry) {
    if (entry->type!=DOCT_DATA ||
	entry->de_flags!=DOCEF_LINK|doldoc.dft_de_flags[DOCT_DATA] ||
	entry->x!=13 || entry->y!=-17 || entry->page_line_num!=23)
      throw('BaseVal');
    Free(entry);
  }
  return error;
}

I64 DocBaseFault(I64 mode)
{
  CDoc doc;
  CTask *child=NULL,*owner=Fs;
  I64 error;
  MemSet(&doc,0,sizeof(CDoc));
  if (mode==1) doc.mem_task=Fs;
  else if (mode==2) owner=doc.mem_task=child=Spawn(&DocBaseWait,,,,Fs);
  DocBaseMark(0,owner,0);
  error=DocBaseTrial(&doc);
  DocBaseMark(1,owner,error);
  if (error && DocBaseTrial(&doc)) throw('BaseRtry');
  if (child) Kill(child);
  return error;
}
