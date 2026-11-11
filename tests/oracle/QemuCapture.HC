CTask *oracle_task=Fs;
I64 oracle_except=0;
U8 oracle_stamp[64];

U0 OracleOut(U8 *st)
{//QEMU's debug port keeps guest output outside the display driver.
  while (*st)
    OutU8(0xE9,*st++);
}

Bool OracleKey(I64 ch,I64 sc)
{
  if (Fs!=oracle_task)
    return FALSE;
  if (!(sc&SCF_KEY_DESC))
    OutU8(0xE9,ch);
  return TRUE;
}

Bool OracleStr(U8 *st)
{
  if (Fs!=oracle_task)
    return FALSE;
  OracleOut(st);
  return TRUE;
}

StrPrint(oracle_stamp,"\x1E%d:B\x1F",ORACLE_NUM);
OracleOut(oracle_stamp);
CKeyDevEntry *oracle_kd=KeyDevAdd(&OracleKey,&OracleStr,1,FALSE);
try
  ExeFile2(ORACLE_FILE);
catch {
  oracle_except=Fs->except_ch;
  Fs->catch_except=TRUE;
}
KeyDevRem(oracle_kd);
StrPrint(oracle_stamp,"\x1E%d:E:%X\x1F",ORACLE_NUM,oracle_except);
OracleOut(oracle_stamp);
