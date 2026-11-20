//Bttn ctrls: sizes, scrn coordinates, hit tests, clicks, drawing.
I32 bttn_colors[3]={BLUE,RED,GREEN+YELLOW<<16};
CCtrlBttnState bttn;

Bool InsideDiag(CCtrl *,I64 x,I64 y)
{
  return x>y;
}

U0 BttnChk()
{
  CCtrl *c1,*c2,*c3;
  CDC *dc=DCNew(96,32);
  I64 i,x,y,cnt=QueCnt(&Fs->next_ctrl),hash=0;
  c1=CtrlBttnNew(8,16,,,3,"Stop\0Go\0Wait\0",bttn_colors,&bttn);
  c2=CtrlBttnNew(100,16,40,20,1,"One\0",bttn_colors);
  "%d %d %d %d\n",c1->left,c1->right,c1->top,c1->bottom;
  "%d %d %d %d\n",c2->left,c2->right,c2->top,c2->bottom;
  "%d %d\n",QueCnt(&Fs->next_ctrl)-cnt,c2->state(CCtrlBttnState *)->flags;
  TaskDerivedValsUpdate;
  "%d %d\n",c1->scrn_left-Fs->pix_left-gr.pan_text_x,
	c1->scrn_bottom-Fs->pix_top-gr.pan_text_y;
  x=c1->scrn_left;
  y=c1->scrn_top;
  "%d%d%d%d\n",CtrlInside(c1,x,y),CtrlInside(c1,x-1,y),
	CtrlInside(c1,c1->scrn_right,c1->scrn_bottom),CtrlInside(c2,x,y);
  for (i=0;i<4;i++) {
    (*c1->left_click)(c1,0,0,TRUE);
    (*c1->left_click)(c1,0,0,FALSE);
    "%d",bttn.state;
  }
  '\n';
  bttn.state=2;
  DCFill(dc,WHITE);
  DrawCtrlBttn(dc,c1);
  for (i=0;i<dc->width_internal*dc->height;i++)
    hash=hash*31+dc->body[i];
  "%016X\n",hash;
  c1->flags&=~CTRLF_SHOW;
  "%d %d\n",CtrlInside(c1,x,y),CtrlFindUnique(Fs,CTRLT_GENERIC)==c1;
  c3=CAlloc(sizeof(CCtrl));
  c3->flags=CTRLF_SHOW;
  c3->inside_ctrl=&InsideDiag;
  QueIns(c3,Fs->last_ctrl);
  "%d%d\n",CtrlInside(c3,5,3),CtrlInside(c3,3,5);
  QueRem(c3);
  Free(c3);
  c1->flags|=CTRLF_SHOW; //CTRLF_SHOW is BTF_DONT_FREE: bttn is not freed.
  CtrlBttnDel(c1);
  CtrlBttnDel(c2);
  "%d\n",QueCnt(&Fs->next_ctrl)-cnt;
  DCDel(dc);
}

BttnChk;
