
I64 HashStr(U8 *st)
{//Match SYS_HASH_STR carry arithmetic, including its final ADC.
  U64 res=0;
  I64 ch;
  if (!st) return 0;
  while (ch=*st++) res=res<<1+res>>63+ch;
  return res+res>>16+res>>15&1;
}

CHash **HashBucketFind(U8 *needle_str,CHashTable *table)
{
  return table->body+HashStr(needle_str)&table->mask;
}

U0 HashAdd(CHash *tmph,CHashTable *table)
{
  CHash **bucket=HashBucketFind(tmph->str,table);
  tmph->next=*bucket;
  *bucket=tmph;
}

U0 HashAddAfter(CHash *tmph,CHash *pred,CHashTable *)
{
  tmph->next=pred->next;
  pred->next=tmph;
}

CHash *HashHostFind(U8 *needle_str,CHashTable *table,U32 mask,I64 *_instance)
{
  CHash *tmph;
  if (!*_instance) return NULL;
  for (tmph=*HashBucketFind(needle_str,table);tmph;tmph=tmph->next)
    if (tmph->type&mask && !StrCmp(tmph->str,needle_str)) {
      --*_instance;
      if (!*_instance) {
	tmph->use_cnt++;
	return tmph;
      }
    }
  return NULL;
}

CHash *HashSingleTableFind(U8 *needle_str,CHashTable *table,I64 mask,
	I64 instance=1)
{
  return HashHostFind(needle_str,table,mask,&instance);
}

CHash *HashFind(U8 *needle_str,CHashTable *table,I64 mask,I64 instance=1)
{
  CHash *res;
  do {
    if (res=HashHostFind(needle_str,table,mask,&instance)) return res;
    table=table->next;
  } while (table);
  return NULL;
}

CHashTable *HashTableNew(I64 size,CTask *mem_task=NULL)
{
  CHashTable *table=CAlloc(sizeof(CHashTable),mem_task);
  try {
    table->body=CAlloc(size<<3,mem_task);
  } catch {
    Free(table);
  }
  table->mask=size-1;
  return table;
}

I64 HashTypeNum(CHash *tmph)
{
  if (tmph) return Bsf(tmph->type&HTG_TYPE_MASK);
  return -1;
}

I64 HashLstAdd(U8 *lst,I64 type,CHashTable *table)
{//An @ name aliases the previous list index.
  I64 i=0;
  CHashGeneric *tmph=NULL;
  if (lst)
    while (*lst) {
      if (*lst=='@') lst++;
      else i++;
      tmph=CAlloc(sizeof(CHashGeneric));
      try {
	tmph->user_data0=i-1;
	tmph->str=StrNew(lst);
	tmph->type=type;
      } catch {
	Free(tmph);
      }
      HashAdd(tmph,table);
      while (*lst++);
    }
  return i;
}

U0 HashHostDelChk(CHash *tmph)
{//Reject compiler-owned graphs before releasing any of their fields.
  if (tmph && (tmph->type&(HTT_FUN|HTT_CLASS) ||
	tmph->type&HTT_GLBL_VAR && !(tmph->type&HTT_DEFINE_STR)))
    throw('HashType');
}

I64 LinkedLstCnt(U8 **_lst)
{//Count of nodes in linked-list.
  I64 res=0;
  while (_lst) {
    res++;
    _lst=*_lst;
  }
  return res;
}

I64 LinkedLstSize(U8 **_lst)
{//Mem size of all nodes in linked-list.
  I64 res=0;
  while (_lst) {
    res+=MSize2(_lst);
    _lst=*_lst;
  }
  return res;
}

U0 LinkedLstDel(U8 **lst)
{//Free the nodes of a singly linked list.
  U8 **next;
  while (lst) {
    next=*lst;
    Free(lst);
    lst=next;
  }
}

