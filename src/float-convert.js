//A product is rounded to x87's 64-bit significand before native FISTTP.
export const FLOAT_MUL_I64="#mul-f64-i64";
export const FLOAT_CONVERT_SRC=String.raw`
I64 F64MulToI64(F64 left,F64 right)
{
  U64 a=left(U64),b=right(U64),negative=(a^b)>>63,
	lo,hi,mid,prev,mant,tail,half,res;
  I64 ea=a>>52&0x7FF,eb=b>>52&0x7FF,h,shift,exponent;
  if (ea==0x7FF || eb==0x7FF) return 0x8000000000000000;
  a&=0x000FFFFFFFFFFFFF;
  b&=0x000FFFFFFFFFFFFF;
  if (ea) a|=0x0010000000000000;
  else ea=1;
  if (eb) b|=0x0010000000000000;
  else eb=1;
  if (!a || !b) return 0;
  lo=(a&0xFFFFFFFF)*(b&0xFFFFFFFF);
  mid=a>>32*(b&0xFFFFFFFF)+(a&0xFFFFFFFF)*b>>32;
  hi=a>>32*b>>32;
  prev=lo;
  lo+=mid<<32;
  hi+=mid>>32+(lo<prev);
  if (hi) h=127-__clz(hi);
  else h=63-__clz(lo);
  if (h<=63)
    mant=lo<<(63-h);
  else {
    shift=h-63;
    mant=hi<<(64-shift)|lo>>shift;
    tail=lo&(1<<shift-1);
    half=1<<(shift-1);
    if (tail>half || tail==half && mant&1) {
      mant++;
      if (!mant) {
	mant=0x8000000000000000;
	h++;
      }
    }
  }
  exponent=ea+eb-2150+h;
  if (exponent<0) return 0;
  if (exponent>=63) return 0x8000000000000000;
  res=mant>>(63-exponent);
  if (negative) return -res;
  return res;
}
`;
