//Adam/Gr/SpriteEd.HC: SpriteTransform on each element type it changes.

I64 r[16];

CSprite *ElemNew(CSprite *head,I64 type)
{
  CSprite *tmpg=CAlloc(SpriteElemQuedBaseSize(type));
  tmpg->type=type;
  QueIns(tmpg,head->last);
  return tmpg;
}

U0 ElemsPrint(U8 *elems)
{
  I64 i,size=SpriteSize(elems);
  for (i=0;i<size;i++)
    "%02X",elems[i];
  '\n';
}

U0 SpriteXform()
{
  CSprite *head=CAlloc(sizeof(CSprite)),*tmpg;
  CDC *dc=DCNew(6,5);
  U8 *elems,*res;
  I32 *ptr;
  QueInit(head);
  tmpg=ElemNew(head,SPT_THICK);
  tmpg->t.thick=3;
  tmpg=ElemNew(head,SPT_LINE);
  tmpg->pp.x1=1;tmpg->pp.y1=2;tmpg->pp.x2=30;tmpg->pp.y2=-7;
  tmpg=ElemNew(head,SPT_PT);
  tmpg->p.x1=-5;tmpg->p.y1=9;
  tmpg=ElemNew(head,SPT_RECT);
  tmpg->pp.x1=2;tmpg->pp.y1=3;tmpg->pp.x2=20;tmpg->pp.y2=13;
  tmpg=ElemNew(head,SPT_CIRCLE);
  tmpg->pr.x1=10;tmpg->pr.y1=-4;tmpg->pr.radius=8;
  tmpg=ElemNew(head,SPT_ELLIPSE);
  tmpg->pwha.x1=-3;tmpg->pwha.y1=6;
  tmpg->pwha.width=12;tmpg->pwha.height=5;tmpg->pwha.angle=0.3;
  tmpg=CAlloc(SpriteElemQuedBaseSize(SPT_POLYLINE)+3*2*sizeof(I32));
  tmpg->type=SPT_POLYLINE;
  tmpg->nu.num=3;
  ptr=&tmpg->nu.u;
  ptr[0]=0;ptr[1]=0;ptr[2]=10;ptr[3]=5;ptr[4]=-4;ptr[5]=12;
  QueIns(tmpg,head->last);
  elems=SpriteQue2Sprite(head);
  ElemsPrint(elems);
  Mat4x4IdentEqu(r);
  Mat4x4RotZ(r,pi/6);
  Mat4x4Scale(r,1.5);
  res=SpriteTransform(elems,r);
  ElemsPrint(res);
  Free(res);
  dc->color=RED;
  GrRect(dc,1,1,3,2);
  dc->color=BLUE;
  GrPlot(dc,5,4);
  Free(elems);
  elems=DC2Sprite(dc);
  res=SpriteTransform(elems,r);
  ElemsPrint(res);
  Free(res);
  Free(elems);
  DCDel(dc);
  QueDel(head);
  Free(head);
}

SpriteXform;
