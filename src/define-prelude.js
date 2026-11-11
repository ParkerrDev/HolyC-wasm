//Runtime define records; native return-address source links are unavailable.
export const DEFINE_SRC=String.raw`
#define ST_ERR_ST "$$LTRED$$$$BK,1$$ERROR:$$FG$$$$BK,0$$ "

CHashDefineStr *DefineLoad(U8 *dname,U8 *st)
{//Publish a task-owned string define after allocating its fields.
  CHashDefineStr *tmph=CAlloc(sizeof(CHashDefineStr));
  tmph->type=HTT_DEFINE_STR;
  try {
    tmph->str=StrNew(dname);
    tmph->data=StrNew(st);
    tmph->cnt=-1;
    HashAdd(tmph,Fs->hash_table);
  } catch
    HashDel(tmph);
  return tmph;
}

CHashDefineStr *DefineLstLoad(U8 *dname,U8 *lst)
{//The index borrows the original list, as in native V5.03.
  I64 cnt=0;
  U8 *ptr,**idx;
  CHashDefineStr *tmph=CAlloc(sizeof(CHashDefineStr));
  tmph->type=HTT_DEFINE_STR;
  try {
    tmph->str=StrNew(dname);
    ptr=lst;
    while (*ptr) {
      if (*ptr!='@') cnt++;
      while (*ptr++);
    }
    tmph->data=MAlloc(ptr+1-lst);
    MemCpy(tmph->data,lst,ptr+1-lst);
    tmph->cnt=cnt;
    idx=tmph->sub_idx=MAlloc(cnt*sizeof(U8 *));
    ptr=lst;
    while (*ptr) {
      if (*ptr!='@') *idx++=ptr;
      while (*ptr++);
    }
    HashAdd(tmph,Fs->hash_table);
  } catch {
    Free(tmph->sub_idx);
    HashDel(tmph);
  }
  return tmph;
}

U0 UndefinedDefine(U8 *dname)
{
  ST_ERR_ST "Undefined Define: '%s'.\n",dname;
  throw('UndefDef');
}

U8 *Define(U8 *dname)
{//Return the newest visible string define.
  CHashDefineStr *tmph;
  if (tmph=HashFind(dname,Fs->hash_table,HTT_DEFINE_STR))
    return tmph->data;
  if (dname) UndefinedDefine(dname);
  return NULL;
}

U8 *DefineSub(I64 sub,U8 *dname)
{//Return an indexed list entry, excluding aliases.
  CHashDefineStr *tmph;
  if (tmph=HashFind(dname,Fs->hash_table,HTT_DEFINE_STR)) {
    if (0<=sub<tmph->cnt) return tmph->sub_idx[sub];
    return NULL;
  }
  if (dname) UndefinedDefine(dname);
  return NULL;
}

I64 DefineCnt(U8 *dname)
{//String defines have count -1.
  CHashDefineStr *tmph;
  if (tmph=HashFind(dname,Fs->hash_table,HTT_DEFINE_STR))
    return tmph->cnt;
  if (dname) UndefinedDefine(dname);
  return -1;
}

I64 DefineMatch(U8 *needle,U8 *haystack_lst_dname,I64 flags=0)
{
  return LstMatch(needle,Define(haystack_lst_dname),flags);
}

U0 DefinePrint(U8 *dname,U8 *src,...)
{//Create a string define using native formatting.
  U8 *buf=StrPrintJoin(NULL,src,argc,argv);
  try DefineLoad(dname,buf);
  catch Free(buf);
  Free(buf);
}

I64 HashDefineLstAdd(U8 *dname,I64 type,CHashTable *table)
{//List expansion allocates entries on the calling task's heap.
  CHashDefineStr *tmph;
  if (tmph=HashFind(dname,Fs->hash_table,HTT_DEFINE_STR))
    return HashLstAdd(tmph->data,type,table);
  return 0;
}
`;
