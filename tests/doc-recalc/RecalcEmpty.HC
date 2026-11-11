U0 RecalcEmptyName(U8 *name)
{
  CDoc *doc;
  I64 mode;
  for (mode=0;mode<8;mode++) {
    RecalcWindow(mode);
    doc=RecalcNew;
    StrCpy(doc->filename.name,name);
    if (mode&1) doc->flags|=DOCF_PLAIN_TEXT;
    if (mode&2) doc->flags|=DOCF_PLAIN_TEXT_TABS;
    if (mode&4) doc->flags|=DOCF_BORDER_DOC|DOCF_SIZE_MIN;
    if (!DocRecalc(doc)) throw('Recalc');
    RecalcState(doc);
    RecalcDel(doc);
  }
}

U0 RecalcEmpty()
{
  U8 name[64];
  I64 ch;
  recalc_hash=14695981039346656037;
  recalc_cnt=0;
  RecalcEmptyName("");RecalcEmptyName(".");
  RecalcEmptyName("A.HC");RecalcEmptyName("A.HC.Z");
  RecalcEmptyName("A.HH");RecalcEmptyName("A.IN");
  RecalcEmptyName("A.PRJ");RecalcEmptyName("A.hc");
  RecalcEmptyName("A.HC/Plain.DD");RecalcEmptyName("A/FILE.HC");
  RecalcEmptyName("C:/A.HC/");RecalcEmptyName("C:/A/FILE.HH.Z");
  RecalcEmptyName("A.HCX");RecalcEmptyName("A..HC");
  RecalcEmptyName("*.HC");RecalcEmptyName("A\\FILE.HC");
  for (ch=1;ch<256;ch++) {
    StrCpy(name,"A.HC");name[0]=ch;
    RecalcEmptyName(name);
    StrCpy(name,"Dir/A.HC");name[6]=ch;
    RecalcEmptyName(name);
  }
  "RecalcEmpty:%016X:%d\n",recalc_hash,recalc_cnt;
}

RecalcEmpty;
