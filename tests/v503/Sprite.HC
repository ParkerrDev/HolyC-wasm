U8 *SpriteData(I64 type)
{
  U8 *res=CAlloc(4096),*ptr;
  CSprite *elem=res-offset(CSprite.start);
  CD3I32 *p;
  CMeshTri *tri;
  I64 i;
  elem->type=type;
  elem->p.x1=8;elem->p.y1=7;
  switch (type) {
    case SPT_COLOR: elem->c.color=RED;break;
    case SPT_DITHER_COLOR: elem->d.dither_color=GREEN<<8+YELLOW;break;
    case SPT_THICK: elem->t.thick=3;break;
    case SPT_PLANAR_SYMMETRY:
      elem->pp.x1=48;elem->pp.y1=0;
      elem->pp.x2=48;elem->pp.y2=72;
      break;
    case SPT_LINE:
    case SPT_ARROW:
    case SPT_RECT:
    case SPT_ROTATED_RECT:
      elem->pp.x2=43;elem->pp.y2=28;
      if (type==SPT_ROTATED_RECT) elem->ppa.angle=0.25;
      break;
    case SPT_CIRCLE: elem->pr.radius=11;break;
    case SPT_ELLIPSE:
    case SPT_POLYGON:
      elem->pwha.width=15;elem->pwha.height=9;
      elem->pwha.angle=0.25;
      if (type==SPT_POLYGON) elem->pwhas.sides=5;
      break;
    case SPT_POLYLINE:
      elem->nu.num=5;
      for (i=0;i<5;i++) {
	(&elem->nu.u)(I32 *)[i*2]=i*9;
	(&elem->nu.u)(I32 *)[i*2+1]=i%2*14;
      }
      break;
    case SPT_POLYPT:
      elem->npu.x=10;elem->npu.y=10;elem->npu.num=20;
      ptr=&elem->npu.u;
      for (i=0;i<8;i++) ptr[i]=i*73+19;
      break;
    case SPT_BSPLINE2:
    case SPT_BSPLINE3:
    case SPT_BSPLINE2_CLOSED:
    case SPT_BSPLINE3_CLOSED:
      elem->nu.num=6;
      p=&elem->nu.u;
      for (i=0;i<6;i++) {
	p[i].x=i*9;p[i].y=i%2*23;p[i].z=i%3;
      }
      break;
    case SPT_BITMAP:
      elem->pwhu.width=13;elem->pwhu.height=9;
      ptr=&elem->pwhu.u;
      for (i=0;i<144;i++) ptr[i]=i%17;
      break;
    case SPT_MESH:
    case SPT_SHIFTABLE_MESH:
      if (type==SPT_MESH) {
	elem->mu.vertex_cnt=4;elem->mu.tri_cnt=2;
	p=&elem->mu.u;
      } else {
	elem->pmu.x=5;elem->pmu.y=6;elem->pmu.z=2;
	elem->pmu.vertex_cnt=4;elem->pmu.tri_cnt=2;
	p=&elem->pmu.u;
      }
      p[0].x=5;p[0].y=4;p[0].z=1;
      p[1].x=36;p[1].y=7;p[1].z=5;
      p[2].x=28;p[2].y=39;p[2].z=3;
      p[3].x=8;p[3].y=31;p[3].z=7;
      tri=p+4;
      tri[0].color=RED;tri[1].color=GREEN;
      tri[0].nums[0]=0;tri[0].nums[1]=1;tri[0].nums[2]=2;
      tri[1].nums[0]=2;tri[1].nums[1]=3;tri[1].nums[2]=0;
      break;
    case SPT_TEXT:
    case SPT_TEXT_BOX:
    case SPT_TEXT_DIAMOND:
      StrCpy(elem->ps.st," Ab\n Cd ");
      break;
  }
  if (type<=SPT_SHIFT) {
    elem(U8 *)+=SpriteElemSize(elem);
    elem->type=SPT_LINE;
    elem->pp.x1=1;elem->pp.y1=1;
    elem->pp.x2=31;elem->pp.y2=21;
  }
  elem(U8 *)+=SpriteElemSize(elem);
  elem->type=SPT_END;
  return res;
}

