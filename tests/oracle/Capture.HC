CTask *oracle_task=Fs;
U8 *oracle_buf=ORACLE_OUT;
I64 oracle_cnt=0;

Bool OracleKey(I64 ch,I64 sc)
{//Capture this task's output before it reaches the document.
  if (Fs!=oracle_task)
    return FALSE;
  if (!(sc&SCF_KEY_DESC) && oracle_cnt<ORACLE_SIZE)
    oracle_buf[oracle_cnt++]=ch;
  return TRUE;
}

Bool OracleStr(U8 *st)
{
  I64 ch;
  if (Fs!=oracle_task)
    return FALSE;
  while ((ch=*st++) && oracle_cnt<ORACLE_SIZE)
    oracle_buf[oracle_cnt++]=ch;
  return TRUE;
}

CKeyDevEntry *oracle_kd=KeyDevAdd(&OracleKey,&OracleStr,1,FALSE);
LBtr(&Fs->display_flags,DISPLAYf_SILENT);
try
  ExeFile2(ORACLE_FILE);
catch {
  *ORACLE_EXCEPT(I64 *)=Fs->except_ch;
  Fs->catch_except=TRUE;
}
KeyDevRem(oracle_kd);
*ORACLE_LEN(I64 *)=oracle_cnt;
