I64 doc_task_cnt=0,doc_task_error=0;
CHashTable *doc_task_hash=NULL;

U0 DocTaskChild(U8 *)
{
  CCmpCtrl *cc=NULL;
  I64 flags=0,type=0;
  try {
    if (doldoc.hash!=doc_task_hash) throw('DocOwner');
    DefineLstLoad("ST_DOC_FLAGS","Child\0");
    cc=CmpCtrlNew("+T+UL;",CCF_DONT_FREE_BUF);
    cc->htc.hash_table_lst=NULL;
    Lex(cc);
    if (PrsDocFlags(cc,&flags,&type.u32[0])!=DOCEf_UNDERLINE ||
	flags!=DOCEF_TAG|DOCEF_UNDERLINE || type!=DOCET_UNDERLINE ||
	StrCmp(DefineSub(0,"ST_DOC_FLAGS"),"Child")) throw('DocChild');
    doc_task_cnt++;
  } catch {
    doc_task_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  CmpCtrlDel(cc);
}

U0 DocTask()
{
  I64 i;
  CTask *task;
  CDolDocGlbls saved;
  MemCpy(&saved,&doldoc,sizeof(CDolDocGlbls));
  doc_task_hash=doldoc.hash;
  doc_task_cnt=doc_task_error=0;
  for (i=0;i<4;i++) {
    task=Spawn(&DocTaskChild,,,,Fs);
    while (TaskValidate(task)) Yield;
    if (doc_task_error) throw(doc_task_error);
    if (doldoc.hash!=doc_task_hash ||
	MemCmp(&saved,&doldoc,sizeof(CDolDocGlbls)) ||
	StrCmp(DefineSub(0,"ST_DOC_FLAGS"),"T")) throw('DocPar');
  }
  "DocTask:%d\n",doc_task_cnt;
}

DocTask;
