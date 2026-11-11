//Native document metadata and flag parsing; initialization belongs to the session.
export const DOC_INIT_TYPES_SRC=String.raw`
#define ATTRF_BLINK	0x10000000
#define ATTRF_INVERT	0x20000000
#define ATTRF_SEL	0x40000000
#define ATTRF_UNDERLINE	0x80000000

#define ATTRf_BLINK		28
#define ATTRf_INVERT		29
#define ATTRf_SEL		30
#define ATTRf_UNDERLINE		31

//CDocEntry.type flags upper bits
#define DOCET_BLINK		ATTRF_BLINK
#define DOCET_INVERT		ATTRF_INVERT
#define DOCET_SEL		ATTRF_SEL
#define DOCET_UNDERLINE		ATTRF_UNDERLINE
#define DOCG_BL_IV_UL		0xB0000000

#define DOCEt_BLINK		ATTRf_BLINK
#define DOCEt_INVERT		ATTRf_INVERT
#define DOCEt_SEL		ATTRf_SEL
#define DOCEt_UNDERLINE		ATTRf_UNDERLINE

//These are ident to Doc flags
#define DOCEF_HIGHLIGHT		0x4000000
#define DOCEF_WORD_WRAP		0x8000000
#define DOCEF_BLINK		ATTRF_BLINK
#define DOCEF_INVERT		ATTRF_INVERT
#define DOCEF_SEL		ATTRF_SEL
#define DOCEF_UNDERLINE		ATTRF_UNDERLINE
#define DOCEf_HIGHLIGHT		26
#define DOCEf_WORD_WRAP		27
#define DOCEf_BLINK		ATTRf_BLINK
#define DOCEf_INVERT		ATTRf_INVERT
#define DOCEf_SEL		ATTRf_SEL
#define DOCEf_UNDERLINE		ATTRf_UNDERLINE

//CDocEntry.de_flags.  These first 16 are arg=
#define DOCEf_TAG		0
#define DOCEf_LEN		1
#define DOCEf_AUX_STR		2
#define DOCEf_DEFINE		3
#define DOCEf_HTML_LINK		4
#define DOCEf_LEFT_EXP		5
#define DOCEf_LEFT_MACRO	6
#define DOCEf_RIGHT_EXP		7
#define DOCEf_RIGHT_MACRO	8
#define DOCEf_HAS_BIN		9
#define DOCEf_BIN_PTR_LINK	10
#define DOCEf_RAW_TYPE		11
#define DOCEf_SHIFTED_X		12
#define DOCEf_SHIFTED_Y		13
#define DOCEf_SCROLLING_X	14
#define DOCEf_USER_DATA		15

//CDocEntry.de_flags.  These are +/- flags
#define DOCEf_LEFT_CB		16
#define DOCEf_LEFT_IN_STR	17
#define DOCEf_RIGHT_CB		18
#define DOCEf_RIGHT_IN_STR	19
#define DOCEf_LEFT_X		20
#define DOCEf_CENTER_X		21
#define DOCEf_RIGHT_X		22
#define DOCEf_TOP_Y		23
#define DOCEf_CENTER_Y		24
#define DOCEf_BOTTOM_Y		25
//HL...UL
#define DOCEf_TAG_CB		32
#define DOCEf_PAGE_REL_Y	33
#define DOCEf_MARGIN_REL_X	34
#define DOCEf_WIN_REL		35
#define DOCEf_LINK		36
#define DOCEf_ESC		37 //Send <ESC> (Exit and Save)
#define DOCEf_QUIT		38 //Send <SHIFT-ESC> (Abort)
#define DOCEf_FROM_START	39
#define DOCEf_HAS_BORDER	40
#define DOCEf_SOLID_BORDER	41
#define DOCEf_BORDER_PLOT	42
#define DOCEf_CHECKED_COLLAPSED 43 //Checked or Collapsed
#define DOCEf_CHECK_COLLAPSABLE 44
#define DOCEf_REFRESH_DATA	45
#define DOCEf_UPDATE_DATA	46
#define DOCEf_DEREF_DATA	47
#define DOCEf_REMALLOC_DATA	48
#define DOCEf_HAS_TERMINATOR	49
#define DOCEf_ZERO_BASED	50
#define DOCEf_HOLD		51
#define DOCEf_TREE		52
#define DOCEf_LST		53
#define DOCEf_SKIP		54
#define DOCEf_POPUP		55
#define DOCEf_SKIP_IN_FORM	56
#define DOCEf_FILTER_SKIP	57
#define DOCEf_NO_CLICK_ON	58
#define DOCEf_DONT_DRAW		59 //only works on sprites
#define DOCEf_DFT_LEN		60
#define DOCEf_DFT_RAW_TYPE	61
#define DOCEf_FLAGS_NUM		62

//Hash Types
#define DHT_DOC_CMD	1
#define DHT_DOC_FLAG	2
#define DHT_COLOR	4

public class CDolDocGlbls
{
  CHashTable *hash;
  I64	dft_de_flags		[DOCT_TYPES_NUM],
	type_flags_nontag_invis [(DOCT_TYPES_NUM+63)/64],
	type_flags_form		[(DOCT_TYPES_NUM+63)/64],
	type_flags_data		[(DOCT_TYPES_NUM+63)/64],
	type_flags_chk_dup	[(DOCT_TYPES_NUM+63)/64],
	clean_scan_codes	[4];
  I32	dft_type_flags		[DOCT_TYPES_NUM];
} doldoc;
`;

