//V5.03 tests what RAX holds after a U0 call used as a condition, so only
//the line after the calls is the same on every machine. Its compiler warns
//of the U0 expression as it compiles G, which Silent keeps off StdOut.
U0 F()
{
}

Silent;
U0 G()
{
  if (F())
    ;
  while (F() && FALSE)
    ;
  "after\n";
}
Silent(OFF);

G;
