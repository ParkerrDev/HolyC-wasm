DefinePrint("FD_GREETING","Hello %d",3);
DefineLstLoad("ST_FD_LST","Zero\0One\0Two\0");

U0 FmtDefine()
{
  I64 i;
  "%S|\n","FD_GREETING";
  for (i=0;i<4;i++)
    "%Z|%Z|\n",i,"ST_FD_LST",i,"ST_RAINBOW_10";
  "%12Z|%-8Z|\n",9,"ST_RAINBOW_10",1,"ST_FD_LST";
}

FmtDefine;
