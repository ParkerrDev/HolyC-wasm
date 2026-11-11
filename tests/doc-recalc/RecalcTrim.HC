U0 RecalcTrim()
{
  CDoc *doc;
  CDocEntry *entry;
  I64 seed,i,flags;
  recalc_hash=14695981039346656037;
  recalc_cnt=0;
  for (seed=0;seed<8;seed++) {
    RecalcWindow(seed);
    doc=RecalcNew;
    doc->max_entries=seed%4;
    for (i=0;i<1030+seed*30;i++) {
      flags=0;
      if (seed&1 && i<1000) flags|=DOCEF_HOLD;
      if (seed&2 && i%37==5) flags|=DOCEF_FILTER_SKIP;
      if (seed&4 && i%51==5) flags|=DOCEF_SKIP;
      entry=RecalcEntry(doc,DOCT_MARKER,,,flags);
      if (i==seed) doc->cur_entry=entry;
    }
    if (!DocRecalc(doc)) throw('Recalc');
    RecalcState(doc);
    RecalcDel(doc);
  }
  "RecalcTrim:%016X:%d\n",recalc_hash,recalc_cnt;
}

RecalcTrim;
