//Native clear command over the bounded document layout and output path.
export const DOC_CLEAR_SRC=String.raw`
U0 DocHostClearCheck(CDoc *doc)
{//A pending clear needs the repeated-layout bounds before moving the cursor.
  Bool plain;
  while (Bt(&doc->locked_flags,DOClf_LOCKED) && doc->owning_task!=Fs)
    Yield;
  plain=ToBool(doc->flags&(DOCF_PLAIN_TEXT|DOCF_PLAIN_TEXT_TABS));
  if (doc->doc_signature==DOC_SIGNATURE_VAL)
    DocHostRecalcCheck(doc,0,!plain,plain);
}

public U0 DocClear(CDoc *doc=NULL,Bool clear_holds=FALSE)
{//Clear entries through the normal CL command; preserve holds unless requested.
  Bool unlock,marker;
  if (!doc && !(doc=DocPut)) return;
  DocHostClearCheck(doc);
  marker=Bt(&doc->flags,DOCf_BREAK_UNLOCKED);
  unlock=DocLock(doc);
  try {
    DocHostClearCheck(doc);
    DocBottom(doc);
    if (clear_holds) DocPrint(doc,"$$CL+H$$");
    else DocPrint(doc,"$$CL$$");
    DocRecalc(doc);
  } catch {
    if (unlock) DocHostRecalcUnlock(doc,marker);
  }
  if (unlock) DocUnlock(doc);
}
`;
