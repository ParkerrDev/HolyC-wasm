//V5.03 keyboard tables and set-1 state machine; device effects cross explicit imports.
export const KBD_SRC=String.raw`
U8 kbd_normal_table[80]={
  0,27,49,50,51,52,53,54,55,56,57,48,45,61,8,9,
  113,119,101,114,116,121,117,105,111,112,91,93,10,0,97,115,
  100,102,103,104,106,107,108,59,39,96,0,92,122,120,99,118,
  98,110,109,44,46,47,0,42,0,32,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,45,0,0,0,43,0,
};

U8 kbd_shift_table[80]={
  0,28,33,64,35,36,37,94,38,42,40,41,95,43,8,9,
  81,87,69,82,84,89,85,73,79,80,123,125,10,0,65,83,
  68,70,71,72,74,75,76,58,34,126,0,124,90,88,67,86,
  66,78,77,60,62,63,0,42,0,31,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,45,0,0,0,43,0,
};

U8 kbd_ctrl_table[80]={
  0,27,49,50,51,52,53,54,55,56,57,48,45,61,8,9,
  17,23,5,18,20,25,21,9,15,16,91,93,10,0,1,19,
  4,6,7,8,10,11,12,59,39,96,0,92,26,24,3,22,
  2,14,13,44,46,47,0,42,0,32,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,45,0,0,0,43,0,
};

I64 Char2ScanCode(I64 ch,I64 sc_flags=0)
{//ASCII val to scan code (Slow).
  I64 i;
  U8 *table;
  if (sc_flags) {
    table=kbd_normal_table;
    if (sc_flags & SCF_CTRL || ch<26)
      table=kbd_ctrl_table;
    else if (sc_flags & SCF_SHIFT || 'A'<=ch<='Z') {
      if (!(sc_flags & SCF_CAPS))
	table=kbd_shift_table;
    } else {
      if (sc_flags & SCF_CAPS)
	table=kbd_shift_table;
    }
    for (i=0;i<0x50;i++)
      if (table[i]==ch)
	return i|sc_flags;
    return sc_flags;
  } else {
    table=kbd_normal_table;
    for (i=0;i<0x50;i++)
      if (table[i]==ch)
	return i;
    table=kbd_shift_table;
    for (i=0;i<0x50;i++)
      if (table[i]==ch)
	return i|SCF_SHIFT;
    table=kbd_ctrl_table;
    for (i=0;i<0x50;i++)
      if (table[i]==ch)
	return i|SCF_CTRL;
    return 0;
  }
}

U8 ScanCode2Char(I64 sc)
{//Scan code to ASCII val.
  U8 *table=kbd_normal_table;
  if (sc&SCF_E0_PREFIX)
    return 0;
  if (sc&SCF_CTRL)
    table=kbd_ctrl_table;
  else if (sc&SCF_SHIFT) {
    if (!(sc&SCF_CAPS))
      table=kbd_shift_table;
  } else {
    if (sc&SCF_CAPS)
      table=kbd_shift_table;
  }
  sc&=0x7F;
  if (sc>=0x50)
    return 0;
  else
    return table[sc];
}

U8 scan_code_map[0x100]={
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,SC_SHIFT,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,

  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,SC_ENTER,SC_CTRL,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0x35,0,0,SC_ALT,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,SC_HOME,
	SC_CURSOR_UP,SC_PAGE_UP,0,SC_CURSOR_LEFT,0,SC_CURSOR_RIGHT,0,SC_END,
  SC_CURSOR_DOWN,SC_PAGE_DOWN,SC_INS,SC_DELETE,0,0,0,0,
	0,0,0,0,SC_GUI,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
};

U8 num_lock_map[0x100]={
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,8,9,10,0,5,6,7,0,2,
  3,4,11,0x34,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,

  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,SC_ENTER,SC_CTRL,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0x35,0,0,SC_ALT,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,SC_HOME,
	SC_CURSOR_UP,SC_PAGE_UP,0,SC_CURSOR_LEFT,0,SC_CURSOR_RIGHT,0,SC_END,
  SC_CURSOR_DOWN,SC_PAGE_DOWN,SC_INS,SC_DELETE,0,0,0,0,
	0,0,0,0,SC_GUI,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
};

U0 KbdBuildSC(U8 raw_byte,Bool in_irq,U8 *_last_raw_byte,I64 *_last_sc)
{
  I64 ch,sc_flags,sc,sc2,sc_raw,new_key_f;
  Bool set_LEDs=FALSE;
  if (raw_byte==0xE0) {
    *_last_sc&=~0x1FF;
    *_last_raw_byte=raw_byte;
    return;
  }
  sc=raw_byte;
  BEqu(&sc,SCf_E0_PREFIX,*_last_raw_byte==0xE0);
  BEqu(&sc,SCf_KEY_UP,raw_byte & 0x80);
  *_last_raw_byte=raw_byte;

  sc_flags=_last_sc->u32[0]&~0x1FF;
  sc_raw=sc;

  if (sc_flags & SCF_NUM) {
    if (sc2=num_lock_map[sc.u8[0]])
      sc.u8[0]=sc2;
  } else {
    if (sc2=scan_code_map[sc.u8[0]])
      sc.u8[0]=sc2;
  }

  new_key_f=SCF_NEW_KEY;
  if (sc&SCF_KEY_UP)
    switch (sc&~SCF_KEY_UP) {
      case SC_SHIFT:	sc_flags&=~SCF_SHIFT;	break;
      case SC_CTRL:	sc_flags&=~SCF_CTRL;	break;
      case SC_ALT:	sc_flags&=~SCF_ALT;	break;
      case SC_DELETE:	sc_flags&=~SCF_DELETE;	break;
      case SC_INS:	sc_flags&=~SCF_INS;	break;
      case SC_CAPS:	sc_flags^=SCF_CAPS;	set_LEDs=TRUE;	break;
      case SC_NUM:	sc_flags^=SCF_NUM;	set_LEDs=TRUE;	break;
      case SC_SCROLL:	sc_flags^=SCF_SCROLL;	set_LEDs=TRUE;	break;
    }
  else
    switch (sc) {
      case SC_SHIFT:
	if (Bts(&sc_flags,SCf_SHIFT)) new_key_f=0;
	break;
      case SC_CTRL:
	if (Bts(&sc_flags,SCf_CTRL)) new_key_f=0;
	break;
      case SC_ALT:
	if (Bts(&sc_flags,SCf_ALT)) new_key_f=0;
	break;
      case SC_DELETE:
	sc_flags|=SCF_DELETE;
	break;
      case SC_INS:
	sc_flags|=SCF_INS;
	break;
    }

  sc_flags|=new_key_f;
  sc=sc_flags|sc|(sc_flags|sc_raw)<<32;
  if (sc_flags & SCF_CTRL && sc_flags & SCF_ALT) {
    if (!(sc&SCF_KEY_UP)) {
      if (sc&255==SC_DELETE && !(sc_flags & SCF_SHIFT))
	__kbd_ctrl_alt(sc,-1,in_irq);
      else {
	if (sc&255==SC_ESC)
	  ch='t';
	else if (sc&255==SC_TAB)
	  ch='n';
	else
	  ch=ScanCode2Char(sc&255);
	if ('a'<=ch<='z') {
	  sc&=~(SCF_NEW_KEY|SCF_NEW_KEY<<32);
	  ch-='a';
	  kbd.last_down_scan_code=sc;
	  __kbd_ctrl_alt(sc,ch,in_irq);
	}
      }
    }
  }
  if (set_LEDs && !in_irq)
    __kbd_leds(sc);
  *_last_sc=sc;
}

U8 kbd_last_raw;

U0 KbdHostInit()
{
  MemSet(&kbd,0,sizeof(CKbdStateGlbls));
  kbd_last_raw=0;
}

U0 KbdHostByte(U8 raw_byte)
{//Decode one set-1 byte and post its native key message.
  I64 code;
  kbd.timestamp=GetTSC;
  KbdBuildSC(raw_byte,FALSE,&kbd_last_raw,&kbd.scan_code);
  if (Btr(&kbd.scan_code,SCf_NEW_KEY)) {
    kbd.new_key_timestamp=kbd.timestamp;
    Btr(&kbd.scan_code,32+SCf_NEW_KEY);
    kbd.cnt++;
    if (!(kbd.scan_code&SCF_KEY_UP)) {
      kbd.last_down_scan_code=kbd.scan_code;
      Bts(kbd.down_bitmap,kbd.scan_code.u8[0]);
      Bts(kbd.down_bitmap2,kbd.scan_code.u8[4]);
      code=MSG_KEY_DOWN;
    } else {
      Btr(kbd.down_bitmap,kbd.scan_code.u8[0]);
      Btr(kbd.down_bitmap2,kbd.scan_code.u8[4]);
      code=MSG_KEY_UP;
    }
    if (TaskValidate(sys_focus_task))
      TaskMsg(sys_focus_task,NULL,code,ScanCode2Char(kbd.scan_code),
	    kbd.scan_code,0);
  }
}

U0 KbdHostReset()
{//Release held physical keys after focus loss or a lost input packet.
  I64 i;
  kbd_last_raw=0;
  for (i=0;i<256;i++)
    if (Bt(kbd.down_bitmap2,i)) {
      if (i&0x80) KbdHostByte(0xE0);
      KbdHostByte(i&0x7F|0x80);
    }
  MemSet(kbd.down_bitmap,0,sizeof(kbd.down_bitmap));
  MemSet(kbd.down_bitmap2,0,sizeof(kbd.down_bitmap2));
  kbd_last_raw=0;
}
`;
