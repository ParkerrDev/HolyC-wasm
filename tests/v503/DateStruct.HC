//Kernel/KDate.HC: Date2Struct, DayOfWeek and the first and last days.

CDate dates[4]={0,0x12345678ABCD,0x2FEDCBA987654,-0x100000000};

U0 DateStruct()
{
  I64 i;
  CDateStruct ds;
  for (i=0;i<4;i++) {
    Date2Struct(&ds,dates[i]);
    "%d/%d/%d %d:%d:%d.%d dow%d\n",ds.mon,ds.day_of_mon,ds.year,
	  ds.hour,ds.min,ds.sec,ds.sec100,ds.day_of_week;
  }
  for (i=-800;i<=80000;i+=20123)
    "%d %d %d %d %d\n",DayOfWeek(i),FirstDayOfMon(i),LastDayOfMon(i),
	  FirstDayOfYear(i),LastDayOfYear(i);
  "%d\n",Struct2Date(&ds)==dates[3];
}

DateStruct;
