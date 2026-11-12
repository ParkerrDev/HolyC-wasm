I64 parse_effect=0;
U8 *parse_reject[34]={"DA","DA,\"data\"","HX","HX,8,8",
      "PL,1","LM,1","RM,1","HD,1","FO,1","ID,1","FG,1","BG,1",
      "FD,1","BD,1","WW,1","HL,1","BK,1","IV,1","UL,1","SX,1","SY,1",
      "TX,\"owned\",LEN=1","TX,\"owned\",LE=1","TX,\"owned\",RE=1",
      "TX,\"owned\",BI=1","TX,\"owned\",BP=\"not-linked\"",
      "TX,\"owned\",RT=I64","TX,\"owned\",SX=1","TX,\"owned\",SY=1",
      "TX,\"owned\",SCX=1","TX,\"owned\",U=1","LS-P,\"owned\"",
      "FG,ParseSide()","TX,\"owned\",LE=ParseSide()"};

I64 ParseSide()
{
  return ++parse_effect;
}

U0 ParseReject()
{
  CDoc *doc=CAlloc(sizeof(CDoc)),copy;
  CDocEntry *entry;
  U8 *except=Fs->next_except,*st;
  I64 i,error;
  doc->mem_task=Fs;
  QueInit(doc);
  MemCpy(&copy,doc,sizeof(CDoc));
  parse_effect=0;
  for (i=0;i<sizeof(parse_reject)/sizeof(U8 *);i++) {
    entry=NULL;error=0;
    st=StrNew(parse_reject[i]);
    try entry=PrsDollarCmd(doc,st);
    catch {
      error=Fs->except_ch;
      Fs->catch_except=TRUE;
    }
    if (error!='DocCaps' || entry || Fs->next_except!=except ||
	  MemCmp(doc,&copy,sizeof(CDoc)) || StrCmp(st,parse_reject[i]) ||
	  parse_effect) throw('PrsCaps');
    Free(st);
  }
  Free(doc);
  "ParseReject:%d:0\n",i;
}

ParseReject;
