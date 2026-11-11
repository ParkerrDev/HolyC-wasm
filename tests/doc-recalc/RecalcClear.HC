U0 RecalcClear()
{
  CDoc *doc;
  CDocEntry *entry;
  I64 seed,i,flags;
  recalc_hash=14695981039346656037;
  recalc_cnt=0;
  for (seed=0;seed<64;seed++) {
    RecalcWindow(seed);
    doc=RecalcNew;
    for (i=0;i<12;i++) {
      flags=0;
      if (i%3==seed%3) flags|=DOCEF_HOLD;
      if (seed&1 && i%4==1) flags|=DOCEF_FILTER_SKIP;
      if (seed&2 && i%4==2) flags|=DOCEF_SKIP;
      entry=RecalcEntry(doc,DOCT_TEXT,"keep",,flags);
      if (i==seed%12) doc->cur_entry=entry;
      RecalcEntry(doc,DOCT_NEW_LINE);
      if (i==3 || i==8) {
	flags=0;
	if (seed&4 && i==3 || seed&8 && i==8) flags=DOCEF_HOLD;
	RecalcEntry(doc,DOCT_CLEAR,,,flags);
      }
    }
    if (!DocRecalc(doc)) throw('Recalc');
    RecalcState(doc);
    RecalcDel(doc);
  }
  "RecalcClear:%016X:%d\n",recalc_hash,recalc_cnt;
}

RecalcClear;
