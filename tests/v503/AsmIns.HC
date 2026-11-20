//V5.03: an opcode in a fun is one asm instruction, as Adam's PUSHFD CLI POPFD.
I64 cnt=0;
U0 Bump()
{
  I64 i;
  PUSHFD
  CLI
  for (i=0;i<3;i++)
    cnt++;
  POPFD
  if (cnt>2) {
    PUSHFD
    CLI
    cnt*=10;
    POPFD
  }
  STI
}
Bump;
"%d\n",cnt;
