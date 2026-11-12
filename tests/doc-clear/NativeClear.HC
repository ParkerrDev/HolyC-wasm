public U0 DocClear(CDoc *doc=NULL,Bool clear_holds=FALSE)
{//Clear all doc entries, except +H, hold entries.
  Bool unlock;
  if (!doc && !(doc=DocPut))
    return;
  unlock=DocLock(doc);
  DocBottom(doc);
  if (clear_holds)
    DocPrint(doc,"$$CL+H$$");
  else
    DocPrint(doc,"$$CL$$");
  DocRecalc(doc);
  if (unlock)
    DocUnlock(doc);
}
