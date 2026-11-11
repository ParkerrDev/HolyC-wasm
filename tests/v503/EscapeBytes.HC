U0 EscapeDump(U8 *st,I64 size)
{
  I64 i;
  for (i=0;i<size;i++) "%02X",st[i];
  '\n';
}

U0 EscapeBytes()
{
  EscapeDump("\a\b\f\v\q\8\9",15);
  EscapeDump("\012\123\777\08\x4G\xG\X41\x414",21);
  EscapeDump("\0\'\`\"\\\d\n\r\t",10);
  "%016X:%016X:%016X:%016X\n",'\a\b\f\v','\012',
	'\123','\xG';
  "%016X:%016X:%016X\n",'\`','\8\9','\x414';
}

EscapeBytes;
