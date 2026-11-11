I64 date_years[12]={-1000,0,1,4,1900,1970,2000,2024,2100,2400,
  4000,65535};

U0 FileDate()
{
  CDateStruct ds;
  CDate a,b,old_offset=local_time_offset,clock_offset=0x10000000;
  I64 i,j;
  "%d:%d\n",sizeof(CDateStruct),offset(CDateStruct.year);
  MemSet(&ds,0,sizeof(CDateStruct));
  for (i=0;i<12;i++) {
    ds.year=date_years[i];
    "%d:%d:",ds.year,YearStartDate(ds.year);
    for (j=1;j<=12;j++) {
      ds.mon=j;
      ds.day_of_mon=15;
      ds.hour=23;
      ds.min=59;
      ds.sec=59;
      ds.sec100=12;
      ds.sec10000=34;
      "%016X:",Struct2Date(&ds);
    }
    '\n';
  }
  local_time_offset=0;
  a=Now;
  local_time_offset=clock_offset;
  b=Now;
  local_time_offset=old_offset;
  "%d\n",0<=b+clock_offset-a<0x20000;
}

FileDate;
