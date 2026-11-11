//Native byte queue-vector representation and ownership.
export const QUE_VECT_TYPES_SRC=String.raw`
#define QUE_VECT_U8_CNT		512
public class CQueVectU8
{
  CQueVectU8	*next,*last;
  I64	total_cnt,node_cnt,min_idx;
  U8	body[QUE_VECT_U8_CNT];
};
`;

export const QUE_VECT_SRC=String.raw`
CQueVectU8 *QueVectU8New(I64 min_idx=0)
{//The queue head holds the first block of bytes.
  CQueVectU8 *res=MAlloc(sizeof(CQueVectU8));
  QueInit(res);
  res->total_cnt=res->node_cnt=0;
  res->min_idx=min_idx;
  return res;
}

U0 QueVectU8Put(CQueVectU8 *v,I64 idx,U8 ch)
{//Extend with zero bytes; each new node belongs to the calling task.
  CQueVectU8 *tmpv;
  idx-=v->min_idx;
  if (idx<0) return;
  if (idx<v->total_cnt) {
    tmpv=v;
    do {
      idx-=tmpv->node_cnt;
      if (idx<0) {
	tmpv->body[idx+tmpv->node_cnt]=ch;
	return;
      }
      tmpv=tmpv->next;
    } while (tmpv!=v);
  } else
    idx-=v->total_cnt;

  while (TRUE) {
    tmpv=v->last;
    if (tmpv->node_cnt>=QUE_VECT_U8_CNT) {
      tmpv=MAlloc(sizeof(CQueVectU8));
      tmpv->node_cnt=0;
      QueIns(tmpv,v->last);
    }
    if (idx--) {
      tmpv->body[tmpv->node_cnt++]=0;
      v->total_cnt++;
    } else {
      tmpv->body[tmpv->node_cnt++]=ch;
      v->total_cnt++;
      break;
    }
  }
}

U0 QueVectU8Del(CQueVectU8 *v)
{//Free all linked blocks, including the head.
  if (v) {
    QueDel(v);
    Free(v);
  }
}

I64 QueVectU8Get(CQueVectU8 *v,I64 idx)
{//Missing or below-origin indices read as zero.
  CQueVectU8 *tmpv;
  idx-=v->min_idx;
  if (!(0<=idx<v->total_cnt)) return 0;
  tmpv=v;
  do {
    idx-=tmpv->node_cnt;
    if (idx<0)
      return tmpv->body[idx+tmpv->node_cnt];
    tmpv=tmpv->next;
  } while (tmpv!=v);
  return 0;
}
`;
