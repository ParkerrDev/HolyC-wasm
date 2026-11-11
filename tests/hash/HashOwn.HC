I64 ho_types[13]={HTT_KEYWORD,HTT_DICT_WORD,HTT_FILE,
	HTT_MODULE,HTT_WORD,HTT_REG,HTT_IMPORT_SYS_SYM,HTT_EXPORT_SYS_SYM,
	HTT_DEFINE_STR,HTT_HELP_FILE,HTT_DEFINE_STR|HTT_EXPORT_SYS_SYM,
	HTT_DICT_WORD|HTT_FILE,HTT_DEFINE_STR|HTT_GLBL_VAR};
I64 ho_cnt=0;
U64 ho_hash=0;

U0 HashOwnRecord(I64 value)
{
  ho_hash=(ho_hash^value)*0x100000001B3;
  ho_cnt++;
}

CHashGeneric *HashOwnNode(U8 *name,I64 type,I64 value=0)
{
  CHashGeneric *res=CAlloc(sizeof(CHashGeneric));
  res->str=StrNew(name);
  res->type=type;
  res->user_data0=value;
  return res;
}

U0 HashOwnDel(I64 type)
{//The observer reports real native or host live heap spans.
  I64 before=HashHeapUsed,keep_size=0,keep_cnt=0,i;
  CHashDefineStr *tmph=CAlloc(sizeof(CHashDefineStr));
  U8 *keep[12],**node,**next;
  tmph->str=StrNew("Owned");
  tmph->type=type;
  if (type&HTT_DICT_WORD) keep[keep_cnt++]=tmph->str;
  if (type&(HTG_SRC_SYM|HTT_IMPORT_SYS_SYM)) {
    tmph->src_link=StrNew("Source");
    tmph->idx=StrNew("Index");
    tmph->import_name=StrNew("Import");
    next=&tmph->ie_lst;
    for (i=0;i<3;i++) {
      node=CAlloc(24);
      *next=node;
      next=node;
      if (!(type&HTG_SRC_SYM)) keep[keep_cnt++]=node;
    }
    if (!(type&HTG_SRC_SYM)) {
      keep[keep_cnt++]=tmph->src_link;
      keep[keep_cnt++]=tmph->idx;
      keep[keep_cnt++]=tmph->import_name;
    }
    tmph->dbg_info=MAlloc(19);
    if (!(type&HTT_EXPORT_SYS_SYM)) keep[keep_cnt++]=tmph->dbg_info;
    if (type&HTT_DEFINE_STR) {
      tmph->data=StrNew("Data");
      tmph->sub_idx=MAlloc(27);
      keep[keep_cnt++]=tmph->sub_idx;
    }
  } else if (type&HTT_FILE)
    tmph(CHashGeneric *)->user_data0=MAlloc(41);
  for (i=0;i<keep_cnt;i++) keep_size+=MSize2(keep[i]);
  HashDel(tmph);
  if (HashHeapUsed!=before+keep_size) throw('HashOwn');
  for (i=0;i<keep_cnt;i++) Free(keep[i]);
  if (HashHeapUsed!=before) throw('HashLeak');
  HashOwnRecord(type);
}

U0 HashOwn()
{
  I64 i,before,retained;
  CHashTable *parent,*table;
  CHashGeneric *a,*b,*c,*fake;
  ho_hash=0xCBF29CE484222325;
  ho_cnt=0;
  HashOwnRecord(sizeof(CHashSrcSym));
  HashOwnRecord(sizeof(CHashDefineStr));
  HashOwnRecord(sizeof(CHashExport));
  HashOwnRecord(offset(CHashSrcSym.ie_lst));
  HashOwnRecord(offset(CHashDefineStr.data));
  HashOwnRecord(offset(CHashExport.val));
  HashDel(NULL);HashTableDel(NULL);
  for (i=0;i<13;i++) HashOwnDel(ho_types[i]);
  before=HashHeapUsed;
  parent=HashTableNew(8);
  a=HashOwnNode("Shared",HTT_KEYWORD,17);
  HashAdd(a,parent);
  retained=HashHeapUsed;
  table=HashTableNew(8);
  table->next=parent;
  b=HashOwnNode("Shared",HTT_KEYWORD,29);
  HashAdd(b,table);
  fake=HashFind("Shared",table,HTT_KEYWORD);
  HashOwnRecord(fake->user_data0);
  if (HashRemDel(a,table)) throw('HashNext');
  HashTableDel(table);
  if (HashHeapUsed!=retained) throw('Ancestor');
  fake=HashFind("Shared",parent,HTT_KEYWORD);
  HashOwnRecord(fake->user_data0);
  HashTableDel(parent);
  if (HashHeapUsed!=before) throw('Table');
  table=HashTableNew(8);
  a=HashOwnNode("Same",HTT_KEYWORD|HTF_PRIVATE,1);
  b=HashOwnNode("Same",HTT_MODULE|HTF_PRIVATE,2);
  c=HashOwnNode("Same",HTT_KEYWORD,3);
  HashAdd(a,table);HashAdd(b,table);HashAdd(c,table);
  c->use_cnt=0xFFFFFFFF;
  if (HashRemDel(a,table,0) || HashRemDel(a,table,-1) ||
	HashRemDel(a,table) || HashRemDel(a,table,2))
    throw('Instance');
  if (c->use_cnt || b->use_cnt!=1 || a->use_cnt) throw('HashCnt');
  HashOwnRecord(c->use_cnt);HashOwnRecord(b->use_cnt);
  fake=HashOwnNode("Same",HTT_KEYWORD);
  if (HashRemDel(fake,table) || c->use_cnt!=1) throw('Identity');
  HashDel(fake);
  if (!HashRemDel(a,table,3)) throw('Remove');
  HashOwnRecord(HashFind("Same",table,HTG_ALL)(CHashGeneric *)->user_data0);
  if (!HashRemDel(b,table)) throw('Private');
  if (!HashRemDel(c,table)) throw('Last');
  HashTableDel(table);
  if (HashHeapUsed!=before) throw('RemLeak');
  "HashOwn:%016X:%d\n",ho_hash,ho_cnt;
}

HashOwn;
