I64 define_task_result=0,define_task_error=0;

U0 DefineTaskChild(U8 *)
{
  CHashDefineStr *entry;
  if (StrCmp(Define("A54Parent"),"Parent") ||
	StrCmp(DefineSub(1,"A54List"),"Two"))
    define_task_error=1;
  entry=DefineLoad("A54Parent","Child");
  DefineMetaChk(entry);
  entry=DefineLstLoad("A54Local","Red\0@R\0Blue\0");
  DefineMetaChk(entry);
  if (StrCmp(Define("A54Parent"),"Child") ||
	DefineCnt("A54Local")!=2 || DefineMatch("R","A54Local")!=0)
    define_task_error=2;
  define_task_result=29;
}

U0 DefineTask()
{
  I64 i;
  CTask *child;
  CHashDefineStr *parent_entry,*list_entry;
  define_task_error=define_task_result=0;
  parent_entry=DefineLoad("A54Parent","Parent");
  list_entry=DefineLstLoad("A54List","One\0Two\0");
  for (i=0;i<4;i++) {
    child=Spawn(&DefineTaskChild,,,,Fs);
    while (TaskValidate(child)) Yield;
    if (define_task_error || define_task_result!=29 ||
	  StrCmp(Define("A54Parent"),"Parent") ||
	  StrCmp(DefineSub(1,"A54List"),"Two") ||
	  HashFind("A54Local",Fs->hash_table,HTT_DEFINE_STR))
      throw('DefTask');
  }
  DefineDrop(list_entry);
  DefineDrop(parent_entry);
  "DefineTask:%d:%d\n",define_task_result,define_task_error;
}

DefineTask;
