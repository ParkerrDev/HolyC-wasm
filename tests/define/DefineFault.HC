CHashDefineStr *define_old=NULL,*define_list=NULL;
I64 define_child_error=0;

U0 DefineFaultInit()
{
  define_old=DefineLoad("A54Stable","Parent");
  define_list=DefineLstLoad("A54Expand","One\0@Uno\0Two\0");
}

I64 DefineLoadTrial()
{
  CHashDefineStr *entry=NULL;
  I64 error=0;
  try entry=DefineLoad("A54Stable","New");
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (entry) DefineDrop(entry);
  DefineAssert(Define("A54Stable")==define_old->data);
  return error;
}

I64 DefineListTrial()
{
  CHashDefineStr *entry=NULL;
  I64 error=0;
  try entry=DefineLstLoad("A54Stable","New\0@Alias\0List\0");
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (entry) DefineDrop(entry);
  DefineAssert(Define("A54Stable")==define_old->data);
  return error;
}

I64 DefinePrintTrial()
{
  CHashDefineStr *entry;
  I64 error=0;
  try DefinePrint("A54Stable","%s:%02048d","Long",7);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  entry=HashFind("A54Stable",Fs->hash_table,HTT_DEFINE_STR);
  if (entry!=define_old) DefineDrop(entry);
  DefineAssert(Define("A54Stable")==define_old->data);
  return error;
}

I64 DefineExpandTrial()
{
  CHashTable *table=NULL;
  I64 error=0;
  try {
    table=HashTableNew(8);
    DefineAssert(HashDefineLstAdd("A54Expand",HTT_FRAME_PTR,table)==2);
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  HashTableDel(table);
  DefineAssert(Define("A54Expand")==define_list->data &&
	!StrCmp(DefineSub(1,"A54Expand"),"Two"));
  return error;
}

U0 DefineFaultChild(U8 *)
{
  try {
    DefineLoad("A54Child","Value");
    DefineLstLoad("A54ChildList","One\0@Alias\0Two\0");
  } catch {
    define_child_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
}

I64 DefineTaskTrial()
{
  CTask *child;
  define_child_error=0;
  try {
    child=Spawn(&DefineFaultChild,,,,Fs);
    while (TaskValidate(child)) Yield;
  } catch {
    define_child_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  DefineAssert(!HashFind("A54Child",Fs->hash_table,HTT_DEFINE_STR) &&
	!HashFind("A54ChildList",Fs->hash_table,HTT_DEFINE_STR));
  return define_child_error;
}

I64 DefineMissingTrial()
{
  I64 error=0;
  Bool silent=Silent;
  try Define("A54Missing");
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  Silent(silent);
  return error;
}

U0 DefineFaultDone()
{
  DefineDrop(define_list);
  DefineDrop(define_old);
  define_list=define_old=NULL;
}

DefineFaultInit;
