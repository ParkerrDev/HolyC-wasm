CHashTable *doc_fault_saved=NULL;
CHashDefineStr *doc_fault_colors=NULL,*doc_fault_cmds=NULL,
  *doc_fault_flags=NULL,*doc_fault_links=NULL;

U0 DocFaultSetup()
{
  CHashTable *table=HashTableNew(16);
  doc_fault_saved=Fs->hash_table;
  table->next=doc_fault_saved;
  Fs->hash_table=table;
  doc_fault_colors=DefineLstLoad("ST_COLORS","Keep\0Colors\0");
  doc_fault_cmds=DefineLstLoad("ST_DOC_CMDS","Keep\0Commands\0");
  doc_fault_flags=DefineLstLoad("ST_DOC_FLAGS","Keep\0Flags\0");
  doc_fault_links=DefineLstLoad("ST_LINK_TYPES","Keep\0Links\0");
}

U0 DocFaultChk(U8 *name,CHashDefineStr *expected)
{
  if (HashFind(name,Fs->hash_table,HTT_DEFINE_STR)!=expected ||
	StrCmp(DefineSub(0,name),"Keep")) throw('DocPrior');
}

I64 DocFaultTrial()
{
  I64 error=0;
  CDolDocGlbls result,saved;
  MemSet(&result,0x5A,sizeof(CDolDocGlbls));
  MemCpy(&saved,&result,sizeof(CDolDocGlbls));
  try DocHostBuild(&result);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error) {
    if (MemCmp(&result,&saved,sizeof(CDolDocGlbls))) throw('DocPart');
  } else {
    DocHostTableDel(result.hash);
    DocHostDefineDel(HashFind("ST_COLORS",Fs->hash_table,HTT_DEFINE_STR));
    DocHostDefineDel(HashFind("ST_DOC_CMDS",Fs->hash_table,HTT_DEFINE_STR));
    DocHostDefineDel(HashFind("ST_DOC_FLAGS",Fs->hash_table,HTT_DEFINE_STR));
    DocHostDefineDel(HashFind("ST_LINK_TYPES",Fs->hash_table,HTT_DEFINE_STR));
  }
  DocFaultChk("ST_COLORS",doc_fault_colors);
  DocFaultChk("ST_DOC_CMDS",doc_fault_cmds);
  DocFaultChk("ST_DOC_FLAGS",doc_fault_flags);
  DocFaultChk("ST_LINK_TYPES",doc_fault_links);
  return error;
}

U0 DocFaultDone()
{
  DocHostDefineDel(doc_fault_colors);
  DocHostDefineDel(doc_fault_cmds);
  DocHostDefineDel(doc_fault_flags);
  DocHostDefineDel(doc_fault_links);
  HashTableDel(Fs->hash_table);
  Fs->hash_table=doc_fault_saved;
  doc_fault_saved=NULL;
  doc_fault_colors=doc_fault_cmds=doc_fault_flags=doc_fault_links=NULL;
}
