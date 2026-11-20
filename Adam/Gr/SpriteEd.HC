//V5.03 Adam/Gr/SpriteEd.HC: the sprite queue and its transform. The editor
//itself is not here. polypt_map is V5.03 Adam/Gr/SpriteNew.HC's.

U8 polypt_map[9]={0,1,2,3,0,4,5,6,7};

Bool SpritePolyPtPlot(CSprite *head,I64 x,I64 y,I64)
{
  CSprite *tmpg=CAlloc(SpriteElemQuedBaseSize(SPT_PT));
  tmpg->type=SPT_PT;
  tmpg->p.x1=x;
  tmpg->p.y1=y;
  QueIns(tmpg,head->last);
  return TRUE;
}

CSprite *Sprite2SpriteQue(U8 *elems)
{
  I64 s;
  CSprite *res=CAlloc(sizeof(CSprite)),
	*tmpg=elems-offset(CSprite.start),*tmpg1;
  QueInit(res);
  while (tmpg->type&SPG_TYPE_MASK) {
    tmpg1=MAlloc(SpriteElemSize(tmpg)+offset(CSprite.start));
    s=SpriteElemSize(tmpg);
    MemCpy(&tmpg1->start,&tmpg->start,s);
    QueIns(tmpg1,res->last);
    tmpg(U8 *)+=s;
  }
  return res;
}

U8 *SpriteQue2Sprite(CSprite *head,I64 *_size=NULL)
{
  I64 i,size=sprite_elem_base_sizes[SPT_END];
  CSprite *tmpg=head->next;
  U8 *res,*dst;
  while (tmpg!=head) {
    size+=SpriteElemSize(tmpg);
    tmpg=tmpg->next;
  }
  if (_size) *_size=size;
  res=dst=MAlloc(size);
  tmpg=head->next;
  while (tmpg!=head) {
    i=SpriteElemSize(tmpg);
    MemCpy(dst,&tmpg->start,i);
    dst+=i;
    tmpg=tmpg->next;
  }
  *dst=SPT_END;
  return res;
}

CSprite *SpriteTransformCircle(I64 *r,CSprite *tmpg)
{
  I64 x,y,z;
  F64 m1,arg1,m2,radius=tmpg->pr.radius<<16;
  CSprite *tmpg1=CAlloc(SpriteElemQuedBaseSize(SPT_ELLIPSE));
  tmpg1->type=SPT_ELLIPSE;

  x=tmpg->pr.x1; y=tmpg->pr.y1; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  tmpg1->pwha.x1=x;
  tmpg1->pwha.y1=y;

  x=radius; y=0; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  R2P(&m1,&arg1,x,y);

  x=0; y=radius; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  m2=Sqrt(x*x+y*y);

  tmpg1->pwha.width =ToI64(m1)/0x10000;
  tmpg1->pwha.height=ToI64(m2)/0x10000;
  tmpg1->pwha.angle=-arg1;

  tmpg1->type|=tmpg->type&SPF_SEL;
  return tmpg1;
}

CSprite *SpriteTransformEllipse(I64 *r,CSprite *tmpg)
{
  I64 x,y,z;
  F64 m1,arg1,m2,arg2,s,c,x_radius=tmpg->pwha.width<<16,
	y_radius=tmpg->pwha.height<<16;
  CSprite *tmpg1=CAlloc(SpriteElemQuedBaseSize(tmpg->type&SPG_TYPE_MASK));
  tmpg1->type=tmpg->type;
  if (tmpg->type&SPG_TYPE_MASK==SPT_POLYGON)
    tmpg1->pwhas.sides=tmpg->pwhas.sides;

  x=tmpg->pwha.x1; y=tmpg->pwha.y1; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  tmpg1->pwha.x1=x;
  tmpg1->pwha.y1=y;

  c=Cos(-tmpg->pwha.angle);
  s=Sin(-tmpg->pwha.angle);

  x=x_radius*c;
  y=x_radius*s;
  z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  R2P(&m1,&arg1,x,y);

  x=-y_radius*s;
  y=y_radius*c;
  z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  R2P(&m2,&arg2,x,y);
  m2*=Abs(Sin(arg2-arg1));

  tmpg1->pwha.width=ToI64(m1)/0x10000;
  if (tmpg1->pwha.width<1) tmpg1->pwha.width=1;
  tmpg1->pwha.height=ToI64(m2)/0x10000;
  if (tmpg1->pwha.height<1) tmpg1->pwha.height=1;
  tmpg1->pwha.angle=-arg1;

  tmpg1->type|=tmpg->type&SPF_SEL;
  return tmpg1;
}

