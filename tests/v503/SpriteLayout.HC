U0 SpriteLayout()
{
  CSprite sprite;
  MemSet(&sprite,0,sizeof(CSprite));
  "%d %d %d %d %d %d %d %d\n",sizeof(CSpriteBase),
	sizeof(CSpriteColor),sizeof(CSpriteDitherColor),sizeof(CSpriteT),
	sizeof(CSpritePt),sizeof(CSpritePtRad),sizeof(CSpritePtPt),
	sizeof(CSpritePtPtAng);
  "%d %d %d %d %d %d %d %d\n",sizeof(CSpritePtWH),
	sizeof(CSpritePtWHU8s),sizeof(CSpritePtWHAng),
	sizeof(CSpritePtWHAngSides),sizeof(CSpriteNumU8s),
	sizeof(CSpriteNumPtU8s),sizeof(CSpriteMeshU8s),
	sizeof(CSpritePtMeshU8s);
  "%d %d %d %d %d %d %d\n",sizeof(CSpritePtStr),sizeof(CSprite),
	offset(CSprite.start),offset(CSprite.type),offset(CSprite.ps.st),
	offset(CSprite.mu.u),offset(CSprite.pmu.u);
  "%d %d %d %d\n",sizeof(CMeshTri),sizeof(CQueMeshTri),
	offset(CQueMeshTri.start),offset(CMeshTri.nums);
  sprite.p.type=SPT_LINE;
  sprite.pp.x1=-7;sprite.pp.y1=8;
  sprite.pp.x2=9;sprite.pp.y2=-10;
  "%d %d %d %d %d %d\n",sprite.type,sprite.p.x1,sprite.p.y1,
	sprite.pp.x2,sprite.pp.y2,sprite.p.type;
}

SpriteLayout;
