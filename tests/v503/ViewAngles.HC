//A view angles ctrl: placement, snapping, clicks and the angles.
U0 AnglesChk()
{
  CCtrl *c=ViewAnglesNew;
  CViewAngles *s=c->state;
  I64 cnt=QueCnt(&Fs->next_ctrl);
  "%d %d %d %d\n",Fs->pix_width-c->left,c->right-c->left,
	Fs->pix_height-c->top,c->bottom-c->top;
  "%d\n",ViewAnglesNew==c;
  s->sx=5;
  s->sy=-3;
  s->sz=99;
  (*c->update_derived_vals)(c);
  "%d %d %d %8.5f %8.5f %8.5f\n",s->sx,s->sy,s->sz,s->ax,s->ay,s->az;
  (*c->left_click)(c,c->left+1,c->top+22+10,TRUE);
  (*c->left_click)(c,c->left+40,c->top+22+30,TRUE);
  (*c->left_click)(c,c->right,c->top+22+47,TRUE);
  "%d %d %d %8.5f\n",s->sx,s->sy,s->sz,s->ax;
  ViewAnglesDel;
  "%d %d\n",QueCnt(&Fs->next_ctrl)-cnt,
	CtrlFindUnique(Fs,CTRLT_VIEWING_ANGLES);
}

AnglesChk;
