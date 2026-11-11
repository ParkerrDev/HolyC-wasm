extern U0 KbdHndlr();

U8 key_packets[105]={
  1,0x1E,1,0x1E,1,0x9E,
  1,0x2A,1,0x36,1,0x1E,1,0xAA,1,0x9E,1,0xB6,
  1,0x3A,1,0xBA,1,0x1E,1,0x9E,1,0x3A,1,0xBA,
  1,0x45,1,0xC5,1,0x47,1,0xC7,1,0x45,1,0xC5,
  2,0xE0,0x4B,2,0xE0,0xCB,
  2,0xE0,0x1D,1,0x10,1,0x90,2,0xE0,0x9D,
  1,0x38,1,0xB8,
  1,0x2A,1,0x01,1,0x81,1,0xAA,
  1,0x2A,1,0x39,1,0xB9,1,0xAA,
  4,0xE0,0x2A,0xE0,0x37,4,0xE0,0xB7,0xE0,0xAA,
  6,0xE1,0x1D,0x45,0xE1,0x9D,0xC5,
  2,0xE0,0x1C,2,0xE0,0x9C,
  1,0x0E,1,0x8E,
};

U0 KeyboardState()
{
  CKbdStateGlbls old;
  CTask *focus=sys_focus_task,*task=CAlloc(sizeof(CTask));
  CFifoU8 *bytes=FifoU8New(256);
  CFifoI64 *scans=FifoI64New(256);
  I64 i,j,cnt,code,ch,sc,flags=GetRFlags;
  task->addr=task;
  task->task_signature=TASK_SIGNATURE_VAL;
  task->next_input_filter_task=task->last_input_filter_task=task;
  QueInit(&task->srv_ctrl.next_waiting);
  QueInit(&task->srv_ctrl.next_done);
  CLI
  MemCpy(&old,&kbd,sizeof(kbd));
  MemSet(&kbd,0,sizeof(kbd));
  kbd.fifo=old.fifo;
  kbd.fifo2=bytes;
  kbd.scan_code_fifo=scans;
  sys_focus_task=task;
  FifoU8Ins(bytes,0);
  KbdHndlr;
  FifoI64Flush(scans);
  kbd.scan_code=kbd.last_down_scan_code=kbd.cnt=0;
  MemSet(kbd.down_bitmap,0,sizeof(kbd.down_bitmap));
  MemSet(kbd.down_bitmap2,0,sizeof(kbd.down_bitmap2));
  for (i=0;i<sizeof(key_packets);) {
    cnt=key_packets[i++];
    for (j=0;j<cnt;j++) FifoU8Ins(bytes,key_packets[i++]);
    while (FifoU8Cnt(bytes)) KbdHndlr;
    KbdMsgsQue;
    "%X %X %d ",kbd.scan_code,kbd.last_down_scan_code,kbd.cnt;
    for (j=0;j<8;j++) "%X ",kbd.down_bitmap[j];
    for (j=0;j<8;j++) "%X ",kbd.down_bitmap2[j];
    while (code=ScanMsg(&ch,&sc,~1,task)) "%d:%X:%X ",code,ch,sc;
    '\n';
  }
  sys_focus_task=focus;
  MemCpy(&kbd,&old,sizeof(kbd));
  SetRFlags(flags);
  FifoU8Del(bytes);
  FifoI64Del(scans);
  Free(task);
}

KeyboardState;