CSprite *SpriteTransformRect(I64 *r,CSprite *tmpg,F64 Θ)
{
  I64 x,y,z,w,h;
  F64 m1,arg1,m2,arg2,s,c,
	x_radius=(tmpg->pp.x2-tmpg->pp.x1)<<16,
	y_radius=(tmpg->pp.y2-tmpg->pp.y1)<<16;
  CSprite *tmpg1=CAlloc(SpriteElemQuedBaseSize(SPT_ROTATED_RECT));
  tmpg1->type=SPT_ROTATED_RECT;

  x=tmpg->pp.x1; y=tmpg->pp.y1; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  tmpg1->ppa.x1=x;
  tmpg1->ppa.y1=y;

  c=Cos(-Θ);
  s=Sin(-Θ);

  x=x_radius*c;
  y=x_radius*s;
  z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  R2P(&m1,&arg1,x,y);

  x=-y_radius*s;
  y=y_radius*c;
  z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  R2P(&m2,&arg2,x,y);
  m2*=Abs(Sin(arg2-arg1));

  w=ToI64(m1)/0x10000;
  if (w<1) w=1;
  h=ToI64(m2)/0x10000;
  if (h<1) h=1;
  tmpg1->ppa.x2=tmpg1->ppa.x1+w;
  tmpg1->ppa.y2=tmpg1->ppa.y1+h;
  tmpg1->ppa.angle=-arg1;

  tmpg1->type|=tmpg->type&SPF_SEL;
  return tmpg1;
}

CSprite *SpriteTransformBitMap(I64 *r,CSprite *tmpg)
{
  CDC *img,*dc3;
  U8 *elems;
  I64 x,y,z,minx,maxx,miny,maxy,minz,maxz;
  CSprite *tmpg1;

  x=tmpg->pwhu.x1; y=tmpg->pwhu.y1; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  minx=maxx=x;
  miny=maxy=y;
  minz=maxz=z;

  x=tmpg->pwhu.x1; y=tmpg->pwhu.y1+tmpg->pwhu.height; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  if (x<minx) minx=x;
  if (x>maxx) maxx=x;
  if (y<miny) miny=y;
  if (y>maxy) maxy=y;
  if (z<minz) minz=z;
  if (z>maxz) maxz=z;

  x=tmpg->pwhu.x1+tmpg->pwhu.width; y=tmpg->pwhu.y1; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  if (x<minx) minx=x;
  if (x>maxx) maxx=x;
  if (y<miny) miny=y;
  if (y>maxy) maxy=y;
  if (z<minz) minz=z;
  if (z>maxz) maxz=z;

  x=tmpg->pwhu.x1+tmpg->pwhu.width; y=tmpg->pwhu.y1+tmpg->pwhu.height; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  if (x<minx) minx=x;
  if (x>maxx) maxx=x;
  if (y<miny) miny=y;
  if (y>maxy) maxy=y;
  if (z<minz) minz=z;
  if (z>maxz) maxz=z;

  dc3=DCNew(maxx-minx+1,maxy-miny+1);

  img=CAlloc(sizeof(CDC));
  img->width=tmpg->pwhu.width;
  img->width_internal=(tmpg->pwhu.width+7)&~7;
  img->height=tmpg->pwhu.height;
  img->body=&tmpg->pwhu.u;
  img->dc_signature=DCS_SIGNATURE_VAL;

  dc3->color=TRANSPARENT;
  GrRect(dc3,0,0,maxx-minx+1,maxy-miny+1);

  Free(dc3->r);
  DCMat4x4Set(dc3,r);
  dc3->flags|=DCF_TRANSFORMATION;

  dc3->x=tmpg->pwhu.x1-minx;
  dc3->y=tmpg->pwhu.y1-miny;
  dc3->z=-minz;
  GrBlot3(dc3,0,0,0,img);
  Free(img);

  elems=DC2Sprite(dc3);
  dc3->r=NULL;
  DCDel(dc3);
  tmpg1=CAlloc(offset(CSprite.start)+MSize(elems));
  MemCpy(tmpg1(U8 *)+offset(CSprite.start),elems,MSize(elems));
  tmpg1->type=tmpg->type;

  x=tmpg->pwhu.x1; y=tmpg->pwhu.y1; z=0;
  Mat4x4MulXYZ(r,&x,&y,&z);
  tmpg1->pwhu.x1=x;
  tmpg1->pwhu.y1=y;

  return tmpg1;
}

