I64 output_calls=0;

I64 OutputValue()
{
  output_calls++;
  return 'ab';
}

U8 *OutputFormat()
{
  output_calls++;
  return "[%d:%s]";
}

U0 OutputExpr()
{
  U8 *fmt="%d";
  output_calls=0;
  '' OutputValue;
  'A'+1;
  '\0' 'C';
  '' 'D'+1;
  'FG'>>8;
  '\n';
  "" OutputFormat,17,"ok";
  "\0ignored" fmt,29;
  "Z%s\n"+1,"tail";
  "" "[%d]\n",31;
  "Calls:%d\n",output_calls;
}

OutputExpr;
