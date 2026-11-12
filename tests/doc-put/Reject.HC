I64 put_side=0;
U8 *put_reject[8]={"FG,1","DA","HX,8,8","TX,\"owned\",BP=\"name\"",
      "TX,\"owned\",RT=I64","LS-P,\"list\"",
      "FG,PutSide()","TX,\"owned\",LE=PutSide()"};

I64 PutSide()
{
  return ++put_side;
}

U0 PutReject()
{
  CDoc *doc;
  CDocEntry *entry;
  U8 *st,*copy,*except;
  I64 i,fmt,held,before,error,cnt=0;
  RecalcWindow(0);
  for (i=0;i<8;i++) for (fmt=0;fmt<2;fmt++) for (held=0;held<2;held++) {
    doc=RecalcNew;
    entry=RecalcEntry(doc,DOCT_TEXT,"before");
    doc->cur_entry=entry;doc->cur_col=2;
    if (held) DocLock(doc);
    recalc_hash=0xCBF29CE484222325;RecalcState(doc);before=recalc_hash;
    st=MStrPrint("prefix$$%s$$suffix",put_reject[i]);copy=StrNew(st);
    except=Fs->next_except;put_side=error=0;
    try {
      if (fmt) DocPrint(doc,"%s",st);
      else DocPutS(doc,st);
    } catch {
      error=Fs->except_ch;
      Fs->catch_except=TRUE;
    }
    recalc_hash=0xCBF29CE484222325;RecalcState(doc);
    if (error!='DocCaps' || put_side || Fs->next_except!=except ||
	  StrCmp(st,copy) || recalc_hash!=before) throw('PutCaps');
    if (held) DocUnlock(doc);
    Free(st);Free(copy);RecalcDel(doc);
    cnt++;
  }
  "PutReject:%d:0\n",cnt;
}

PutReject;
