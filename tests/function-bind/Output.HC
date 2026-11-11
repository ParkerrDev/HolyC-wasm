I64 binding_print_calls=0,binding_char_calls=0;

U0 BindingReport()
{
  "\nOutput:%d:%d\n",binding_print_calls,binding_char_calls;
}

U0 BindingText()
{
  I64 Print=0;
  no_warn Print;
  "old";
}

U0 BindingChar()
{
  I64 PutChars=0;
  no_warn PutChars;
  'A';
}

U0 Print(U8 *,...)
{
  no_warn argc,argv;
  binding_print_calls++;
}

U0 PutChars(U64)
{
  binding_char_calls++;
}

BindingText;
BindingChar;
"ignored";
'B';
BindingReport;
