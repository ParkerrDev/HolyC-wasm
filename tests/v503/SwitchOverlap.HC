I64 Probe(I64 n)
{
  switch (n) {
    case 8...4:
      return 1;
    case 1...4:
      return 2;
  }
  return 0;
}

Probe(0);
