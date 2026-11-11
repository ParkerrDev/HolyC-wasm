class RegName
{
  I64 reg,noreg;
};

U64 reg[16],rfl=3;

U0 RegisterName()
{
  RegName tmp;
  tmp.reg=17;tmp.noreg=23;
  reg[2]=29;
  "%d %d %d %d %d\n",sizeof(RegName),tmp.reg,tmp.noreg,reg[2],rfl;
}

RegisterName;
