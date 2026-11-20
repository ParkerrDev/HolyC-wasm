//A class defined again shadows Kernel's: Kernel's code keeps its own CD3.
class CD3
{
  I64 tag;
  F64 x,y,z;
};

U0 ClassName(CD3 *,U8 *name=lastclass)
{
  "%s\n",name;
}

U0 ShadowChk()
{
  CD3 a;
  a.tag=7;
  D3Equ(&a.x,1,2,3);
  "%d %d %d\n",sizeof(CD3),offset(CD3.y),a.tag;
  "%d %d %d\n",ToI64(a.x),ToI64(a.y),ToI64(a.z);
  ClassName(&a);
}

ShadowChk;