U64 SpriteHash(U8 *ptr,I64 size)
{
  U64 res=0;
  while (size-->0) res=res*65599+*ptr++;
  return res;
}

U0 SpriteInit(CDC *dc,I32 *depth,I64 k)
{
  dc->depth_buf=depth;
  DCDepthBufRst(dc);
  DCRst(dc);
  DCFill(dc,BLUE);
  dc->flags=DCF_RECORD_EXTENTS|DCF_LOCATE_NEAREST;
  dc->cur_x=18;dc->cur_y=13;dc->nearest_dist=I64_MAX;
  dc->min_x=dc->min_y=I64_MAX;
  dc->max_x=dc->max_y=I64_MIN;
  dc->color=YELLOW;
  dc->x=5;dc->y=7;dc->z=4;
  dc->thick=2;
  Mat4x4RotZ(dc->r,0.125);
  if (!(k&1)) dc->depth_buf=NULL;
  if (k&2) dc->flags|=DCF_DONT_DRAW;
  if (k&4) dc->flags|=DCF_TRANSFORMATION;
  if (k&8) {
    DCSymmetrySet(dc,48,0,48,72);
    dc->flags|=DCF_SYMMETRY;
  }
  if (k&16) dc->flags|=DCF_JUST_MIRROR;
}

U0 SpriteResult(CDC *dc)
{
  "%d %d %d %d %d %d %08X %d %d %d %016X %016X %016X %016X\n",
	dc->collision_cnt,dc->min_x,dc->max_x,dc->min_y,dc->max_y,
	dc->nearest_dist,dc->flags,dc->color,dc->thick,dc->x+dc->y+dc->z,
	SpriteHash(dc->body,dc->width_internal*dc->height),
	SpriteHash(dc->depth_buf,ToBool(dc->depth_buf)*
	  dc->width_internal*dc->height*sizeof(I32)),
	SpriteHash(&dc->sym,sizeof(CGrSym)),RandI64;
}

U0 Sprite()
{
  CDC *dc=DCNew(96,72),*copy;
  I32 *depth=DCDepthBufAlloc(dc);
  U8 *data,*bitmap;
  I64 type,k,a,b,c,d;
  Seed(73);
  for (type=1;type<SPT_TYPES_NUM;type++) {
    data=SpriteData(type);
    "%d %d %d %08X\n",type,SpriteSize(data),
	  SpriteElemQuedBaseSize(type),SpriteTypeMask(data);
    for (k=0;k<64;k++) {
      SpriteInit(dc,depth,k);
      Sprite3(dc,11,13,3,data,ToBool(k&32));
      SpriteResult(dc);
    }
    Free(data);
  }
  data=SpriteData(SPT_BITMAP);
  for (k=0;k<64;k++) {
    SpriteInit(dc,depth,k);
    switch (k%4) {
      case 0: Sprite3B(dc,11,13,3,data);break;
      case 1: Sprite3XB(dc,11,13,3,data,0.25);break;
      case 2: Sprite3YB(dc,11,13,3,data,0.25);break;
      case 3: Sprite3ZB(dc,11,13,3,data,0.25);break;
    }
    SpriteResult(dc);
  }
  SpriteExtents(data,&a,&b,&c,&d);
  "%d %d %d %d\n",a,b,c,d;
  copy=Sprite2DC(data);
  bitmap=DC2Sprite(copy);
  "%d %d %d %016X\n",copy->width,copy->height,SpriteSize(bitmap),
	SpriteHash(copy->body,copy->width_internal*copy->height);
  Free(bitmap);DCDel(copy);Free(data);
  dc->depth_buf=depth;
  DCDel(dc);
}

Sprite;
