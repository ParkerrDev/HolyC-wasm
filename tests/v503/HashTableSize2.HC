//Compiler/CHash.HC: HashTableSize2 and HashEntrySize2 on a private table.

U0 HashSizeChk()
{
  CHashTable *table=HashTableNew(16);
  CHashGeneric *tmph;
  CHashDefineStr *tmpd;
  CHashSrcSym *tmps;
  I64 empty=HashTableSize2(table);
  "%d\n",empty==MSize2(table->body)+MSize2(table);
  tmph=CAlloc(sizeof(CHashGeneric));
  tmph->type=HTT_FILE;
  tmph->str=StrNew("Abc.HC");
  tmph->user_data0=MAlloc(100);
  HashAdd(tmph,table);
  "%d %d\n",HashEntrySize2(tmph)==MSize2(tmph)+MSize2(tmph->str)+
	MSize2(tmph->user_data0),
	HashTableSize2(table)-empty==HashEntrySize2(tmph);
  tmpd=CAlloc(sizeof(CHashDefineStr));
  tmpd->type=HTT_DEFINE_STR;
  tmpd->str=StrNew("DEF_X");
  tmpd->data=StrNew("12345");
  HashAdd(tmpd,table);
  "%d\n",HashEntrySize2(tmpd)==MSize2(tmpd)+MSize2(tmpd->str)+MSize2(tmpd->data);
  tmps=CAlloc(sizeof(CHashSrcSym));
  tmps->type=HTT_DICT_WORD|HTT_HELP_FILE;
  tmps->str=StrNew("word");
  tmps->src_link=StrNew("FI:::/Doc/X.DD");
  HashAdd(tmps,table);
  "%d\n",HashEntrySize2(tmps)==MSize2(tmps)+MSize2(tmps->src_link);
  "%d\n",HashTableSize2(table)-empty==
	HashEntrySize2(tmph)+HashEntrySize2(tmpd)+HashEntrySize2(tmps);
  "%d\n",HashTableSize2(NULL);
  "%d\n",LinkedLstSize(NULL);
}

HashSizeChk;
