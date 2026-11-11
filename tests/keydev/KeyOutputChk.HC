I64 kd_hash,kd_calls,kd_mask;

Bool KeyRecord(I64 num,I64 ch,I64 sc)
{
  kd_hash=(kd_hash^num)*0x100000001B3;
  kd_hash=(kd_hash^ch)*0x100000001B3;
  kd_hash=(kd_hash^sc)*0x100000001B3;
  kd_calls++;
  return ToBool(kd_mask&1<<num);
}

Bool KeyA(I64 ch,I64 sc)
{
  return KeyRecord(0,ch,sc);
}

Bool KeyB(I64 ch,I64 sc)
{
  return KeyRecord(1,ch,sc);
}

Bool KeyC(I64 ch,I64 sc)
{
  return KeyRecord(2,ch,sc);
}

Bool StrA(U8 *st)
{
  KeyRecord(0,0x10000,StrLen(st));
  while (*st) KeyRecord(0,*st++,0);
  return ToBool(kd_mask&1);
}

Bool StrC(U8 *st)
{
  KeyRecord(2,0x10000,StrLen(st));
  while (*st) KeyRecord(2,*st++,0);
  return ToBool(kd_mask&4);
}

U0 KeyOutputChk()
{
  I64 mode,silent,desc,sc,old_scan=kbd.scan_code,
	old_display=Fs->display_flags,cnt=0;
  CKeyDevGlbls saved;
  CKeyDevEntry *tmpk;
  kd_hash=0xCBF29CE484222325;
  kd_calls=0;
  MemCpy(&saved,&keydev,sizeof(CKeyDevGlbls));
  MemSet(&keydev,0,sizeof(CKeyDevGlbls));
  QueInit(&keydev.put_key_head);
  keydev.put_key_head.priority=0;
  kbd.scan_code&=~SCF_SCROLL;
  KeyDevAdd(&KeyC,&StrC,30,FALSE);
  KeyDevAdd(&KeyA,&StrA,10,FALSE);
  KeyDevAdd(&KeyB,NULL,20,TRUE);
  tmpk=keydev.put_key_head.next;
  while (tmpk!=&keydev.put_key_head) {
    kd_hash=(kd_hash^tmpk->priority)*0x100000001B3;
    tmpk=tmpk->next;
    cnt++;
  }
  if (cnt!=3) throw('KeyCount');
  for (mode=0;mode<8;mode++)
    for (silent=0;silent<2;silent++)
      for (desc=0;desc<2;desc++) {
	kd_mask=mode;
	Silent(silent);
	sc=0;
	if (desc) sc=SCF_KEY_DESC;
	PutKey('Z',sc);
	PutKey(0,sc);
	PutKey;
	PutS("A\n");
	PutS("");
	PutS(NULL);
	PutChars(0x420041);
      }
  Silent(OFF);
  kd_mask=0;
  KeyDevAdd(&KeyC,&StrC,20,TRUE);
  PutS("Replace");
  PutKey('R',SCF_KEY_DESC);
  while (keydev.put_key_head.next!=&keydev.put_key_head)
    KeyDevRem(keydev.put_key_head.next);
  MemCpy(&keydev,&saved,sizeof(CKeyDevGlbls));
  kbd.scan_code=old_scan;
  Fs->display_flags=old_display;
  "KeyOutput:%016X:%d:%d:%d\n",kd_hash,kd_calls,
	sizeof(CKeyDevEntry),sizeof(CKeyDevGlbls);
}