U0 SpriteTransformQue(CSprite *head,I64 *r)
{
  I64 i,j,k,num,x,y,z,x1,y1,z1,x2,y2,z2,x3,y3,z3;
  I32 *ptr;
  CD3I32 *p;
  CSprite *tmpg=head->next,head2,*tmpg1,*tmpg2,*tmpg3;
  while (tmpg!=head) {
    if (Bt(&tmpg->type,SPf_SEL))
      switch (tmpg->type&SPG_TYPE_MASK) {
	case SPT_THICK:
	  tmpg->t.thick*=Sqrt(Mat4x4NormSqr65536(r))/65536;
	  if (tmpg->t.thick<0) tmpg->t.thick=0;
	  break;
	case SPT_PLANAR_SYMMETRY:
	case SPT_ARROW:
	case SPT_LINE:
	  x=tmpg->pp.x2; y=tmpg->pp.y2; z=0;
	  Mat4x4MulXYZ(r,&x,&y,&z);
	  tmpg->pp.x2=x;
	  tmpg->pp.y2=y;
	case SPT_PT:
	case SPT_FLOOD_FILL:
	case SPT_FLOOD_FILL_NOT:
	case SPT_TEXT:
	case SPT_TEXT_BOX:
	case SPT_TEXT_DIAMOND:
	  x=tmpg->p.x1; y=tmpg->p.y1; z=0;
	  Mat4x4MulXYZ(r,&x,&y,&z);
	  tmpg->p.x1=x;
	  tmpg->p.y1=y;
	  break;
	case SPT_BITMAP:
	  tmpg1=SpriteTransformBitMap(r,tmpg);
	  QueIns(tmpg1,tmpg);
	  QueRem(tmpg);
	  Free(tmpg);
	  tmpg=tmpg1;
	  break;
	case SPT_ROTATED_RECT:
	  tmpg1=SpriteTransformRect(r,tmpg,tmpg->ppa.angle);
	  QueIns(tmpg1,tmpg);
	  QueRem(tmpg);
	  Free(tmpg);
	  tmpg=tmpg1;
	  break;
	case SPT_RECT:
	  tmpg1=SpriteTransformRect(r,tmpg,0);
	  QueIns(tmpg1,tmpg);
	  QueRem(tmpg);
	  Free(tmpg);
	  tmpg=tmpg1;
	  break;
	case SPT_CIRCLE:
	  tmpg1=SpriteTransformCircle(r,tmpg);
	  QueIns(tmpg1,tmpg);
	  QueRem(tmpg);
	  Free(tmpg);
	  tmpg=tmpg1;
	  break;
	case SPT_ELLIPSE:
	case SPT_POLYGON:
	  tmpg1=SpriteTransformEllipse(r,tmpg);
	  QueIns(tmpg1,tmpg);
	  QueRem(tmpg);
	  Free(tmpg);
	  tmpg=tmpg1;
	  break;
	case SPT_POLYLINE:
	  ptr=&tmpg->nu.u;
	  for (i=0;i<tmpg->nu.num;i++) {
	    x=ptr[i<<1]; y=ptr[i<<1+1]; z=0;
	    Mat4x4MulXYZ(r,&x,&y,&z);
	    ptr[i<<1]=x;
	    ptr[i<<1+1]=y;
	  }
	  break;
	case SPT_POLYPT:
	  QueInit(&head2);
	  x=tmpg->npu.x; y=tmpg->npu.y; z=0;
	  x1=x; y1=y; z1=z;  //unrotated cur coordinates
	  Mat4x4MulXYZ(r,&x,&y,&z);
	  ptr=&tmpg->npu.u;
	  k=tmpg->npu.num*3;
	  x2=x; y2=y; z2=z;  //rotated start coordinates
	  x3=x; y3=y; z3=z;  //lag 1 rotated coordinates
	  for (i=0;i<k;i+=3) {
	    j=BFieldExtU32(ptr,i,3);
	    x1+=gr_x_offsets[j];
	    y1+=gr_y_offsets[j];
	    x=x1; y=y1; z=z1;
	    Mat4x4MulXYZ(r,&x,&y,&z);
	    Line(&head2,x3-x2,y3-y2,0,x-x2,y-y2,0,&SpritePolyPtPlot);
	    x3=x; y3=y; z3=z;
	  }

	  num=0;
	  tmpg1=head2.next;
	  x3=0; y3=0; z3=0;
	  while (tmpg1!=&head2) {
	    tmpg2=tmpg1->next;
	    if (tmpg1->p.x1==x3 && tmpg1->p.y1==y3) {
	      QueRem(tmpg1);
	      Free(tmpg1);
	    } else {
	      num++;
	      x3=tmpg1->p.x1;
	      y3=tmpg1->p.y1;
	    }
	    tmpg1=tmpg2;
	  }

	  tmpg3=CAlloc(SpriteElemQuedBaseSize(SPT_POLYPT)+(num*3+7)>>3);
	  tmpg3->npu.x=x2;
	  tmpg3->npu.y=y2;
	  ptr=&tmpg3->npu.u;
	  x3=0;y3=0; z3=0;
	  i=0;
	  tmpg1=head2.next;
	  while (tmpg1!=&head2) {
	    tmpg2=tmpg1->next;
	    BFieldOrU32(ptr,i,
		  polypt_map[SignI64(tmpg1->p.x1-x3)+1+
		  3*(SignI64(tmpg1->p.y1-y3)+1)]);
	    i+=3;
	    x3=tmpg1->p.x1;y3=tmpg1->p.y1;
	    QueRem(tmpg1);
	    Free(tmpg1);
	    tmpg1=tmpg2;
	  }
	  tmpg3->type=SPT_POLYPT|tmpg->type&SPF_SEL;
	  tmpg3->npu.num=num;
	  QueIns(tmpg3,tmpg);
	  QueRem(tmpg);
	  Free(tmpg);
	  tmpg=tmpg3;
	  break;
	case SPT_BSPLINE2:
	case SPT_BSPLINE3:
	case SPT_BSPLINE2_CLOSED:
	case SPT_BSPLINE3_CLOSED:
	  p=&tmpg->nu.u;
	  for (i=0;i<tmpg->nu.num;i++,p++) {
	    x=p->x; y=p->y; z=p->z;
	    Mat4x4MulXYZ(r,&x,&y,&z);
	    p->x=x;
	    p->y=y;
	    p->z=z;
	  }
	  break;
	case SPT_SHIFTABLE_MESH:
	  x=tmpg->pmu.x; y=tmpg->pmu.y; z=tmpg->pmu.z;
	  Mat4x4MulXYZ(r,&x,&y,&z);
	  tmpg->pmu.x=x;
	  tmpg->pmu.y=y;
	  tmpg->pmu.z=z;
	  p=&tmpg->pmu.u;
	  for (i=0;i<tmpg->pmu.vertex_cnt;i++,p++) {
	    x=p->x; y=p->y; z=p->z;
	    Mat4x4MulXYZ(r,&x,&y,&z);
	    p->x=x;
	    p->y=y;
	    p->z=z;
	  }
	  break;
	case SPT_MESH:
	  p=&tmpg->mu.u;
	  for (i=0;i<tmpg->mu.vertex_cnt;i++,p++) {
	    x=p->x; y=p->y; z=p->z;
	    Mat4x4MulXYZ(r,&x,&y,&z);
	    p->x=x;
	    p->y=y;
	    p->z=z;
	  }
	  break;
      }
    tmpg=tmpg->next;
  }
}

I64 SpriteQueSelAll(CSprite *head,Bool val=TRUE)
{
  I64 res=0;
  CSprite *tmpg=head->next;
  while (tmpg!=head) {
    BEqu(&tmpg->type,SPf_SEL,val);
    res++;
    tmpg=tmpg->next;
  }
  return res;
}

public U8 *SpriteTransform(U8 *elems,I64 *r)
{//Rotate Sprite using 4x4 matrix. Uses $LK,"fixed-point",A="FI:::/Demo/Lectures/FixedPoint.HC"$.
  U8 *res;
  CSprite *head=Sprite2SpriteQue(elems);
  SpriteQueSelAll(head);
  SpriteTransformQue(head,r);
  res=SpriteQue2Sprite(head);
  QueDel(head);
  Free(head);
  return res;
}
