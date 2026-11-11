U0 RecalcRejectRun()
{
  I64 i,held;
  for (i=0;i<=46;i++)
    for (held=0;held<2;held++) RecalcReject(i,held);
  "RecalcReject:94\n";
}

Raw(OFF);
RecalcRejectRun;
