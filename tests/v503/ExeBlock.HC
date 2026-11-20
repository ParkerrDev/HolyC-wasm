//An #exe block's statements run where it stands; a local of the block is
//a global of the task, as ExeCmdLine's are.
#exe {"exe %d\n",2+3;}
"main\n";
U0 Main()
{
  "m\n";
}
#exe {
  I64 ten=10;
  "two %d\n",ten;
}
Main;
"%d\n",ten;
