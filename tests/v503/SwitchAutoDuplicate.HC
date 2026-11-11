I64 Probe(I64 n)
{
  switch (n) {
    case 1...3:
      return 1;
    case:
      return 2;
    case 4:
      return 3;
  }
  return 0;
}

Probe(0);
