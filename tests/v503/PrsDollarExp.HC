//PrsDollarCmd's arguments are expressions (LexExpressionI64 and
//LexExpression), as V5.03 Adam/DolDoc/DocPlain.HC parses them.
#define PDE_WIDTH	12
DefineLstLoad("ST_PDE_LST","Zero\0One\0Two\0Three\0");

I64 pde_cnt=3;
U8 *pde_cmds[16]={
	"ID,2",
	"ID,-PDE_WIDTH/4",
	"FG,RED",
	"FG,LTRED-8+1",
	"BG,LTCYAN",
	"FG",
	"LM,pde_cnt*2",
	"HX,16,PDE_WIDTH>>1",
	"TR,\"Tree\"",
	"TR+C,\"Shut\"",
	"BT,\"OKAY\",LE=1",
	"MU,\"Two\",LE=(1<<4)+2,RE=-3",
	"CM+LX,1,-8+PDE_WIDTH",
	"DA,LEN=PDE_WIDTH,A=\"%d\"",
	"LS,\"Two\",D=\"ST_PDE_LST\"",
	"SX,3"};

U0 PrsDollarExp()
{
  CDoc *doc=DocNew;
  CDocEntry *doc_e;
  I64 i;
  for (i=0;i<16;i++) {
    doc_e=PrsDollarCmd(doc,pde_cmds[i]);
    "%s: %d %d %d %d %d %X",pde_cmds[i],doc_e->type_u8,
	  doc_e->left_exp,doc_e->right_exp,doc_e->len,doc_e->hex_ed_width,
	  doc_e->type>>16;
    if (doc_e->type_u8!=DOCT_DATA && doc_e->tag)
      " [%s]",doc_e->tag;
    if (doc_e->de_flags&DOCEF_CHECKED_COLLAPSED)
      " C";
    '\n';
    DocEntryDel(doc,doc_e);
  }
  DocDel(doc);
}

PrsDollarExp;