U0 HashDel(CHashSrcSym *tmph)
{//Release the supported native hash entry and its owned fields.
  if (!tmph) return;
  HashHostDelChk(tmph);
  if (!(tmph->type&HTT_DICT_WORD)) Free(tmph->str);
  if (tmph->type&HTG_SRC_SYM) {
    Free(tmph->src_link);
    Free(tmph->idx);
    Free(tmph->import_name);
    LinkedLstDel(tmph->ie_lst);
    if (tmph->type&HTT_EXPORT_SYS_SYM) Free(tmph->dbg_info);
    if (tmph->type&HTT_DEFINE_STR) Free(tmph(CHashDefineStr *)->data);
  } else if (tmph->type&HTT_FILE)
    Free(tmph(CHashGeneric *)->user_data0);
  Free(tmph);
}

U0 HashTableDel(CHashTable *table)
{//Delete this table; its next table is borrowed from an ancestor.
  I64 i;
  CHash *tmph,*next;
  if (!table) return;
  for (i=0;i<=table->mask;i++)
    for (tmph=table->body[i];tmph;tmph=tmph->next)
      HashHostDelChk(tmph);
  for (i=0;i<=table->mask;i++) {
    tmph=table->body[i];
    while (tmph) {
      next=tmph->next;
      HashDel(tmph);
      tmph=next;
    }
  }
  Free(table->body);
  Free(table);
}

Bool HashRemDel(CHash *tmph,CHashTable *table,I64 instance=1)
{//Remove only the native matching instance in this table.
  CHash *found,**pred;
  if (!tmph) return FALSE;
  found=HashSingleTableFind(tmph->str,table,
	tmph->type&~HTG_FLAGS_MASK,instance);
  if (found!=tmph) return FALSE;
  HashHostDelChk(tmph);
  pred=HashBucketFind(tmph->str,table);
  while (*pred!=tmph) pred=&(*pred)->next;
  *pred=tmph->next;
  HashDel(tmph);
  return TRUE;
}

CHashGeneric *HashGenericAdd(U8 *name,I64 type,
	I64 u0=0,I64 u1=0,I64 u2=0,CTask *task=NULL)
{//Add a generic entry to a task's table, with native field ownership.
  CHashGeneric *res;
  if (type&HTG_SRC_SYM) throw('HashType');
  if (!task) task=Fs;
  res=CAlloc(sizeof(CHashGeneric),task);
  try {
    res->type=type;
    res->user_data0=u0;
    res->user_data1=u1;
    res->user_data2=u2;
    res->str=StrNew(name,task);
    HashAdd(res,task->hash_table);
  } catch {
    Free(res->str);
    Free(res);
  }
  return res;
}

U0 HashHostTaskInit(CTask *task)
{//The task host registers a child before allocating its table.
  CHashTable *table;
  if (task->hash_table) return;
  table=HashTableNew(TASK_HASH_TABLE_SIZE,task);
  if (task->parent_task) table->next=task->parent_task->hash_table;
  task->hash_table=table;
}

U0 HashHostInit()
{
  HashHostTaskInit(Fs);
}

I64 FramePtr(U8 *name,CTask *task=NULL)
{//Find entry in task->hash_table, Return user_data.
  CHashGeneric *tmph;
  if (!task) task=Fs;
  if (tmph=HashFind(name,task->hash_table,HTT_FRAME_PTR))
    return tmph->user_data0;
  else
    return 0;
}

CHashGeneric *FramePtrAdd(U8 *name,I64 val=0,CTask *task=NULL)
{//Add named value to task->hash_table.
  return HashGenericAdd(name,HTT_FRAME_PTR,val,0,0,task);
}

I64 FramePtrSet(U8 *name,I64 val,CTask *task=NULL)
{//Find hash entry in task->hash_table. Change user_data0.
  CHashGeneric *tmph;
  if (!task) task=Fs;
  if (tmph=HashFind(name,task->hash_table,HTT_FRAME_PTR))
    return LXchgI64(&tmph->user_data0,val);
  else
    return 0;
}

I64 FramePtrDel(U8 *name,CTask *task=NULL)
{//Remove entry and delete.
  CHashGeneric *tmph;
  I64 res=0;
  if (!task) task=Fs;
  if (tmph=HashFind(name,task->hash_table,HTT_FRAME_PTR)) {
    res=tmph->user_data0;
    HashRemDel(tmph,task->hash_table);
  }
  return res;
}
