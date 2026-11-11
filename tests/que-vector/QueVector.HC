U64 qv_hash=14695981039346656037;
I64 qv_cnt=0;
I64 qv_min[7]={-513,-1,0,513,1024,0x8000000000000000,
	0x7FFFFFFFFFFFFFF0};

U0 QvMix(I64 value)
{
  qv_hash=(qv_hash^value)*1099511628211;
  qv_cnt++;
}

U0 QvState(CQueVectU8 *v)
{
  I64 cnt=0,nodes=0;
  CQueVectU8 *tmpv=v;
  QvMix(v->min_idx);QvMix(v->total_cnt);
  do {
    QvMix(tmpv->node_cnt);
    QvMix(tmpv->last->next==tmpv && tmpv->next->last==tmpv);
    cnt+=tmpv->node_cnt;
    nodes++;
    tmpv=tmpv->next;
  } while (tmpv!=v);
  if (cnt!=v->total_cnt || nodes>8) throw('QvState');
}

U0 QueVector()
{
  I64 mode,i,j,idx;
  U64 seed;
  CQueVectU8 *v;
  qv_hash=14695981039346656037;qv_cnt=0;
  QvMix(sizeof(CQueVectU8));QvMix(offset(CQueVectU8.next));
  QvMix(offset(CQueVectU8.last));QvMix(offset(CQueVectU8.total_cnt));
  QvMix(offset(CQueVectU8.node_cnt));QvMix(offset(CQueVectU8.min_idx));
  QvMix(offset(CQueVectU8.body));QvMix(QUE_VECT_U8_CNT);
  v=QueVectU8New;
  QvState(v);QvMix(QueVectU8Get(v,0));QueVectU8Del(v);
  QueVectU8Del(NULL);
  for (mode=0;mode<7;mode++) {
    v=QueVectU8New(qv_min[mode]);seed=29;
    QvState(v);
    for (i=0;i<128;i++) {
      seed=seed*6364136223846793005+1;
      idx=qv_min[mode]+seed%1700-2;
      QueVectU8Put(v,idx,i*7+31);
      QvState(v);
      for (j=-3;j<1710;j++)
	QvMix(QueVectU8Get(v,qv_min[mode]+j));
    }
    QueVectU8Del(v);
  }
  "QueVector:%016X:%d\n",qv_hash,qv_cnt;
}

QueVector;
