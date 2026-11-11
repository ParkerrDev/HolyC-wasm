//Native hash primitives and explicit owned-node lifetimes.
export const HASH_TYPES_SRC=String.raw`
public class CHash
{//See $LK,"Hash",A="HI:Hash"$
  CHash	*next;
  U8	*str;
  U32	type,
	use_cnt;
};

public class CHashTable
{
  CHashTable *next;
  I64	mask,locked_flags;
  CHash	**body;
};

//Hash table types: $LK,"ST_HTT_TYPES",A="FF:::/Kernel/KDefine.HC,ST_HTT_TYPES"$
#define HTt_EXPORT_SYS_SYM	0
#define HTt_IMPORT_SYS_SYM	1
#define HTt_DEFINE_STR		2
#define HTt_GLBL_VAR		3
#define HTt_CLASS		4
#define HTt_INTERNAL_TYPE	5
#define HTt_FUN			6
#define HTt_WORD		7
#define HTt_DICT_WORD		8
#define HTt_KEYWORD		9
#define HTt_ASM_KEYWORD		10
#define HTt_OPCODE		11
#define HTt_REG			12
#define HTt_FILE		13
#define HTt_MODULE		14
#define HTt_HELP_FILE		15
#define HTt_FRAME_PTR		16
#define HTt_TYPES_NUM		17

#define HTf_PRIVATE		23
#define HTf_PUBLIC		24
#define HTf_EXPORT		25
#define HTf_IMPORT		26
#define HTf_IMM			27
#define HTf_GOTO_LABEL		28
#define HTf_RESOLVED		29
#define HTf_UNRESOLVED		30
#define HTf_LOCAL		31

#define HTT_INVALID		0
#define HTT_EXPORT_SYS_SYM	0x00001 //CHashExport
#define HTT_IMPORT_SYS_SYM	0x00002 //CHashImport
#define HTT_DEFINE_STR		0x00004 //CHashDefineStr
#define HTT_GLBL_VAR		0x00008 //CHashGlblVar
#define HTT_CLASS		0x00010 //CHashClass
#define HTT_INTERNAL_TYPE	0x00020 //CHashClass
#define HTT_FUN			0x00040 //CHashFun
#define HTT_WORD		0x00080 //CHashAC only in AutoComplete table
#define HTT_DICT_WORD		0x00100 //CHashGeneric only in AutoComplete tbl
#define HTT_KEYWORD		0x00200 //CHashGeneric $LK,"KEYWORD",A="FF:::/Compiler/OpCodes.DD,KEYWORD"$
#define HTT_ASM_KEYWORD		0x00400 //CHashGeneric $LK,"ASM_KEYWORD",A="FF:::/Compiler/OpCodes.DD,ASM_KEYWORD"$
#define HTT_OPCODE		0x00800 //CHashOpcode
#define HTT_REG			0x01000 //CHashReg
#define HTT_FILE		0x02000 //CHashGeneric
#define HTT_MODULE		0x04000 //CHashGeneric
#define HTT_HELP_FILE		0x08000 //CHashSrcSym
#define HTT_FRAME_PTR		0x10000 //CHashGeneric
#define HTG_TYPE_MASK		0x1FFFF

#define HTF_PRIVATE		0x00800000
#define HTF_PUBLIC		0x01000000
#define HTF_EXPORT		0x02000000
#define HTF_IMPORT		0x04000000
#define HTF_IMM			0x08000000
#define HTF_GOTO_LABEL		0x10000000
#define HTF_RESOLVE		0x20000000
#define HTF_UNRESOLVED		0x40000000
#define HTF_LOCAL		0x80000000
#define HTG_FLAGS_MASK		0xFF000000

#define HTG_SRC_SYM	(HTT_DEFINE_STR|HTT_GLBL_VAR|HTT_FUN|HTT_CLASS|\
			HTT_EXPORT_SYS_SYM|HTT_HELP_FILE)
#define HTG_ALL 		-1

public class CHashGeneric:CHash
{
  I64 user_data0,user_data1,user_data2;
};

extern class CAOTImportExport;
extern class CDbgInfo;

public class CHashSrcSym:CHash
{
  U8 *src_link,*idx;
  CDbgInfo *dbg_info;
  U8 *import_name;
  CAOTImportExport *ie_lst;
};

public class CHashExport:CHashSrcSym
{
  I64 val;
};

public class CHashDefineStr:CHashSrcSym
{
  U8 *data,**sub_idx;
  I64 cnt;
};

#define TASK_HASH_TABLE_SIZE (1<<10)
`;

export const HASH_SRC=String.raw`
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
`;
