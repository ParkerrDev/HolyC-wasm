//Each top-level statement runs before the next one compiles.
I64 a=3;
"before %d\n",a;
ExePutS("I64 late=5;F64 ratio=late/2.0;");
"late %d %5.2f\n",late,ratio;
late+=a;
"res %d\n",ExePutS("late*2;");
"res %5.2f\n",ExePutS("ratio*3;")(F64);
U0 Show()
{
  "show %d\n",late;
}
Show;
