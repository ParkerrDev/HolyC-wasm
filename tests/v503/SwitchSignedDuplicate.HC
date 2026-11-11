I64 Probe(I64 n)
{
  switch (n) {
    case 0xFFFFFFFFFFFFFFFF:
      return 1;
    case -1:
      return 2;
  }
  return 0;
}

Probe(0);
