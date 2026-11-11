export const CONSOLE_SRC=String.raw`
U0 PutKey(I64 ch=0,I64 sc=0)
{
  if (Bt(&Fs->display_flags,DISPLAYf_SILENT)) return;
  if (sc&SCF_KEY_DESC) throw('KeyHost',TRUE);
  if (ch) __putc(ch);
}

U0 PutS(U8 *s)
{//Present formatted text through the host's DolDoc adapter.
  if (s && !Bt(&Fs->display_flags,DISPLAYf_SILENT)) __puts(s);
}
`;
