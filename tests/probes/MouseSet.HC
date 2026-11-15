U0 MouseSetChk()
{
  I64 x,y,z,l,r,flags;
  x=ms.pos.x;y=ms.pos.y;z=ms.pos.z;l=ms.lb;r=ms.rb;
  flags=kbd.scan_code;
  MsSet(123,234,7,TRUE,FALSE);
  "%d %d %d %d %d %d %d\n",ms.pos.x,ms.pos.y,ms.pos.z,
	ms.lb,ms.rb,Bt(&kbd.scan_code,SCf_MS_L_DOWN),
	Bt(&kbd.scan_code,SCf_MS_R_DOWN);
  MsSet(-1,GR_HEIGHT,I64_MAX,2,-1);
  "%d %d %d %d %d\n",ms.pos.x,ms.pos.y,ms.pos.z,ms.lb,ms.rb;
  MsSet(,,,-1,TRUE);
  "%d %d %d %d %d\n",ms.pos.x,ms.pos.y,ms.pos.z,ms.lb,ms.rb;
  MsSet(0,0,-7,FALSE,FALSE);
  "%d %d %d %d %d\n",ms.pos.x,ms.pos.y,ms.pos.z,ms.lb,ms.rb;
  MsSet(x,y,z,l,r);
  kbd.scan_code=flags;
}
MouseSetChk;
