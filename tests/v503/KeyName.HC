I64 scs[8]={SC_CURSOR_LEFT,SC_F1|SCF_SHIFT,SC_ESC|SCF_CTRL,
	0x1E|SCF_ALT,SC_DELETE,SC_ENTER|SCF_KEY_UP,SC_GUI,0x39};

U0 KeyName()
{
  I64 i;
  for (i=0;i<8;i++)
    "%s\n",ScanCode2KeyName(scs[i]);
  for (i=0;i<128;i+=7)
    "%d %s\n",i,Char2KeyName(i);
  for (i=CH_SHIFT_ESC;i<128;i+=11)
    "%d %s\n",i,Char2KeyName(i,FALSE);
}

KeyName;
