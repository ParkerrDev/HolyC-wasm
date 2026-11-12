U8 *put_text[19]={"",
      "plain",
      "a\tb\nc\r\nd",
      "a\r\r\n\r\rb",
      "$$$$",
      "$$$$$$",
      "$$RED$$red$$FG$$tail",
      "$$CL$$",
      "$$CL+H$$",
      "$$TX,\"tag\",A=\"aux\"$$",
      "$$CB,\"check\"$$",
      "$$TR,\"tree\"$$",
      "$$MA,LM=\"Run;\"$$",
      "$$UNKNOWN$$",
      "$$TX$$",
      "$$RED",
      "trailing$$",
      "a$$$$b$$$$c",
      "$$AN,\"here\"$$$$LK,\"there\",A=\"FI:Path\"$$"};

I64 PutFlags(I64 mask)
{
  I64 flags=0;
  if (mask&1) flags|=DOCF_PLAIN_TEXT;
  if (mask&2) flags|=DOCF_PLAIN_TEXT_TABS;
  if (mask&4) flags|=DOCF_NO_CURSOR;
  if (mask&8) flags|=DOCF_DBL_DOLLARS;
  return flags;
}

U0 PutCase(U8 *text,I64 mask,I64 pos,Bool fmt=FALSE)
{
  CDoc *doc=RecalcNew;
  CDocEntry *entry,*res;
  U8 *st=StrNew(text);
  doc->flags=PutFlags(mask);
  if (pos) {
    entry=RecalcEntry(doc,DOCT_TEXT|0x3C00,"before");
    doc->cur_entry=entry;
    doc->cur_col=pos-1;
    RecalcEntry(doc,DOCT_SOFT_NEW_LINE);
    RecalcEntry(doc,DOCT_TEXT|0x3C00,"after");
  }
  if (fmt) res=DocPrint(doc,"%s",st);
  else res=DocPutS(doc,st);
  if (StrCmp(st,text)) throw('PutInput');
  RecalcMix(RecalcIdx(doc,res));
  RecalcState(doc);
  RecalcDel(doc);
  Free(st);
}

U0 PutTest()
{
  I64 i,mask,term,pos,old_bits;
  U8 text[8];
  CDoc *doc,*old_doc;
  CDocEntry *entry;
  RecalcWindow(0);
  recalc_hash=0xCBF29CE484222325;recalc_cnt=0;
  RecalcMix(sizeof(char_bmp_zero_cr_nl_cursor));
  RecalcMix(sizeof(char_bmp_zero_tab_cr_nl_cursor));
  RecalcMix(sizeof(char_bmp_zero_tab_cr_nl_cursor_dollar));
  for (i=0;i<16;i++) {
    RecalcMix(char_bmp_zero_cr_nl_cursor[i]);
    RecalcMix(char_bmp_zero_tab_cr_nl_cursor[i]);
    RecalcMix(char_bmp_zero_tab_cr_nl_cursor_dollar[i]);
  }
  for (mask=0;mask<16;mask++)
    for (pos=0;pos<8;pos++)
      for (i=0;i<sizeof(put_text)/sizeof(U8 *);i++)
	PutCase(put_text[i],mask,pos,i&1);
  for (mask=0;mask<16;mask++)
    for (term=0;term<2;term++)
      for (i=0;i<256;i++) {
	text[0]='a';text[1]=i;text[2]='b';text[3]=0;
	if (term) {text[3]='\n';text[4]='z';text[5]=0;}
	PutCase(text,mask,0);
      }
  for (mask=0;mask<16;mask++) {
    text[0]='$$';text[1]=CH_CURSOR;text[2]='$$';text[3]=0;
    PutCase(text,mask,0);
    text[1]='C';text[2]=CH_CURSOR;text[3]='L';text[4]='$$';text[5]=0;
    PutCase(text,mask,2);
  }
  old_bits=char_bmp_zero_tab_cr_nl_cursor_dollar[0];
  Btr(char_bmp_zero_tab_cr_nl_cursor_dollar,'\t');
  PutCase("a\tb",0,2);
  char_bmp_zero_tab_cr_nl_cursor_dollar[0]=old_bits;
  doc=RecalcNew;
  RecalcMix(DocPutS(doc,NULL));RecalcState(doc);
  doc->doc_signature=0;
  RecalcMix(DocPutS(doc,"ignored"));
  RecalcMix(DocPrint(doc,"%s:%d","ignored",47));RecalcState(doc);
  doc->doc_signature=DOC_SIGNATURE_VAL;
  old_doc=Fs->put_doc;Fs->put_doc=doc;
  entry=DocPrint(NULL,"%s:%d","default",47);
  RecalcMix(RecalcIdx(doc,entry));RecalcState(doc);
  Fs->put_doc=NULL;
  RecalcMix(DocPutS(NULL,"ignored"));
  Fs->put_doc=old_doc;
  RecalcDel(doc);
  "Put:%016X:%d\n",recalc_hash,recalc_cnt;
}

PutTest;
