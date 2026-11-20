//Adam/Gr/GrSpritePlot.HC: DocSprite puts a sprite's bin into a document.
//The entry here is a TX with the bin number, by DocSprite's fmt.

U0 DocSpriteChk()
{
  CSprite *head=CAlloc(sizeof(CSprite)),*tmpg;
  CDoc *doc=DocNew;
  CDocEntry *doc_e;
  CDocBin *tmpb;
  U8 *elems;
  I64 i,size;
  QueInit(head);
  tmpg=CAlloc(SpriteElemQuedBaseSize(SPT_COLOR));
  tmpg->type=SPT_COLOR;
  tmpg->c.color=RED;
  QueIns(tmpg,head->last);
  tmpg=CAlloc(SpriteElemQuedBaseSize(SPT_PT));
  tmpg->type=SPT_PT;
  tmpg->p.x1=3;tmpg->p.y1=-2;
  QueIns(tmpg,head->last);
  elems=SpriteQue2Sprite(head,&size);
  "%d %d\n",size,doc->cur_bin_num;
  for (i=0;i<2;i++) {
    doc_e=DocSprite(doc,elems,"$$TX,\"bin %d\"$$");
    tmpb=doc_e->bin_data;
    "%d %s %d %d %d %d\n",doc_e->type_u8==DOCT_TEXT,doc_e->tag,
	  tmpb->num,tmpb->size,tmpb->use_cnt,doc->cur_bin_num;
    "%d %d %d\n",MemCmp(tmpb->data,elems,size),tmpb->data!=elems,
	  tmpb==doc->bin_head.last;
  }
  tmpb=doc->bin_head.next;
  while (tmpb!=&doc->bin_head) {
    "%d,",tmpb->num;
    tmpb=tmpb->next;
  }
  '\n';
  QueDel(head);
  Free(head);
  Free(elems);
  DocDel(doc);
}

DocSpriteChk;
