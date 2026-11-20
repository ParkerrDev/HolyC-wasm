//V5.03 Compiler/CMisc.HC CmdLinePmt.

U8 *CmdLinePmt()
{
  I64 i;
  U8 *res,*st;
  if (Fs->new_answer) {
    if (Fs->answer_type&~1!=RT_I0) {
      if (Fs->answer_type==RT_F64)
	"%8.6fs ansf=%15.7g\n",Fs->answer_time,Fs->answer;
      else
	"%8.6fs ans=0x%08X=%d\n",Fs->answer_time,Fs->answer,Fs->answer;
    } else {
      "%8.6fs\n",Fs->answer_time;
      Fs->answer=0;
    }
    Fs->new_answer=FALSE;
  }
  if (st=DirCur) {
    "%s",st;
    Free(st);
  }
  '>';
//Back with RawDr (KDbg.HC):
//  if (IsDbgMode&&IsRaw)
//    RawDr;

  LBts(&Fs->task_flags,TASKf_CMD_LINE_PMT);
  st=GetStr(,,GSF_SHIFT_ESC_EXIT);
  LBtr(&Fs->task_flags,TASKf_CMD_LINE_PMT);

  i=StrLen(st);
  res=MAlloc(i+1+2);
  MemCpy(res,st,i+1);
  i--;
  while (i>=0 && Bt(char_bmp_white_space,res[i]))
    i--;
  i++;
  if (i>0 && res[i-1]==';')
    res[i++]=';'; //The Lex goes one beyond
  res[i++]='\n';//#define goes to '\n'
  res[i]=0;

  Free(st);
  return res;
}
