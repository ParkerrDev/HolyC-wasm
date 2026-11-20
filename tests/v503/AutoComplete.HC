//V5.03 Adam/AutoComplete: the word scan, the hash counts, the fill-in order
//and the binary search of a word list, on words no dictionary holds. Boot's
//ACInit scans this file too, so hits print as counts added here.

U0 ACWordLstAdd(U8 **_ptr,U8 *w,I64 blk)
{
  U8 *ptr=*_ptr;
  *ptr++=ACD_WORD_CHAR;
  StrCpy(ptr,w);
  ptr+=StrLen(w)+1;
  *ptr(U16 *)=blk;
  *_ptr=ptr+2;
}

U0 ACWordPtPrint(U8 *st)
{
  U8 *r=ACDWordPtAt(st);
  if (*r==ACD_WORD_CHAR)
    "%s:%d %s\n",st,r-acd.word_lst,r+1;
  else
    "%s:%d\n",st,r-acd.word_lst;
}

I64 ACHits(I64 i)
{//Hits of word i, or 0 when it is not in the table.
  U8 buf[16];
  CHashAC *tmpw;
  StrPrint(buf,"%czxv%d",'Q'+(i==3)*('q'-'Q'),i);
  if (tmpw=HashFind(buf,ac.hash_table,HTT_WORD))
    return tmpw->hits;
  return 0;
}

U0 ACChk()
{
  U8 buf[256],lst[256],*ptr=lst,*old_lst=acd.word_lst;
  I64 i,old_size=acd.word_lst_size,old_num=ac.num_fillins,
	old_hits[AC_FILLINS_NUM+1];
  CHashAC *tmpw,*old_matches[AC_FILLINS_NUM+1],w1,w2,w3,w4;
  "%d %d %d\n",ACSkipCrap("abc ;; ",7),ACSkipCrap("",0),ACSkipCrap("x",1);
  i=ACPriorWordInStr("Hello World",buf,11,256);
  "%d '%s'\n",i,buf;
  i=ACPriorWordInStr("Hello World",buf,5,256);
  "%d '%s'\n",i,buf;
  i=ACPriorWordInStr("a b ",buf,4,256);
  "%d '%s'\n",i,buf;
  i=ACPriorWordInStr("Abcdefgh",buf,8,4);
  "%d '%s'\n",i,buf;

  tmpw=ACHashAdd("Qzxv1");
  i=tmpw->hits;
  tmpw=ACHashAdd("Qzxv1");
  "%d %d\n",tmpw->hits-i,tmpw==HashFind("Qzxv1",ac.hash_table,HTT_WORD);
  for (i=2;i<=5;i++)
    old_hits[i]=ACHits(i);
  StrCpy(buf,"Qzxv2, Qzxv2;qzxv3 Qz.xv4");
  buf[21]=CH_CURSOR;
  ACSingleFileAdd(buf);
  for (i=2;i<=5;i++)
    "%d %d\n",i,ACHits(i)-old_hits[i];

  for (i=0;i<=AC_FILLINS_NUM;i++) {
    old_matches[i]=ac.fillin_matches[i];
    old_hits[i]=ac.fillin_hits[i];
  }
  ac.num_fillins=0;
  w1.hits=3;w2.hits=1;w3.hits=5;w4.hits=3;
  ACFillInAdd(&w1);
  ACFillInAdd(&w2);
  ACFillInAdd(&w3);
  ACFillInAdd(&w4);
  for (i=0;i<ac.num_fillins;i++)
    "%d%d ",ac.fillin_hits[i],
	  (ac.fillin_matches[i]==&w1)+2*(ac.fillin_matches[i]==&w4);
  '\n';
  ac.num_fillins=old_num;
  for (i=0;i<=AC_FILLINS_NUM;i++) {
    ac.fillin_matches[i]=old_matches[i];
    ac.fillin_hits[i]=old_hits[i];
  }

  ACWordLstAdd(&ptr,"Apple",1);
  ACWordLstAdd(&ptr,"banana",2);
  ACWordLstAdd(&ptr,"Cherry",3);
  ACWordLstAdd(&ptr,"Date",4);
  ACWordLstAdd(&ptr,"elder",5);
  *ptr++=0;
  acd.word_lst=lst;
  acd.word_lst_size=ptr-lst;
  ACWordPtPrint("Banana");
  ACWordPtPrint("Bz");
  ACWordPtPrint("A");
  ACWordPtPrint("date");
  ACWordPtPrint("Elder");
  ACWordPtPrint("Zed");
  "%d\n",ACDWordPtAt(NULL)==lst;
  acd.word_lst=old_lst;
  acd.word_lst_size=old_size;
}

ACChk;
