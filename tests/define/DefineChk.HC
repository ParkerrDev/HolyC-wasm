U8 *def_lists[5]={"","One\0@Uno\0Two\0Three\0",
  "@Alias\0One\0@Uno\0","@Only\0@Also\0","A\0AB\0A\0"};
U64 def_hash;
I64 def_cnt;

U0 DefineAssert(Bool val)
{
  if (!val) throw('DefChk');
}

U0 DefineMix(I64 val)
{
  def_hash=(def_hash^val)*0x100000001B3;
  def_cnt++;
}

U0 DefineDrop(CHashDefineStr *entry)
{
  U8 **idx=entry->sub_idx;
  DefineAssert(HashRemDel(entry,Fs->hash_table));
  Free(idx);
}

U0 DefineChk()
{
  I64 i,j,k,len,error;
  U8 *src,*ptr,*input,*name,*data;
  CHashTable *saved=Fs->hash_table,*table=HashTableNew(64),*expanded;
  CHashDefineStr *entry,*newer;
  CHashGeneric *item;
  Bool silent;
  Fs->hash_table=table;
  def_hash=0xCBF29CE484222325;
  def_cnt=0;
  DefineAssert(!Define(NULL) && !DefineSub(0,NULL) && DefineCnt(NULL)==-1);
  DefineAssert(!HashDefineLstAdd("Absent",HTT_FRAME_PTR,table));
  for (i=0;i<100;i++) {
    name=MStrPrint("D54_%d",i);
    src=ptr=def_lists[i%5];
    while (*ptr) while (*ptr++);
    len=ptr-src+1;
    input=MAlloc(len);
    MemCpy(input,src,len);
    entry=DefineLstLoad(name,input);
    DefineMetaChk(entry);
    DefineAssert(entry->type==HTT_DEFINE_STR && !StrCmp(entry->str,name));
    DefineAssert(entry->data!=input && !MemCmp(entry->data,input,len));
    DefineAssert(entry->cnt==DefineCnt(name) && Define(name)==entry->data);
    for (ptr=input,k=0;*ptr;) {
      if (*ptr!='@') {
	DefineAssert(DefineSub(k,name)==ptr && entry->sub_idx[k]==ptr);
	k++;
      }
      while (*ptr++);
    }
    DefineAssert(k==entry->cnt && !DefineSub(-1,name) && !DefineSub(k,name));
    DefineMix(k);
    expanded=HashTableNew(8);
    DefineAssert(HashDefineLstAdd(name,HTT_FRAME_PTR,expanded)==k);
    for (j=0;j<8;j++)
      for (item=expanded->body[j];item;item=item->next) {
	DefineMix(HashStr(item->str));
	DefineMix(item->user_data0);
      }
    HashTableDel(expanded);
    if (k) {
      ptr=DefineSub(0,name);
      *ptr='Z';
      DefineAssert(*DefineSub(0,name)=='Z' && !MemCmp(Define(name),src,len));
    }
    data=Define(name);
    newer=DefineLoad(name,"Shadow");
    DefineMetaChk(newer);
    DefineAssert(Define(name)==newer->data && DefineCnt(name)==-1 &&
	  !DefineSub(0,name) && !StrCmp(newer->data,"Shadow"));
    DefineDrop(newer);
    DefineAssert(Define(name)==data);
    DefineDrop(entry);
    Free(input);
    Free(name);
  }
  entry=DefineLoad("A54Null",NULL);
  DefineMetaChk(entry);
  DefineAssert(entry->data && !*entry->data && entry->cnt==-1);
  DefineDrop(entry);
  DefinePrint("A54Print","%s:%04d:%X","Value",7,0xAB);
  DefineAssert(!StrCmp(Define("A54Print"),"Value:0007:AB"));
  entry=HashFind("A54Print",table,HTT_DEFINE_STR);
  DefineMetaChk(entry);
  DefineDrop(entry);
  entry=DefineLstLoad("A54Match","One\0@Uno\0Only\0Two\0");
  DefineAssert(DefineMatch("On","A54Match")==-2 &&
	DefineMatch("One","A54Match")==0 &&
	DefineMatch("uno","A54Match",LMF_IGNORE_CASE)==0 &&
	DefineMatch("On","A54Match",LMF_EXACT)==-1);
  DefineDrop(entry);
  silent=Silent;
  for (i=0;i<4;i++) {
    error=0;
    try {
      switch (i) {
	case 0:
	  Define("A54Missing");
	  break;
	case 1:
	  DefineSub(0,"A54Missing");
	  break;
	case 2:
	  DefineCnt("A54Missing");
	  break;
	case 3:
	  DefineMatch("A","A54Missing");
      }
    } catch {
      error=Fs->except_ch;
      Fs->catch_except=TRUE;
    }
    DefineAssert(error=='UndefDef');
    DefineMix(error);
  }
  Silent(silent);
  Fs->hash_table=saved;
  HashTableDel(table);
  "Define:%016X:%d\n",def_hash,def_cnt;
}

DefineChk;
