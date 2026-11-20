U64 doc_init_hash=0;
I64 doc_init_cnt=0;

U0 DocInitMix(I64 n)
{
  doc_init_hash=(doc_init_hash^n)*1099511628211;
  doc_init_cnt++;
}

U0 DocInitStr(U8 *st)
{
  while (*st) DocInitMix(*st++);
  DocInitMix(0);
}

U0 DocInitList(U8 *name)
{
  I64 i,cnt=DefineCnt(name);
  U8 *st;
  DocInitMix(cnt);
  for (i=0;i<cnt;i++) {
    st=DefineSub(i,name);
    if (!st) throw('DocList');
    DocInitStr(st);
  }
}

U0 DocDefaults()
{
  I64 i;
  CHashGeneric *tmph;
  doc_init_hash=14695981039346656037;
  doc_init_cnt=0;
  DocInitMix(sizeof(CDolDocGlbls));
  DocInitMix(offset(CDolDocGlbls.hash));
  DocInitMix(offset(CDolDocGlbls.dft_de_flags));
  DocInitMix(offset(CDolDocGlbls.type_flags_nontag_invis));
  DocInitMix(offset(CDolDocGlbls.type_flags_form));
  DocInitMix(offset(CDolDocGlbls.type_flags_data));
  DocInitMix(offset(CDolDocGlbls.type_flags_chk_dup));
  DocInitMix(offset(CDolDocGlbls.clean_scan_codes));
  DocInitMix(offset(CDolDocGlbls.dft_type_flags));
  for (i=0;i<DOCT_TYPES_NUM;i++) {
    DocInitMix(doldoc.dft_de_flags[i]);
    DocInitMix(doldoc.dft_type_flags[i]);
  }
  DocInitMix(doldoc.type_flags_nontag_invis[0]);
  DocInitMix(doldoc.type_flags_form[0]);
  DocInitMix(doldoc.type_flags_data[0]);
  DocInitMix(doldoc.type_flags_chk_dup[0]);
  for (i=0;i<4;i++) DocInitMix(doldoc.clean_scan_codes[i]);
  DocInitList("ST_DOC_CMDS");
  DocInitList("ST_DOC_FLAGS");
  DocInitList("ST_LINK_TYPES");
  DocInitList("ST_COLORS");
  DocInitMix(doldoc.hash->mask);
  for (i=0;i<=doldoc.hash->mask;i++) {
    DocInitMix(i);
    for (tmph=doldoc.hash->body[i];tmph;tmph=tmph->next) {
      DocInitStr(tmph->str);
      DocInitMix(tmph->type);
      DocInitMix(tmph->user_data0);
      DocInitMix(tmph->user_data1);
      DocInitMix(tmph->user_data2);
    }
  }
  "DocDefaults:%016X:%d\n",doc_init_hash,doc_init_cnt;
}

DocDefaults;
