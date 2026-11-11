U64 ImageHash(CDC *dc)
{
  I64 i;
  U64 res=0;
  for (i=0;i<dc->width_internal*dc->height;i++)
    res=res*65599+dc->body[i];
  return res;
}

CColorROPU32 colors[7]={RED,ROP_XOR+LTBLUE,ROP_MONO+GREEN,
      ROP_COLLISION,ROPF_DITHER+YELLOW<<16+BLUE,
      ROPF_DITHER+ROP_XOR+PURPLE<<16+CYAN,
      ROPF_PROBABILITY_DITHER+WHITE<<16+BLACK};

U0 Graphics()
{
  CDC *dc=DCNew(19,13),*alias,*img=DCNew(11,9),*null_dc;
  I64 i,j,k,x,y,w,h,res;
  U64 hash;
  "%d %d %d %d %d %d %d\n",sizeof(CDC),dc->width,
	dc->width_internal,dc->height,dc->color,dc->thick,dc->r_norm;
  hash=0;
  for (i=0;i<16;i++) hash=hash*65599+dc->r[i]+dc->palette[i];
  "%016X %d %d\n",hash,dc->dc_signature==DCS_SIGNATURE_VAL,
	dc->mem_task==Fs && dc->win_task==Fs;
  dc->color=RED;
  dc->x=17;
  dc->flags|=DCF_TRANSFORMATION|DCF_SYMMETRY|DCF_NO_TRANSPARENTS;
  alias=DCAlias(dc);
  "%d %d %d %d %d %d\n",alias!=dc,alias->body==dc->body,
	alias->r!=dc->r,alias->color,alias->x,alias->flags;
  alias->color=GREEN;
  GrPlot(alias,3,4);
  "%d %d\n",GrPeek(dc,3,4),dc->color;
  DCDel(alias);
  dc->flags=0;
  null_dc=DCNew(7,3,,TRUE);
  "%d %d %d\n",null_dc->width_internal,!null_dc->body,
	null_dc->flags&DCF_DONT_DRAW;
  DCDel(null_dc);

  for (k=0;k<7;k++) {
    Seed(8173);
    DCFill(dc,TRANSPARENT);
    dc->bkcolor=BLUE;
    dc->color=colors[k];
    dc->dither_probability_u16=27341;
    dc->collision_cnt=0;
    res=0;
    for (i=0;i<21;i++) {
      x=RandU16%31-7;y=RandU16%23-5;
      w=RandU16%29-3;h=RandU16%19-2;
      res+=GrRect(dc,x,y,w,h);
    }
    "%d %d %016X %016X\n",res,dc->collision_cnt,ImageHash(dc),RandU64;
  }

  for (i=0;i<img->width_internal*img->height;i++)
    img->body[i]=i%17;
  for (i=0;i<9;i++) img->body[i*img->width_internal+i]=TRANSPARENT;
  for (k=0;k<4;k++) {
    DCFill(dc,7);
    dc->color=k<<8+RED;
    dc->collision_cnt=0;
    dc->bkcolor=7;
    for (i=0;i<3;i++) {
      img->flags=0;
      GrBlot(dc,i*7-3,i*5-2,img);
      img->flags=DCF_NO_TRANSPARENTS;
      GrBlot(dc,13-i*6,9-i*4,img);
    }
    "%d %016X\n",dc->collision_cnt,ImageHash(dc);
  }

  DCClear(dc);
  dc->color=WHITE;
  dc->brush=img;
  img->flags=0;
  GrPlot(dc,4,2);
  dc->brush=NULL;
  "%016X\n",ImageHash(dc);
  for (k=0;k<3;k++) {
    Seed(51);
    DCClear(dc);
    dc->color=colors[k];
    res=0;
    for (i=0;i<23;i++) {
      x=RandU16%33-7;y=RandU16%23-5;
      w=RandU16%33-7;h=RandU16%23-5;
      res+=GrLine(dc,x,y,w,h,k+1,i%3);
    }
    "%d %016X\n",res,ImageHash(dc);
  }
  for (k=0;k<3;k++) {
    DCClear(dc);
    dc->color=colors[k];
    for (i=0;i<13;i++)
      GrCircle(dc,i+3,i-1,i,k+1,0.2,4.7);
    "%016X\n",ImageHash(dc);
  }
  DCClear(dc);
  dc->color=YELLOW;
  GrCircle(dc,9,6,5,-1);
  "%016X\n",ImageHash(dc);
  DCClear(dc);
  dc->color=ROPF_DITHER+YELLOW<<16+BLUE;
  for (i=0;i<256;i++) GrPutChar(dc,i%24-4,i%18-3,i);
  "%016X\n",ImageHash(dc);
  DCClear(dc);
  dc->color=RED;
  GrPutS(dc,-2,1,"A\tB\nC");
  "%016X\n",ImageHash(dc);

  DCExtentsInit(dc);
  dc->flags|=DCF_DONT_DRAW;
  res=GrRect(dc,-2,3,9,20);
  GrPlot(dc,18,1);
  "%d %d %d %d %d\n",res,dc->min_x,dc->max_x,dc->min_y,dc->max_y;
  dc->flags=0;
  DCDepthBufAlloc(dc);
  DCClear(dc);
  dc->color=RED;dc->db_z=7;GrPlot0(dc,3,2);
  dc->color=GREEN;dc->db_z=8;GrPlot0(dc,3,2);
  dc->color=BLUE;dc->db_z=-1;GrPlot0(dc,3,2);
  "%d %d\n",GrPeek(dc,3,2),dc->depth_buf[2*dc->width_internal+3];
  GrPlot(dc,3,2);
  "%d %d\n",GrPeek(dc,3,2),dc->depth_buf[2*dc->width_internal+3];
  DCDepthBufRst(dc);
  "%d\n",dc->depth_buf[2*dc->width_internal+3];
  j=DCColorChg(dc,BLUE,WHITE);
  DCMono(dc,WHITE,GREEN,RED);
  "%d %016X\n",j,ImageHash(dc);
  DCDel(img);
  DCDel(dc);
  DCDel(NULL);
}

Graphics;
