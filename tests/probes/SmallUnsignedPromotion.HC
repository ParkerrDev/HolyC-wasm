class CSmallOp
{
  I32 value;
  U16 divisor;
};

U0 SmallUnsignedPromotion()
{
  CSmallOp arg;
  I64 divisor;
  arg.value=-23;
  arg.divisor=12;
  divisor=arg.divisor;
  "Direct:%d:%d\n",arg.value/arg.divisor,arg.value%arg.divisor;
  "Widened:%d:%d\n",arg.value/divisor,arg.value%divisor;
}

SmallUnsignedPromotion;
