class Pair
{
  U8 tag;
  I64 x;
  U16 y;
};

Pair a;
U8 text[5]="abcd";
U8 *one="same",*two="same";

I64 init_cnt=0;

I64 Bump()
{
  return ++init_cnt;
}

U0 Memory()
{
  I64 nums[4],*p=nums,*q,value=Bump;
  "%d %d\n",value,init_cnt;
  a.tag=3;
  a.x=10;
  a.y=20;
  "%d %d %d %d\n",sizeof(Pair),a.tag,a.x,a.y;
  "%s %d\n",text,text[4];
  one[0]='X';
  "%s %s\n",one,two;
  p++;
  q=1+nums;
  "%d %d %d\n",p-nums,q-nums,p(I64)-(nums+0)(I64);
  p+=2;
  "%d\n",p-nums;
  p--;
  p-=1;
  "%d\n",p-nums;
}

Memory;
