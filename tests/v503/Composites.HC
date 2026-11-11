U64 CompositeHash(CDC *dc)
{
  I64 i;
  U64 res=0;
  for (i=0;i<dc->width_internal*dc->height;i++) {
    res=res*65599+dc->body[i];
    if (dc->depth_buf) res=res*65599+dc->depth_buf[i];
  }
  return res;
}

U0 CompositeInit(CDC *dc,I32 *depth,I64 k)
{
  dc->depth_buf=depth;
  DCDepthBufRst(dc);
  DCRst(dc);
  DCFill(dc,BLUE);
  dc->flags=DCF_RECORD_EXTENTS;
  dc->min_x=dc->min_y=I64_MAX;
  dc->max_x=dc->max_y=I64_MIN;
  dc->color=(k%4)<<8+YELLOW;
  dc->thick=k%4+1;
  if (!(k&1)) dc->depth_buf=NULL;
  if (k&2) dc->flags|=DCF_DONT_DRAW;
  if (k&4) {
    Mat4x4RotZ(dc->r,0.125);
    dc->x=5;dc->y=7;dc->z=4;
    dc->flags|=DCF_TRANSFORMATION;
  }
  if (k&8) {
    DCSymmetrySet(dc,48,0,48,72);
    dc->flags|=DCF_SYMMETRY;
  }
  if (k&16) dc->flags|=DCF_JUST_MIRROR;
}

U0 CompositeResult(CDC *dc,I64 res)
{
  "%d %d %d %d %d %d %08X %016X %016X\n",res,
	dc->collision_cnt,dc->min_x,dc->max_x,dc->min_y,dc->max_y,
	dc->flags,CompositeHash(dc),RandI64;
}

U0 CompositeLight(CDC *dc,CD3I32 *a,CD3I32 *b,CD3I32 *c,
	CColorROPU32 color)
{
  dc->color=(color+AbsI64(a->x+b->y+c->z))%16;
}

U0 Composites()
{
  CDC *dc=DCNew(96,72);
  I32 *depth=DCDepthBufAlloc(dc);
  CD3I32 points[5];
  CMeshTri tris[3];
  I64 k,i,x1,y1,x2,y2,res;
  U8 *str="  Ab\tCd \n eF \n ";
  Seed(73);
  for (k=0;k<256;k++) {
    CompositeInit(dc,depth,k);
    x1=RandU16%130-20;y1=RandU16%110-20;
    x2=RandU16%130-20;y2=RandU16%110-20;
    if (k%13==0) {x2=x1;y2=y1;}
    res=GrArrow3(dc,x1,y1,k%5,x2,y2,k%7,2.75,k%3+1,k%2);
    CompositeResult(dc,res);
  }
  for (k=0;k<64;k++) {
    CompositeInit(dc,depth,k);
    if (k&32) res=GrTextDiamond3(dc,48,34,3,str,k%4);
    else res=GrTextBox3(dc,8,9,3,str,k%4);
    CompositeResult(dc,res);
  }
  for (i=0;i<3;i++) {
    tris[i].color=i+RED;
    tris[i].nums[0]=i;
    tris[i].nums[1]=i+1;
    tris[i].nums[2]=(i+2)%5;
  }
  for (k=0;k<64;k++) {
    CompositeInit(dc,depth,k);
    for (i=0;i<5;i++) {
      points[i].x=RandU16%100-5;
      points[i].y=RandU16%80-5;
      points[i].z=RandU16%20;
    }
    if (k&32) dc->lighting=&CompositeLight;
    res=Gr3Mesh(dc,5,points,3,tris);
    CompositeResult(dc,res);
    "%08X\n",dc->color;
  }
  dc->depth_buf=depth;
  DCDel(dc);
}

Composites;
