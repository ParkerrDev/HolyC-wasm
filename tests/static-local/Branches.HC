I64 st_branch_inits=0;

I64 StBranchInit()
{
  return ++st_branch_inits;
}

U0 StBranches()
{
  if (FALSE) {
    static I64 a=StBranchInit;
    if (a<0)
      "A\n";
  }
  while (FALSE) {
    static I64 b=StBranchInit;
    if (b<0)
      "B\n";
  }
}
"Branches:%d\n",st_branch_inits;
StBranches;
"After:%d\n",st_branch_inits;
