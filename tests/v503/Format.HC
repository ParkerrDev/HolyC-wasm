U64 FormatHash(U8 *s)
{
  U64 hash=0;
  while (*s) hash=hash*65599+*s++;
  return hash;
}

U0 Format(U8 *fmt,...)
{
  U8 buf[8192],*s=StrPrintJoin(NULL,fmt,argc,argv);
  StrPrintJoin(buf,fmt,argc,argv);
  "%016X %d %d\n",FormatHash(s),StrLen(s),StrCmp(s,buf);
  Free(s);
}

U8 *formats[18]={"%d","%u","%x","%X","%b","%B",
	"%08d","%20d","%3td","%,d","%020,d","%032,X",
	"%f","%8.2f","%12.5e","%12.5g","%12.3n","%12.3h?n"};
I64 nums[8]={0,1,-1,123456789,-123456789,I64_MIN,I64_MAX,
	0xFEDCBA9876543210};
F64 floats[8]={0.0,1.0,-1.0,0.125,-0.125,1234567.25,1e-20,1e20};

U0 FormatTest()
{
  U8 *s;
  I64 i,j,bits;
  F64 d;
  for (i=0;i<12;i++)
    for (j=0;j<8;j++) Format(formats[i],nums[j]);
  for (i=12;i<18;i++)
    for (j=0;j<8;j++) Format(formats[i],floats[j]);
  Seed(1234);
  for (i=0;i<64;i++) {
    bits=(RandI64&0x800FFFFFFFFFFFFF)|0x4250000000000000;
    d=bits(F64);
    Format("%18.5f %18.12e %18.12g %18.12n",d,d,d,d);
  }
  Format("%12f %12f",0x7FF0000000000000(F64),
	0xFFF0000000000000(F64));
  Format("[%s][%12s][%-12s][%3ts]","abc","abc","abc","abcdef");
  Format("[%s][%c][%C][%h3c]",NULL,'ab','cd','x');
  Format("[%*d][%*.*f][%z]",12,321,10,3,0.125,2,"aa\0bb\0cc\0");
  Format("%Q","a$$\t\n\r\"\\%\x01");
  Format("%/Q","a$$\t\n\r\"\\%\x01");
  Format("%q","a\\t\\n\\r\\\"\\\\\\x41$$");
  Format("[%a][%%][end]");
  s=MAlloc(3001);
  for (i=0;i<3000;i++) s[i]='a'+i%26;
  s[3000]=0;
  Format("%s %d",s,123456);
  Free(s);
  s=MStrPrint("%s %04d","owned",42);
  "%s\n",s;
  Free(s);
  s=StrNew(NULL);
  "%d %d\n",StrLen(s),MSize(s)>=1;
  Free(s);
  try Format("%d");
  catch {
    "%016X\n",Fs->except_ch;
    Fs->catch_except=TRUE;
  }
}

FormatTest;
