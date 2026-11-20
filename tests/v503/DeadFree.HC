//V5.03: a dead task's heap is freed whole, and a Free into it has no effect.
U8 *p=NULL;
U0 Child(I64)
{
  p=CAlloc(64);
  while (TRUE) Yield;
}
CTask *t=Spawn(&Child,NULL,"Child",,Fs);
while (!p) Yield;
Kill(t);
try {
  Free(p);
  "freed\n";
} catch {
  "except %c\n",Fs->except_ch;
}
"done\n";
