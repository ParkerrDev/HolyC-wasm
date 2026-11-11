CQueVectU8 *qv_fault=NULL;
CCmpCtrl *rem_fault=NULL;
I64 rem_fault_pos=0;

I64 QvNewTrial()
{
  I64 error=0;
  CQueVectU8 *v=NULL;
  try v=QueVectU8New;
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  QueVectU8Del(v);
  return error;
}

U0 QvFaultSetup()
{
  qv_fault=QueVectU8New(-1);
}

I64 QvGrowTrial()
{
  I64 error=0,i,count=0;
  CQueVectU8 *tmpv;
  try QueVectU8Put(qv_fault,1499,0xAB);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  tmpv=qv_fault;
  do {
    if (tmpv->next->last!=tmpv || tmpv->last->next!=tmpv ||
	!(0<=tmpv->node_cnt<=QUE_VECT_U8_CNT))
      throw('QvLinks');
    count+=tmpv->node_cnt;
    tmpv=tmpv->next;
  } while (tmpv!=qv_fault);
  if (count!=qv_fault->total_cnt) throw('QvCount');
  if (error) {
    if (count!=512 && count!=1024) throw('QvFail');
  } else if (count!=1501 || QueVectU8Get(qv_fault,1499)!=0xAB)
    throw('QvValue');
  for (i=0;i<count;i++)
    if ((error || i<count-1) && QueVectU8Get(qv_fault,i-1))
      throw('QvGap');
  return error;
}

U0 QvFaultDone()
{
  QueVectU8Del(qv_fault);qv_fault=NULL;
}

U0 RemFaultSetup()
{
  I64 i;
  U8 *buf=CAlloc(2002);
  for (i=0;i<2001;i++) buf[i]='A';
  rem_fault=CmpCtrlNew(buf);
}

I64 RemReadTrial()
{
  I64 error=0,i,len=-3,
	start=rem_fault->cur_buf_ptr-rem_fault->lex_include_stk->buf;
  U8 *res=NULL;
  try res=LexFirstRem(rem_fault,"|",&len);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  rem_fault_pos=rem_fault->cur_buf_ptr-rem_fault->lex_include_stk->buf;
  if (error) {
    if (len!=-3 || res || !(start<=rem_fault_pos<=2001))
      throw('RemFail');
  } else if (len!=2001-start || StrLen(res)!=len || res[len])
    throw('RemValue');
  for (i=0;i<2001;i++)
    if (rem_fault->lex_include_stk->buf[i]!='A') throw('RemInput');
  if (rem_fault->lex_include_stk->buf[2001]) throw('RemInput');
  Free(res);
  return error;
}

U0 RemFaultDone()
{
  CmpCtrlDel(rem_fault);rem_fault=NULL;
}
