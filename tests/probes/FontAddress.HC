U0 FontAddressChk()
{//Check exported font values before a user declaration shadows their names.
  I64 i;
  U64 hash=0xCBF29CE484222325;
  U8 *src;

  "%d:%d:%d:%d:%d:%d\n",
	&sys_font_std==sys_font_std,
	(&sys_font_std+1)(I64)-sys_font_std(I64),
	(&sys_font_cyrillic+1)(I64)-sys_font_cyrillic(I64),
	sys_font_std<-1,sys_font_std>-1,
	sys_font_std-sys_font_std-1>0;
  "prefix:%d:%d\n",++sys_font_std-sys_font_std,
	--sys_font_cyrillic-sys_font_cyrillic;
  src=sys_font_std;
  for (i=0;i<2048;i++) {
    hash=hash^src[i];
    hash=hash*0x100000001B3;
  }
  src=sys_font_cyrillic;
  for (i=0;i<2048;i++) {
    hash=hash^src[i];
    hash=hash*0x100000001B3;
  }
  "%016X:%016X:%016X\n",hash,
	sys_font_std(U64 *)['A'],sys_font_cyrillic(U64 *)['A'];
}

U64 FontDefault(U64 *font=sys_font_std)
{
  return font['A'];
}

U0 FontLocalChk()
{//A local name has its own storage after its declaration.
  I64 before=sys_font_std(U64 *)['A'];
  U8 sys_font_std[3];

  sys_font_std[0]='A';
  sys_font_std[1]='B';
  sys_font_std[2]=0;
  "%016X:%s:%d\n",before,sys_font_std,sizeof(sys_font_std);
}

U8 sys_font_std[3]="AB",sys_font_cyrillic[3]="CD";

FontAddressChk;
FontLocalChk;
"default:%016X\n",FontDefault;
"%s:%s:%d:%d\n",sys_font_std,sys_font_cyrillic,
	sizeof(sys_font_std),sizeof(sys_font_cyrillic);
