U8 *ext_srcs[12]={"\"A\" \"B\" END","\"\" \"\" \"C\" ",
  "\"one\"\\\"two\";","\"one\"\\\n\"two\" 17",
  "\"one\" \\\n\"two\" 17","\"one\"\n\"two\" END",
  "\"A\\x00B\" \"C\\x00D\" ","\"A\"/* outer /*inner*/ */\"B\" END",
  "\"A\"// line\n\"B\" END","\"A\" 17","before after","\"end\""};

U0 ExtValid()
{
  I64 i,next,size,flags;
  U8 buf[2048];
  CHashTable *table;
  CHashDefineStr *tmpd;
  ext_hash=14695981039346656037;ext_cases=0;
  for (i=0;i<12;i++)
    for (next=0;next<2;next++)
      for (size=0;size<2;size++)
	for (flags=0;flags<2;flags++)
	  ExtRun(ext_srcs[i],next,size,flags*CCF_KEEP_NEW_LINES);
  for (i=0;i<256;i++) {
    StrPrint(buf,"\"\\x%02X\" \"R\" END",i);
    for (next=0;next<2;next++)
      ExtRun(buf,next,TRUE,0);
  }
  buf[0]='\"';
  for (i=1;i<=1536;i++) buf[i]='A'+i%26;
  StrCpy(buf+1537,"\" \"tail\" END");
  ExtRun(buf,TRUE,TRUE,0);
  table=HashTableNew(16);
  tmpd=CAlloc(sizeof(CHashDefineStr));
  tmpd->str=StrNew("VALUE");
  tmpd->data=StrNew("\"B\" \"C\"");tmpd->type=HTT_DEFINE_STR;
  HashAdd(tmpd,table);
  for (next=0;next<2;next++)
    ExtRun("\"A\" VALUE \"D\" END",next,TRUE,0,table);
  HashTableDel(table);
  "ExtValid:%016X:%d\n",ext_hash,ext_cases;
}

ExtValid;
