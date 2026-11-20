//Kernel/StrScan.HC: Str2I64, Str2F64 and StrScan.

U0 StrScanNum()
{
  U8 *end,name[32],*name_ptr=name;
  I64 i,j;
  F64 d;
  "%d %d %d %d\n",Str2I64("1234"),Str2I64("-0x1F"),Str2I64("0b101"),
	Str2I64("777",8);
  "%d %d\n",Str2I64("z",36),Str2I64("  +42xyz",10,&end);
  "%s\n",end;
  "%0.6f %0.6f %0.6f\n",Str2F64("3.25"),Str2F64("-1.5e3"),Str2F64("2e-2");
  StrScan("12 -7 3.5 word","%d %d %n %s",&i,&j,&d,&name_ptr);
  "%d %d %0.6f %s\n",i,j,d,name;
}

StrScanNum;
