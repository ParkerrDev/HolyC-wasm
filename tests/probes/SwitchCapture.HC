I64 capture_value=3;
capture_value=4;

I64 CapturedCase(I64 n)
{
  switch (n) {
    case capture_value:
      return 1;
    case 3:
      return 2;
    default:
      return 0;
  }
}

"%d:%d\n",CapturedCase(3),CapturedCase(4);
