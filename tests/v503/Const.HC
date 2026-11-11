I64 a[1 && 1],b[0<1<2],c[0x100(U8)];

U0 Const()
{
  I64 n=-1;
  "%d %d %d\n",sizeof(a),sizeof(b),sizeof(c);
  switch (n) {
    case 1<<63>>63:
      "match\n";
      break;
    default:
      "wrong\n";
  }
}

Const;
