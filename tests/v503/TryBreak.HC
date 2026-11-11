U0 TryBreak()
{
  while (TRUE)
    try break;
    catch Fs->catch_except=TRUE;
}
