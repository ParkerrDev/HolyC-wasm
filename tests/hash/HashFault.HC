I64 HashNewTrial()
{
  CHashTable *table;
  I64 res=0;
  try {
    table=HashTableNew(32);
    HashTableDel(table);
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}

I64 HashListTrial()
{
  CHashTable *table=NULL;
  I64 res=0;
  try {
    table=HashTableNew(32);
    HashLstAdd("One\0@Uno\0Two\0Three\0",HTT_KEYWORD,table);
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  HashTableDel(table);
  return res;
}

I64 HashAddTrial()
{
  CHashGeneric *tmph;
  I64 res=0;
  try {
    tmph=HashGenericAdd("Trial",HTT_FRAME_PTR,17);
    if (!HashRemDel(tmph,Fs->hash_table)) throw('HashRem');
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}

I64 HashFileTrial()
{//The payload transfers only after the entry is published.
  CHashGeneric *tmph;
  U8 *data=NULL;
  I64 res=0;
  try {
    data=MAlloc(41);
    MemSet(data,0xA5,41);
    tmph=HashGenericAdd("FileTrial",HTT_FILE,data,41);
    data=NULL;
    if (!HashRemDel(tmph,Fs->hash_table)) throw('HashRem');
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  Free(data);
  return res;
}

U0 HashEmptyChild(U8 *)
{
  if (Fs->hash_table->next!=Fs->parent_task->hash_table)
    throw('HashInit');
}

I64 HashSpawnTrial()
{
  CTask *child;
  I64 res=0;
  try {
    child=Spawn(&HashEmptyChild,,,,Fs);
    while (TaskValidate(child)) Yield;
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  return res;
}

U0 HashWaitChild(U8 *)
{
  GetMsg(,,1<<MSG_CMD);
}

I64 HashForeignTrial()
{
  CTask *child=NULL;
  I64 res=0;
  try {
    child=Spawn(&HashWaitChild,,,,Fs);
    HashGenericAdd("Foreign",HTT_FRAME_PTR,73,0,0,child);
  } catch {
    res=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (child) Kill(child);
  return res;
}

U0 HashRejectType(I64 type)
{//Unsupported graphs must remain linked and wholly owned after rejection.
  CHashTable *table=HashTableNew(1);
  CHashSrcSym *bad=CAlloc(sizeof(CHashSrcSym));
  CHashGeneric *good=CAlloc(sizeof(CHashGeneric));
  I64 res=0;
  bad->str=StrNew("Bad");
  bad->type=type;
  bad->src_link=StrNew("Source");
  good->str=StrNew("Good");
  good->type=HTT_KEYWORD;
  HashAdd(bad,table);HashAdd(good,table);
  try HashDel(bad);
  catch {
    if (Fs->except_ch!='HashType') throw('Wrong');
    Fs->catch_except=TRUE;
    res++;
  }
  try HashTableDel(table);
  catch {
    if (Fs->except_ch!='HashType') throw('Wrong');
    Fs->catch_except=TRUE;
    res++;
  }
  if (table->body[0]!=good || good->next!=bad ||
	StrCmp(good->str,"Good") || StrCmp(bad->src_link,"Source"))
    throw('Mutation');
  try HashRemDel(bad,table);
  catch {
    if (Fs->except_ch!='HashType') throw('Wrong');
    Fs->catch_except=TRUE;
    res++;
  }
  if (res!=3 || bad->use_cnt!=1 || table->body[0]!=good ||
	good->next!=bad)
    throw('HashType');
  bad->type=HTT_HELP_FILE;
  HashTableDel(table);
}

U0 HashUnsupported()
{
  HashRejectType(HTT_FUN);
  HashRejectType(HTT_CLASS);
  HashRejectType(HTT_GLBL_VAR);
}