export const DOC_INIT_SRC=String.raw`
I64 DocHostFlagSingle(CCmpCtrl *cc,I64 *_de_flags,U32 *_type,Bool turn_on,
	CHashTable *table)
{
  I64 res=-1;
  CHashGeneric *tmph;
  if (cc->token==TK_IDENT &&
	(tmph=HashFind(cc->cur_str,table,DHT_DOC_FLAG))) {
    res=tmph->user_data0;
    if (res<64) {
      BEqu(_de_flags,res,turn_on);
      switch (res) {
	case DOCEf_BLINK:
	case DOCEf_INVERT:
	case DOCEf_UNDERLINE:
	case DOCEf_SEL:
	  BEqu(_type,res,turn_on);
	  break;
      }
    }
    Lex(cc);	//skip flag
  }
  return res;
}

I64 DocHostFlags(CCmpCtrl *cc,I64 *_de_flags,U32 *_type,
	CHashTable *table)
{
  I64 res=-1;
  Bool turn_on;
  while (TRUE) {
    if (cc->token=='+')
      turn_on=TRUE;
    else if (cc->token=='-')
      turn_on=FALSE;
    else
      break;
    Lex(cc);
    res=DocHostFlagSingle(cc,_de_flags,_type,turn_on,table);
  }
  return res;
}

I64 PrsDocFlagSingle(CCmpCtrl *cc,I64 *_de_flags,U32 *_type,Bool turn_on)
{
  return DocHostFlagSingle(cc,_de_flags,_type,turn_on,doldoc.hash);
}

I64 PrsDocFlags(CCmpCtrl *cc,I64 *_de_flags,U32 *_type)
{
  return DocHostFlags(cc,_de_flags,_type,doldoc.hash);
}

U0 DocHostTableDel(CHashTable *table)
{//Document type bits do not describe kernel hash record ownership.
  I64 i;
  CHash *tmph,*next;
  if (!table) return;
  for (i=0;i<=table->mask;i++)
    for (tmph=table->body[i];tmph;tmph=next) {
      next=tmph->next;
      Free(tmph->str);
      Free(tmph);
    }
  Free(table->body);
  Free(table);
}

U0 DocHostDefineDel(CHashDefineStr *tmph)
{
  U8 **idx;
  if (!tmph) return;
  idx=tmph->sub_idx;
  HashRemDel(tmph,Fs->hash_table);
  Free(idx);
}

U0 DocHostBuild(CDolDocGlbls *res)
{//Stage native document metadata before publishing session state.
  CCmpCtrl *cc=NULL;
  I64 i;
  CHashGeneric *tmph;
  CHashDefineStr *colors=NULL,*cmds=NULL,*flags=NULL,*links=NULL;
  CDolDocGlbls tmpdoc;
  MemSet(&tmpdoc,0,sizeof(CDolDocGlbls));
  try {
    colors=DefineLstLoad("ST_COLORS","BLACK\0BLUE\0GREEN\0CYAN\0"
	  "RED\0PURPLE\0BROWN\0LTGRAY\0DKGRAY\0LTBLUE\0LTGREEN\0"
	  "LTCYAN\0LTRED\0LTPURPLE\0YELLOW\0WHITE\0");
    cmds=DefineLstLoad("ST_DOC_CMDS",
	  "TX\0CR\0SR\0TB\0PB\0CU\0MK\0PT\0CL\0PL\0LM\0RM\0HD\0FO\0ID\0FG\0"
	  "BG\0FD\0BD\0WW\0HL\0BK\0IV\0UL\0SX\0SY\0CM\0AN\0LK\0BT\0"
	  "DA\0CB\0LS\0MA\0MU\0HX\0TR\0SP\0IB\0IS\0SO\0HC\0ER\0");
    flags=DefineLstLoad("ST_DOC_FLAGS",
	  "T\0LEN\0A\0D\0HTML\0LE\0LM\0RE\0RM\0BI\0BP\0RT\0SX\0SY\0SCX\0U\0"
	  "LC\0LIS\0RC\0RIS\0LX\0CX\0RX\0TY\0CY\0BY\0"
	  "HL\0WW\0BK\0IV\0SEL\0UL\0"
	  "TC\0PRY\0MRX\0WR\0L\0X\0Q\0FST\0B\0S\0BD\0C\0CA\0RD\0UD\0P\0M\0"
	  "TRM\0Z\0H\0TR\0LS\0SK\0PU\0SIF\0FS\0NC\0DD\0DL\0DRT\0");
    links=DefineLstLoad("ST_LINK_TYPES",
	  "FI\0FA\0FF\0FL\0MN\0PI\0PF\0PL\0BF\0DN\0HI\0AD\0AI\0AA\0AF\0AL\0");

    tmpdoc.hash=HashTableNew(512);
    HashDefineLstAdd("ST_DOC_CMDS",DHT_DOC_CMD,tmpdoc.hash);
    HashDefineLstAdd("ST_DOC_FLAGS",DHT_DOC_FLAG,tmpdoc.hash);
    HashDefineLstAdd("ST_COLORS",DHT_COLOR,tmpdoc.hash);

    cc=CmpCtrlNew("TX+T;DA+P+TRM+T+DL+DRT;CM+LE+RE;AN+T;LK+L+UL+T;MA+X+UL+T;"
	  "MU+X+UL+T;BT+X+B+T;CB+CA+P+T+DRT;LS+LS+P+T+DRT;"
	  "HX+P+Z;TR+TR+C+CA+UL+T;"
	  "SP+T;IB+T;IS+T;SO+T;HC+T;",CCF_DONT_FREE_BUF);
    cc->htc.hash_table_lst=NULL;
    Lex(cc);
    while (cc->token==TK_IDENT) {
      if (tmph=HashFind(cc->cur_str,tmpdoc.hash,DHT_DOC_CMD)) {
	i=tmph->user_data0;
	Lex(cc);
	DocHostFlags(cc,&tmpdoc.dft_de_flags[i],
		&tmpdoc.dft_type_flags[i],tmpdoc.hash);
      }
      if (cc->token==';')
	Lex(cc);
    }
    CmpCtrlDel(cc);
    cc=NULL;

    for (i=0;i<DOCT_TYPES_NUM;i++)
      tmpdoc.dft_de_flags[i]&=~DOCG_BL_IV_UL;

    tmpdoc.type_flags_form[0]=0;
    for (i=0;i<DOCT_TYPES_NUM;i++)
      if (Bt(&tmpdoc.dft_de_flags[i],DOCEf_TAG) &&
	  i!=DOCT_TEXT || i==DOCT_HEX_ED)
	Bts(tmpdoc.type_flags_form,i);

    //Don't forget $LK,"cmp_type_flags_src_code",A="MN:cmp_type_flags_src_code"$.
    tmpdoc.type_flags_nontag_invis[0]=
	  1<<DOCT_PMT|
	  1<<DOCT_PAGE_LEN|
	  1<<DOCT_LEFT_MARGIN|
	  1<<DOCT_RIGHT_MARGIN|
	  1<<DOCT_HEADER|
	  1<<DOCT_FOOTER|
	  1<<DOCT_INDENT|
	  1<<DOCT_FOREGROUND|
	  1<<DOCT_BACKGROUND|
	  1<<DOCT_DFT_FOREGROUND|
	  1<<DOCT_DFT_BACKGROUND|
	  1<<DOCT_WORD_WRAP|
	  1<<DOCT_HIGHLIGHT|
	  1<<DOCT_BLINK|
	  1<<DOCT_INVERT|
	  1<<DOCT_UNDERLINE|
	  1<<DOCT_SHIFTED_X|
	  1<<DOCT_SHIFTED_Y|
	  1<<DOCT_SPRITE;

    tmpdoc.type_flags_data[0]=1<<DOCT_DATA|1<<DOCT_HEX_ED|1<<DOCT_CHECK_BOX;

    tmpdoc.type_flags_chk_dup[0]=
	  1<<DOCT_LEFT_MARGIN|
	  1<<DOCT_RIGHT_MARGIN|
	  1<<DOCT_HEADER|
	  1<<DOCT_FOOTER|
	  1<<DOCT_FOREGROUND|
	  1<<DOCT_BACKGROUND|
	  1<<DOCT_DFT_FOREGROUND|
	  1<<DOCT_DFT_BACKGROUND|
	  1<<DOCT_WORD_WRAP|
	  1<<DOCT_HIGHLIGHT|
	  1<<DOCT_BLINK|
	  1<<DOCT_INVERT|
	  1<<DOCT_UNDERLINE|
	  1<<DOCT_SHIFTED_X|
	  1<<DOCT_SHIFTED_Y;

    Bts(tmpdoc.clean_scan_codes,SC_CURSOR_RIGHT);
    Bts(tmpdoc.clean_scan_codes,SC_CURSOR_LEFT);
    Bts(tmpdoc.clean_scan_codes,SC_CURSOR_UP);
    Bts(tmpdoc.clean_scan_codes,SC_CURSOR_DOWN);
    Bts(tmpdoc.clean_scan_codes,SC_PAGE_UP);
    Bts(tmpdoc.clean_scan_codes,SC_PAGE_DOWN);
    Bts(tmpdoc.clean_scan_codes,SC_ALT);
    Bts(tmpdoc.clean_scan_codes,SC_CTRL);
    Bts(tmpdoc.clean_scan_codes,SC_SHIFT);
    Bts(tmpdoc.clean_scan_codes,SC_CAPS);
    Bts(tmpdoc.clean_scan_codes,SC_NUM);
    Bts(tmpdoc.clean_scan_codes,SC_SCROLL);
    Bts(tmpdoc.clean_scan_codes,SC_HOME);
    Bts(tmpdoc.clean_scan_codes,SC_END);
    Bts(tmpdoc.clean_scan_codes,SC_GUI);
    Bts(tmpdoc.clean_scan_codes,SC_BACKSPACE); //Handled specially
    MemCpy(res,&tmpdoc,sizeof(CDolDocGlbls));
  } catch {
    CmpCtrlDel(cc);
    DocHostTableDel(tmpdoc.hash);
    DocHostDefineDel(links);
    DocHostDefineDel(flags);
    DocHostDefineDel(cmds);
    DocHostDefineDel(colors);
  }
}

U0 DocHostInit()
{
  DocHostBuild(&doldoc);
}
`;
