U64 hash_result;
I64 hash_cnt;
U0 HashRecord(I64 value)
{
  I64 i;
  for (i=0;i<8;i++) hash_result=(hash_result^value.u8[i])*0x100000001B3;
  hash_cnt++;
}

U0 HashCoreChk()
{
  I64 i,j,k,n,masks[8],instances[10];
  U64 seed=1;
  U8 bytes[513],names[9][16];
  CHashGeneric entries[66],*tmph,*tmph1;
  CHashTable *table=HashTableNew(32),*next=HashTableNew(8);
  hash_result=0xCBF29CE484222325;
  hash_cnt=0;
  HashRecord(sizeof(CHash));
  HashRecord(sizeof(CHashTable));
  HashRecord(sizeof(CHashGeneric));
  HashRecord(HashStr(NULL));
  for (i=0;i<4096;i++) {
    n=i%513;
    for (j=0;j<n;j++) {
      seed=seed*6364136223846793005+1;
      bytes[j]=1+seed>>32%255;
    }
    bytes[n]=0;
    HashRecord(HashStr(bytes));
  }
  MemSet(entries,0,sizeof(entries));
  for (i=0;i<9;i++) StrPrint(names[i],"Name%02d",i);
  table->next=next;
  for (i=0;i<64;i++) {
    tmph=&entries[i];
    tmph->str=names[i%8];
    tmph->type=1<<i%17;
    if (i&1) tmph->type|=HTF_PUBLIC;
    if (i&2) tmph->type|=HTF_PRIVATE;
    tmph->user_data0=i+1;
    if (i<32) HashAdd(tmph,table);
    else HashAdd(tmph,next);
  }
  entries[64].str=entries[65].str=names[0];
  entries[64].type=entries[65].type=HTT_KEYWORD;
  entries[64].user_data0=65;entries[65].user_data0=66;
  HashAddAfter(&entries[64],&entries[0],table);
  HashAddAfter(&entries[65],&entries[32],next);
  masks[0]=0;masks[1]=-1;masks[2]=HTG_TYPE_MASK;masks[3]=HTF_PUBLIC;
  masks[4]=HTF_PRIVATE;masks[5]=HTT_KEYWORD;masks[6]=1<<32;
  masks[7]=1<<32+HTF_PUBLIC;
  for (i=0;i<8;i++) instances[i]=i;
  instances[8]=-1;instances[9]=0x100000001;
  for (i=0;i<9;i++)
    for (j=0;j<8;j++)
      for (k=0;k<10;k++) {
	tmph=HashFind(names[i],table,masks[j],instances[k]);
	if (tmph) HashRecord(tmph->user_data0);
	else HashRecord(0);
	tmph=HashSingleTableFind(names[i],table,masks[j],instances[k]);
	if (tmph) HashRecord(tmph->user_data0);
	else HashRecord(0);
      }
  for (i=0;i<66;i++) HashRecord(entries[i].use_cnt);
  HashRecord(HashTypeNum(NULL));
  for (i=0;i<66;i++) HashRecord(HashTypeNum(&entries[i]));
  tmph=HashFind(names[0],table,HTT_KEYWORD);
  tmph->use_cnt=0xFFFFFFFF;
  HashFind(names[0],table,HTT_KEYWORD);
  HashRecord(tmph->use_cnt);
  MemSet(table->body,0,32*sizeof(U8 *));
  table->next=NULL;
  HashRecord(HashLstAdd(NULL,HTT_KEYWORD,table));
  HashRecord(HashLstAdd("@First\0One\0@Uno\0Two\0@Dos\0@\0Three\0",
	HTT_KEYWORD,table));
  for (i=0;i<32;i++) {
    tmph=table->body[i];
    while (tmph) {
      tmph1=tmph->next;
      HashRecord(HashStr(tmph->str));
      HashRecord(tmph->user_data0);
      Free(tmph->str);Free(tmph);
      tmph=tmph1;
    }
  }
  Free(table->body);Free(next->body);Free(table);Free(next);
  "HashCore:%016X:%d\n",hash_result,hash_cnt;
}

HashCoreChk;
