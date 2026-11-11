I64 char_sent=0;

U0 CharSend(U8 *)
{
  CTask *task=Fs->parent_task;
  Sleep(1);
  PostMsg(task,MSG_KEY_UP,'z',999);
  PostMsg(task,MSG_CMD,'q',888);
  PostMsg(task,MSG_KEY_DOWN,0,SC_CURSOR_LEFT);
  char_sent++;
  Sleep(1);
  PostMsg(task,MSG_KEY_DOWN,'a',0xFEDCBA9876543210);
  char_sent++;
  Sleep(1);
  PostMsg(task,MSG_KEY_DOWN,0,SC_SHIFT);
  PostMsg(task,MSG_KEY_DOWN,CH_SHIFT_ESC,0x1234567800000201);
  char_sent++;
}

U0 CharCheck()
{
  I64 ch,sc;
  CTask *task=Spawn(&CharSend,,,,Fs);
  ch=GetChar(&sc,FALSE);
  "%d %X\n",ch,sc;
  ch=GetChar(&sc,FALSE);
  "%d %X\n",ch,sc;
  while (TaskValidate(task)) Yield;
  "%d\n",char_sent;
}

CharCheck;
