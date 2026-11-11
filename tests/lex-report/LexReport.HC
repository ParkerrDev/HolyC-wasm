U64 report_hash=0;
I64 report_bytes=0,report_cases=0;
CTask *report_task=NULL;

U0 ReportMix(I64 n)
{
  report_hash=(report_hash^n)*1099511628211;
}

Bool ReportKey(I64 ch,I64 sc)
{
  if (Fs!=report_task) return FALSE;
  if (sc) throw('ReportSc');
  ReportMix(ch);
  report_bytes++;
  return TRUE;
}

Bool ReportStr(U8 *st)
{
  if (Fs!=report_task) return FALSE;
  while (*st) ReportKey(*st++,0);
  return TRUE;
}

U0 ReportToken(CCmpCtrl *cc)
{
  CCmpCtrl saved;
  MemCpy(&saved,cc,sizeof(CCmpCtrl));
  LexPutToken(cc);
  if (MemCmp(cc,&saved,sizeof(CCmpCtrl))) throw('TokenMod');
  report_cases++;
}

U0 ReportLine(CCmpCtrl *cc,U8 *src)
{
  CCmpCtrl saved;
  CLexFile file;
  MemCpy(&saved,cc,sizeof(CCmpCtrl));
  MemCpy(&file,cc->lex_include_stk,sizeof(CLexFile));
  LexPutLine(cc,src);
  if (MemCmp(cc,&saved,sizeof(CCmpCtrl)) ||
	MemCmp(&file,cc->lex_include_stk,sizeof(CLexFile)))
    throw('LineMod');
  report_cases++;
}

U0 LexReport()
{
  I64 i,j,error=0;
  U8 buf[320];
  CCmpCtrl cc;
  CLexFile file;
  CKeyDevGlbls saved;
  MemSet(&cc,0,sizeof(CCmpCtrl));
  MemSet(&file,0,sizeof(CLexFile));
  cc.lex_include_stk=&file;
  cc.cur_str="A$$B\tC\nD";
  cc.cur_i64=0x8765432101234567;
  cc.cur_f64=1.25;
  report_task=Fs;
  report_hash=14695981039346656037;
  report_bytes=report_cases=0;
  MemCpy(&saved,&keydev,sizeof(CKeyDevGlbls));
  MemSet(&keydev,0,sizeof(CKeyDevGlbls));
  QueInit(&keydev.put_key_head);
  try {
    KeyDevAdd(&ReportKey,&ReportStr,10,FALSE);
    ReportMix(sizeof(char_bmp_displayable));
    for (i=0;i<16;i++) ReportMix(char_bmp_displayable[i]);
    for (i=0;i<512;i++) {
      cc.token=i;
      ReportToken(&cc);
    }
    cc.token=TK_I64;
    cc.cur_i64=0;
    ReportToken(&cc);
    cc.cur_i64=I64_MIN;
    ReportToken(&cc);
    cc.cur_i64=I64_MAX;
    ReportToken(&cc);
    cc.token=TK_CHAR_CONST;
    ReportToken(&cc);
    cc.token=TK_STR;
    cc.cur_str=NULL;
    ReportToken(&cc);
    cc.cur_str="";
    ReportToken(&cc);
    cc.token=TK_F64;
    cc.cur_f64=-0.0;
    ReportToken(&cc);
    cc.cur_f64=-12.5;
    ReportToken(&cc);
    cc.cur_f64=1000000.0;
    ReportToken(&cc);
    ReportLine(&cc,NULL);
    ReportLine(&cc,"");
    ReportLine(&cc,"A\n\rB");
    ReportLine(&cc,"A\r\nB");
    ReportLine(&cc,"A\r\rB");
    ReportLine(&cc,"A\n\nB");
    ReportLine(&cc,"A\rB");
    ReportLine(&cc,"A\nB");
    ReportLine(&cc,"No end marker");
    for (i=1;i<256;i++) {
      buf[0]=i;
      buf[1]=0;
      ReportLine(&cc,buf);
    }
    for (i=0;i<320;i++) {
      for (j=0;j<i;j++) buf[j]='A'+j%26;
      buf[i]=0;
      ReportLine(&cc,buf);
    }
  } catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  while (keydev.put_key_head.next!=&keydev.put_key_head)
    KeyDevRem(keydev.put_key_head.next);
  MemCpy(&keydev,&saved,sizeof(CKeyDevGlbls));
  if (error) throw(error);
  "LexReport:%016X:%d:%d\n",report_hash,report_bytes,report_cases;
}

LexReport;
