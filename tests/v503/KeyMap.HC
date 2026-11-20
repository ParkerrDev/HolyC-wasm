//V5.03 Training.HC's KeyMapKeyMStrPrint, KMComparePrepare and KMCompare, as
//KeyMapFamily makes and sorts its lines. No handler, so no link. Shift
//spaces print as _ and dollars as !.
U0 KMPrint(U8 *st)
{
  if (!st)
    "NULL\n";
  else {
    while (*st) {
      if (*st==CH_SHIFT_SPACE)
	'_';
      else if (*st=='$$')
	'!';
      else
	'' *st;
      st++;
    }
  }
}

U8 *e[6];
I64 i;
e[0]=KeyMapKeyMStrPrint(Char2ScanCode('b')|SCF_CTRL,NULL,"Edit /Bold");
e[1]=KeyMapKeyMStrPrint(Char2ScanCode('a')|SCF_CTRL|SCF_SHIFT,NULL,
      "Dol /Align");
e[2]=KeyMapKeyMStrPrint(SC_F1,NULL,"Cmd /Help");
e[3]=KeyMapKeyMStrPrint(Char2ScanCode('a')|SCF_CTRL|SCF_ALT,NULL,
      "Char  /x");
e[4]=KeyMapKeyMStrPrint(SC_CURSOR_UP|SCF_SHIFT,NULL,"Other /Up");
e[5]=NULL;
"%d %d %d\n",KMCompare(e[0],e[1])>0,KMCompare(e[1],e[0])<0,
      KMCompare(e[2],e[2]);
QSortI64(e,6,&KMCompare);
for (i=0;i<6;i++) {
  KMPrint(e[i]);
  Free(e[i]);
}
