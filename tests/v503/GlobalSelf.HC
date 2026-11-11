I64 self_value=11,*self_old=&self_value;

I64 SelfAddr(I64 *ptr)
{
  return ptr==self_old;
}

I64 self_value=SelfAddr(&self_value);

"%d:%d:%d\n",self_value,self_value==1,self_old==&self_value;
