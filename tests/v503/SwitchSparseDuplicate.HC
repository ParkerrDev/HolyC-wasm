I64 Probe(I64 n)
{
  switch (n) {
    case 0:
      return 1;
    case 4096:
      return 2;
    case 0:
      return 3;
  }
  return 0;
}

Probe(0);
