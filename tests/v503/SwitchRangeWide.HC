I64 Probe(I64 n)
{
  switch (n) {
    case 0:
      return 1;
    case 65535:
      return 2;
  }
  return 0;
}

Probe(0);
