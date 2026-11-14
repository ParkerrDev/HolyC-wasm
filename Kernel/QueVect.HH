
#define QUE_VECT_U8_CNT		512
public class CQueVectU8
{
  CQueVectU8	*next,*last;
  I64	total_cnt,node_cnt,min_idx;
  U8	body[QUE_VECT_U8_CNT];
};
