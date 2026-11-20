U32 text_buf[TEXT_ROWS*TEXT_COLS];
CTask text_task;

U0 TextBaseShow()
{
  I64 x,y;
  for (y=0;y<6;y++) {
    for (x=0;x<12;x++)
      "%06X ",text_buf[y*TEXT_COLS+x];
    '\n';
  }
}

U0 TextBaseTest()
{
  U32 *old_base=gr.text_base,attrs[4];
  CTask *task=&text_task;
  if (sys_winmgr_task!=Fs)
    Suspend(sys_winmgr_task);
  MemSet(task,0,sizeof(CTask));
  task->win_left=2;
  task->win_right=8;
  task->win_top=1;
  task->win_bottom=4;
  task->scroll_x=8;
  MemSetU32(text_buf,0,TEXT_ROWS*TEXT_COLS);
  gr.text_base=text_buf;
  "%d",TextChar(task,,0,0,'A'+0x1200);
  "%d",TextChar(task,,-2,0,'B'+0x1200);
  "%d",TextChar(task,TRUE,-2,-1,'C'+0x1200);
  "%d",TextChar(task,TRUE,6,4,'D'+0x1200);
  "%d",TextChar(task,,6,4,'E'+0x1200);
  "%d",TextLenStr(task,-3,1,9,0x3400,"abcdefghi");
  attrs[0]=0x5601;attrs[1]=0x5602;attrs[2]=0x5603;attrs[3]=0x5604;
  "%d",TextLenAttrStr(task,4,2,4,attrs);
  "%d",TextLenAttr(task,0,0,5,0x7800);
  "%d",TextLenStr(task,0,9,3,0x3400,"xyz");
  TextPrint(task,1,3,0x9A,"%d!",42);
  TextRect(9,11,4,5,0xBC00+'r');
  gr.text_base=old_base;
  if (sys_winmgr_task!=Fs)
    Suspend(sys_winmgr_task,FALSE);
  '\n';
  TextBaseShow;
}

TextBaseTest;
