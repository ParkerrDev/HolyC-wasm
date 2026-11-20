//V5.03 PrsVar.HC class_dol_offset: $$ in a class member is the size so far.
class CDol
{
  I64 a;
  U8 b[16-$$];
  I32 c;
  U8 d[$$];
};
"%d %d %d\n",sizeof(CDol),offset(CDol.c),offset(CDol.d);
