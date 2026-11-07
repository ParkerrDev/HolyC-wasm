//goto to labels before and after it, into and out of loops,
//out of a switch, into a case, inside a try and back over a
//declaration, whose initializer runs again.

U0 Basic()
{
  I64 i=0,j;
b_loop:
  i++;
  if (i<5) goto b_loop;
  "%d\n",i;
  for (i=0;i<10;i++)
    for (j=0;j<10;j++)
      if (i*j==12) goto b_found;
b_found:
  "%d %d\n",i,j;
  switch (i) {
    case 2:
      "two\n";
      goto b_sw;
    case 3:
      "three\n";
  }
b_sw:
  "sw\n";
  i=0;
  goto b_in;
  while (i<3) {
    "w%d ",i;
b_in:
    i++;
  }
  "\n%d\n",i;
}

U0 Jumps(I64 n)
{
  I64 i=0;
  if (n==1) goto j_one;
  if (n==2) {
j_two:
    "two%d ",i;
    i++;
    if (i<2) goto j_two;
  }
  "x ";
  goto j_end;
j_one:
  "one ";
  do {
    i++;
    if (i==3) goto j_end;
  } while (TRUE);
j_end:
  "end%d\n",i;
}

U0 IfJump(I64 n)
{
  if (n) {
    "then ";
    goto ij_else;
  } else {
ij_else:
    "else ";
  }
  '\n';
}

U0 LoopBreak()
{
  I64 i;
  for (i=0;i<10;i++) {
    if (i==2) goto lb_skip;
    "%d ",i;
lb_skip:
    if (i==4) break;
  }
  "end %d\n",i;
}

U0 DoLabel()
{
  I64 i=0;
  do {
    i++;
    if (i&1) goto dl_odd;
    "e%d ",i;
dl_odd:
  } while (i<5);
  '\n';
}

U0 SwLabel(I64 n)
{
  switch (n) {
    case 0:
      "zero ";
      goto sl_two;
    case 1:
      "one ";
      break;
    case 2:
sl_two:
      "two ";
  }
  '\n';
}

U0 TryLabel()
{
  I64 i=0;
  try {
    while (TRUE)
      switch (i++) {
	case 0:
	  "zero ";
	  break;
	case 1:
	  "one ";
	  break;
	case 2:
	  goto tl_done;
      }
tl_done:
    "done%d ",i;
    if (i==3) goto tl_end;
    "skipped ";
tl_end:
  } catch
    "caught ";
  '\n';
}

I64 Double(I64 n)
{
d_top:
  if (n>10) return n;
  n*=2;
  goto d_top;
}

U0 Again()
{
  I64 i=0;
a_again:
  I64 j=i*10;
  "%d ",j;
  if (++i<3) goto a_again;
  '\n';
}

Basic;
Jumps(0);
Jumps(1);
Jumps(2);
IfJump(1);
IfJump(0);
LoopBreak;
DoLabel;
SwLabel(0);
SwLabel(1);
SwLabel(2);
SwLabel(3);
TryLabel;
"%d\n",Double(3);
Again;
