class CEntry:CQue
{
  I64 num;
};

U0 QueDump(CQue *head)
{
  CEntry *tmpq=head->next;
  "[%d] ",QueCnt(head);
  while (tmpq!=head) {
    "%d ",tmpq->num;
    tmpq=tmpq->next;
  }
  "| ";
  tmpq=head->last;
  while (tmpq!=head) {
    "%d ",tmpq->num;
    tmpq=tmpq->last;
  }
  '\n';
}

U0 Queue()
{
  CEntry *entry[16];
  CQue head;
  I64 i;
  QueInit(&head);
  QueDump(&head);
  for (i=0;i<16;i++) {
    entry[i]=CAlloc(sizeof(CEntry));
    entry[i]->num=i;
    if (i&1)
      QueInsRev(entry[i],&head);
    else
      QueIns(entry[i],&head);
    QueDump(&head);
  }
  for (i=0;i<16;i+=3) {
    QueRem(entry[i]);
    QueDump(&head);
    QueInsRev(entry[i],head.next);
    QueDump(&head);
  }
  QueDel(&head,TRUE);
  QueDump(&head);
  QueInit(&head);
  for (i=0;i<16;i++) {
    entry[i]=CAlloc(sizeof(CEntry));
    entry[i]->num=i;
    QueIns(entry[i],head.last);
  }
  QueDump(&head);
  QueDel(&head);
  QueInit(&head);
  QueDump(&head);
}

Queue;
