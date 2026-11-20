//V5.03 Kernel/KernelA.HH, its DolDoc part (lines 891-1409).
#help_index "DolDoc"
//See $LK,"TextBase Layer",A="HI:TextBase Layer"$.
#define ATTRF_BLINK	0x10000000
#define ATTRF_INVERT	0x20000000
#define ATTRF_SEL	0x40000000
#define ATTRF_UNDERLINE	0x80000000

#define ATTRf_BLINK		28
#define ATTRf_INVERT		29
#define ATTRf_SEL		30
#define ATTRf_UNDERLINE		31

//CDocEntry.type codes (Low 8 bits)
#define DOCT_TEXT		0
#define DOCT_NEW_LINE		1
#define DOCT_SOFT_NEW_LINE	2
#define DOCT_TAB		3
#define DOCT_PAGE_BREAK		4
#define DOCT_CURSOR		5
#define DOCT_MARKER		6
#define DOCT_PMT		7
#define DOCT_CLEAR		8
#define DOCT_PAGE_LEN		9
#define DOCT_LEFT_MARGIN	10
#define DOCT_RIGHT_MARGIN	11
#define DOCT_HEADER		12
#define DOCT_FOOTER		13
#define DOCT_INDENT		14
#define DOCT_FOREGROUND		15
#define DOCT_BACKGROUND		16
#define DOCT_DFT_FOREGROUND	17
#define DOCT_DFT_BACKGROUND	18
#define DOCT_WORD_WRAP		19
#define DOCT_HIGHLIGHT		20
#define DOCT_BLINK		21
#define DOCT_INVERT		22
#define DOCT_UNDERLINE		23
#define DOCT_SHIFTED_X		24
#define DOCT_SHIFTED_Y		25
#define DOCT_CURSOR_MOVEMENT	26
#define DOCT_ANCHOR		27
#define DOCT_LINK		28
#define DOCT_BTTN		29
#define DOCT_DATA		30
#define DOCT_CHECK_BOX		31
#define DOCT_LST		32
#define DOCT_MACRO		33
#define DOCT_MENU_VAL		34
#define DOCT_HEX_ED		35
#define DOCT_TREE		36
#define DOCT_SPRITE		37
#define DOCT_INS_BIN		38
#define DOCT_INS_BIN_SIZE	39
#define DOCT_SONG		40
#define DOCT_HTML_CODE		41
#define DOCT_ERROR		42

#define DOCT_TYPES_NUM		43

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

#define DOCG_DBL_BUF_FLAGS	(DOCF_OVERSTRIKE|DOCF_PLAIN_TEXT|\
		DOCF_PLAIN_TEXT_TABS|DOCF_SIZE_MIN|DOCF_NO_CURSOR|\
		DOCF_FORM|DOCF_DBL_DOLLARS|DOCF_DONT_SWAP_OUT|\
		DOCF_DO_FULL_REFRESH|DOCF_BORDER_DOC|DOCF_HIDE_CURSOR|\
		DOCF_DONT_HIGHLIGHT_CURSOR|DOCF_CARRIAGE_RETURN)

//CDocEntry.de_flags.  These first 16 are arg=
#define DOCEF_TAG		1
#define DOCEF_LEN		2
#define DOCEF_AUX_STR		4
#define DOCEF_DEFINE		8
#define DOCEF_HTML_LINK		0x10
#define DOCEF_LEFT_EXP		0x20
#define DOCEF_LEFT_MACRO	0x40
#define DOCEF_RIGHT_EXP		0x80
#define DOCEF_RIGHT_MACRO	0x100
#define DOCEF_HAS_BIN		0x200
#define DOCEF_BIN_PTR_LINK	0x400
#define DOCEF_RAW_TYPE		0x800
#define DOCEF_SHIFTED_X		0x1000
#define DOCEF_SHIFTED_Y		0x2000
#define DOCEF_SCROLLING_X	0x4000
#define DOCEF_USER_DATA		0x8000

//CDocEntry.de_flags.  These are +/- flags
#define DOCEF_LEFT_CB		0x10000
#define DOCEF_LEFT_IN_STR	0x20000
#define DOCEF_RIGHT_CB		0x40000
#define DOCEF_RIGHT_IN_STR	0x80000
#define DOCEF_LEFT_X		0x100000
#define DOCEF_CENTER_X		0x200000
#define DOCEF_RIGHT_X		0x400000
#define DOCEF_TOP_Y		0x800000
#define DOCEF_CENTER_Y		0x1000000
#define DOCEF_BOTTOM_Y		0x2000000
//HL...UL
#define DOCEF_TAG_CB		0x100000000
#define DOCEF_PAGE_REL_Y	0x200000000
#define DOCEF_MARGIN_REL_X	0x400000000
#define DOCEF_WIN_REL		0x800000000
#define DOCEF_LINK		0x1000000000
#define DOCEF_ESC		0x2000000000 //Send <ESC> (Exit and Save)
#define DOCEF_QUIT		0x4000000000 //Send <SHIFT-ESC> (Abort)
#define DOCEF_FROM_START	0x8000000000
#define DOCEF_HAS_BORDER	0x10000000000
#define DOCEF_SOLID_BORDER	0x20000000000
#define DOCEF_BORDER_PLOT	0x40000000000
#define DOCEF_CHECKED_COLLAPSED 0x80000000000 //Checked or Collapsed
#define DOCEF_CHECK_COLLAPSABLE 0x100000000000
#define DOCEF_REFRESH_DATA	0x200000000000
#define DOCEF_UPDATE_DATA	0x400000000000
//$LK,"DOCEF_DEREF_DATA",A="MN:DOCEF_DEREF_DATA"$ is confusing. $LK,"DocForm",A="MN:DocForm"$() makes doc_e->data point to members
//of class. For ints, it derefs doc_e->data as a ptr.  For strings, it doesn't.
#define DOCEF_DEREF_DATA	0x800000000000
#define DOCEF_REMALLOC_DATA	0x1000000000000
#define DOCEF_HAS_TERMINATOR	0x2000000000000
#define DOCEF_ZERO_BASED	0x4000000000000
#define DOCEF_HOLD		0x8000000000000
#define DOCEF_TREE		0x10000000000000
#define DOCEF_LST		0x20000000000000
#define DOCEF_SKIP		0x40000000000000
#define DOCEF_POPUP		0x80000000000000
#define DOCEF_SKIP_IN_FORM	0x100000000000000
#define DOCEF_FILTER_SKIP	0x200000000000000
#define DOCEF_NO_CLICK_ON	0x400000000000000
#define DOCEF_DONT_DRAW		0x800000000000000 //only works on sprites
#define DOCEF_DFT_LEN		0x1000000000000000
#define DOCEF_DFT_RAW_TYPE	0x2000000000000000

#define DOCEG_HAS_ALLOC		(DOCEF_TAG|DOCEF_AUX_STR|DOCEF_DEFINE|\
  DOCEF_HTML_LINK|DOCEF_LEFT_MACRO|DOCEF_RIGHT_MACRO|DOCEF_BIN_PTR_LINK|\
  DOCEF_REMALLOC_DATA)

#define DOCEG_HAS_ARG		((DOCEG_HAS_ALLOC&~DOCEF_REMALLOC_DATA)|\
  DOCEF_LEN|DOCEF_LEFT_EXP|DOCEF_RIGHT_EXP|DOCEF_HAS_BIN|DOCEF_RAW_TYPE|\
  DOCEF_SHIFTED_X|DOCEF_SHIFTED_Y|DOCEF_SCROLLING_X|DOCEF_USER_DATA)

#define DOCEG_DONT_EDIT	(DOCEF_DEFINE|DOCEF_HTML_LINK|\
  DOCEF_AUX_STR|DOCEF_BIN_PTR_LINK|DOCEF_SCROLLING_X|DOCEF_TAG_CB)

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

public class CDocBin
{
  CDocBin *next,*last;
  I32	tmp_use_cnt,renum_num;
  U8	*tag;
  U0	start;
  U32	num,flags,size,use_cnt;
  U0	end;
  U8	*data;
#assert !($$&7)
};

#define DOC_SCROLL_SPEED	8

#define DOCSS_NORMAL		0
#define DOCSS_SINGLE_QUOTE	1
#define DOCSS_DBL_QUOTE		2
#define DOCSS_COMMENT		3
#define DOCSS_CPP_Z_COMMENT	4

#define DOC_ATTR_DFT_TEXT	WHITE<<4+BLACK
#define DOC_COLOR_ALT_TEXT	LTGRAY
#define DOC_COLOR_LINK		RED
#define DOC_COLOR_MACRO		LTBLUE
#define DOC_COLOR_ANCHOR	DKGRAY
#define DOC_COLOR_TREE		PURPLE
#define DOC_COLOR_PMT		GREEN
#define DOC_COLOR_COMMENT	GREEN
#define DOC_COLOR_BIN		LTGREEN
#define DOC_COLOR_STR		BROWN
#define DOC_COLOR_CHAR_CONST	BROWN
#define DOC_COLOR_EXPORT_SYS_SYM LTPURPLE
#define DOC_COLOR_DEFINE_STR	CYAN
#define DOC_COLOR_GLBL_VAR	LTCYAN
#define DOC_COLOR_CLASS		LTBLUE
#define DOC_COLOR_FUN		PURPLE
#define DOC_COLOR_KEYWORD	BLUE
#define DOC_COLOR_REG		LTRED

public class CDocSettings
{
  U32	final_u32_attr;
  I16	left_margin,right_margin,indent;
  U16	page_len,header,footer;
  I8	shifted_x,shifted_y;
  U8	state,comment_depth,paren_depth,brace_depth,
	cur_text_attr,dft_text_attr;
};

#define DOC_DFT 		I32_MIN

public class CDocEntryBase
{
//This is a shortened structure for
  //cmds like the text cmd which
  //don't require the full CDocEntry structure.
  CDocEntryBase *next,*last;
  U8	*tag;
  union {
    U8	type_u8; //this stores the code
    U32 type; //these store attr flags
  };
  I32	page_line_num;
  I64	de_flags;
  I32	x,y;
  U32	min_col,max_col;
  CDocSettings settings;
  I64	user_data;
#assert !($$&7)
};

#define DOCE_LEN_DFT	64

public class CDocEntry:CDocEntryBase
{
  union {
    I64 attr;
    I64 cursor_x_offset;
    I64 (*left_cb)(CDoc *doc,CDocEntry *doc_e);
    I64 left_exp;
  };
  U8	*left_macro;

  union {
    I64 cursor_y_offset;
    I64 (*right_cb)(CDoc *doc,CDocEntry *doc_e);
    I64 right_exp;
  };
  U8	*right_macro;

  U8	*(*tag_cb)(CDoc *doc,CDocEntry *doc_e,CTask *mem_task);
  U8	*define_str,
	*aux_str,
	*bin_ptr_link,
	*html_link,
	*my_fmt_data;
  I64	hex_ed_width;
  I32	scroll_len,
	len, //$LK,"DOCE_LEN_DFT",A="MN:DOCE_LEN_DFT"$
	bin_num;
  U8	raw_type,pad[3];
  CDocBin *bin_data;
  U8	*data;
#assert !($$&7)
};

//$LK,"DocForm",A="MN:DocForm"$() $LK,"DocMenu",A="MN:DocMenu"$() $LK,"DocEd",A="MN:DocEd"$() $LK,"PopUpMenu",A="MN:PopUpMenu"$()
#define	DOF_SIZE_MIN		0x01
#define	DOF_INTERCEPT_TASK_END	0x02
#define DOF_DONT_HOME		0x04
#define DOF_WIN_MAX		0x08
#define DOF_DONT_TEXT_ATTR	0x10
#define DOF_DONT_WINMGR_SYNC	0x20
#define DOF_DONT_SHOW		0x40
//Combines with  $LK,"Editor Flags",A="MN:EDF_BAIL"$

class CEdFindText
{
  U8	find_text[STR_LEN] format "$$DA-P,"
	"A=\"Find        :%s\"$$\n",
	replace_text[STR_LEN] format "$$DA-P,"
	"A=\"Replace     :%s\"$$\n";
  Bool	replace			format "$$CB,\"Replace\"$$\n",
	scan_fwd		format "$$CB,\"Fwd\"$$\n",
	scan_sel_text		format "$$CB,\"Selection\"$$\n",
	match_case		format "$$CB,\"Match Case\"$$\n",
	whole_labels		format "$$CB,\"Whole Labels\"$$\n",
	local_var		format "$$CB,\"Rename Local Var\"$$\n",
	pmt,pad;
  I64	filter_lines		format "$$DA,A=\"Filter Lines:%d\"$$\n";
};

class CEdFileName
{
  CDirContext *dirc;
  U8	name[256] format "$$DA-P,LEN=255,A=\"FileName:%s\"$$";
};

//$LK,"Ed",A="MN:Ed"$()
#define EDF_BAIL		0x100
#define EDF_COLLAPSE		0x200
#define EDF_UNCOLLAPSE		0x400
#define EDF_WAS_WRITE		0x800 //Was exit ESC or SHIFT_ESC?
//Combines with $LK,"Document Flags",A="MN:DOF_SIZE_MIN"$

#define EDf_BAIL		8
#define EDf_COLLAPSE		9
#define EDf_UNCOLLAPSE		10
#define EDf_WAS_WRITE		11

// DOC header flags
#define DOCF_PLAIN_TEXT 	0x1
#define DOCF_PLAIN_TEXT_TABS	0x2 //has '\t', not DOCT_TAB
#define DOCF_AUTO_SAVE		0x4
#define DOCF_NO_CURSOR		0x8
#define DOCF_CARRIAGE_RETURN	0x10
#define DOCF_DBL_DOLLARS	0x20
#define DOCF_COLOR_NAMES	0x40
//Reserved x1
#define DOCF_BORDER_DOC		0x100
#define DOCF_FORM		0x200
#define DOCF_SIZE_MIN		0x400
#define DOCF_HIDE_CURSOR	0x800  //use $LK,"DocCursor",A="MN:DocCursor"$
#define DOCF_DONT_HIGHLIGHT_CURSOR 0x1000 //use $LK,"DocHighlightCursor",A="MN:DocHighlightCursor"$
#define DOCF_NO_SCROLL_BARS	0x2000 //use $LK,"DocScroll",A="MN:DocScroll"$
#define DOCF_ALLOW_UNDO		0x4000
#define DOCF_DONT_SHOW		0x8000
#define DOCF_HAS_SONG		0x10000
#define DOCF_MORE		0x20000
#define DOCF_BWD_MOVEMENT	0x40000
#define DOCF_NULL_GRAB_SCROLL	0x80000
#define DOCF_DONT_SWAP_OUT	0x100000
#define DOCF_DO_FULL_REFRESH	0x200000
#define DOCF_BREAK_UNLOCKED	0x400000
//Reserved x1
#define DOCF_HIGHLIGHT		DOCEF_HIGHLIGHT
#define DOCF_WORD_WRAP		DOCEF_WORD_WRAP
#define DOCF_BLINK		DOCEF_BLINK
#define DOCF_INVERT		DOCEF_INVERT
#define DOCF_SEL		DOCEF_SEL
#define DOCF_UNDERLINE		DOCEF_UNDERLINE

#define DOCF_OVERSTRIKE 	0x100000000
#define DOCF_IN_DOLLAR		0x200000000
#define DOCF_SUPERSCRIPT_MODE	0x400000000
#define DOCF_SUBSCRIPT_MODE	0x800000000
#define DOCF_UNDO_DIRTY		0x1000000000

#define DOCf_PLAIN_TEXT 	0
#define DOCf_PLAIN_TEXT_TABS	1 //has '\t', not DOCT_TAB
#define DOCf_AUTO_SAVE		2
#define DOCf_NO_CURSOR		3
#define DOCf_CARRIAGE_RETURN	4
#define DOCf_DBL_DOLLARS	5
#define DOCf_COLOR_NAMES	6
//Reserved x1
#define DOCf_BORDER_DOC		8
#define DOCf_FORM		9
#define DOCf_SIZE_MIN		10
#define DOCf_HIDE_CURSOR	11  //use $LK,"DocCursor",A="MN:DocCursor"$
#define DOCf_DONT_HIGHLIGHT_CURSOR 12  //use $LK,"DocHighlightCursor",A="MN:DocHighlightCursor"$
#define DOCf_NO_SCROLL_BARS	13  //use $LK,"DocScroll",A="MN:DocScroll"$
#define DOCf_ALLOW_UNDO		14
#define DOCf_DONT_SHOW		15
#define DOCf_HAS_SONG		16
#define DOCf_MORE		17
#define DOCf_BWD_MOVEMENT	18
#define DOCf_NULL_GRAB_SCROLL	19
#define DOCf_DONT_SWAP_OUT	20
#define DOCf_DO_FULL_REFRESH	21
#define DOCf_BREAK_UNLOCKED	22
//Reserved x1

#define DOCf_HIGHLIGHT		DOCEf_HIGHLIGHT
#define DOCf_WORD_WRAP		DOCEf_WORD_WRAP
#define DOCf_BLINK		DOCEf_BLINK
#define DOCf_INVERT		DOCEf_INVERT
#define DOCf_SEL		DOCEf_SEL
#define DOCf_UNDERLINE		DOCEf_UNDERLINE

#define DOCf_OVERSTRIKE 	32
#define DOCf_IN_DOLLAR		33
#define DOCf_SUPERSCRIPT_MODE	34
#define DOCf_SUBSCRIPT_MODE	35
#define DOCf_UNDO_DIRTY		36

//locked flags
#define DOClf_LOCKED		0
class CDocUndo
{
  CDocUndo *next,*last;
  I64	size,doc_flags,time_stamp;
  U8	*body;
};

//See $LK,"DocMenu",A="MN:DocMenu"$()
#define DOCM_CANCEL		(-1)

#define DOC_SIGNATURE_VAL	'DocS'

#define RECALCt_NORMAL		0x00
#define RECALCt_FIND_CURSOR	0x01
#define RECALCt_TO_SCRN		0x02
#define RECALCG_MASK		0xFF

#define RECALCF_HAS_CURSOR	0x100
#define RECALCF_ADD_CURSOR	0x200
#define RECALCF_TO_HTML		0x400

public class CDoc //Linked Text File header
{//See $LK,"Doc",A="HI:Doc"$ for documentation.
  CDocEntryBase head;
  I64	flags,locked_flags;
  CDocEntry *cur_entry,*old_cur_entry;
  I32	cur_col,old_cur_col,
	line_start_col,top_line_num,
	dollar_buf_size,dollar_buf_ptr;
  U8	*dollar_buf; //When entering $$ cmds, it buffers them until the end $$.

  CTask *win_task,*mem_task,*owning_task;
  I32	page_line_num,undo_cnt,
	x,y,min_x,max_x,min_y,max_y;
  I64	line,col,best_d,
	old_win_top,old_win_bottom,
	old_win_left,old_win_right,
	cmd_U8;
  U32	doc_signature,cur_bin_num;
  I64	max_entries,
	updates_cnt;
  CEdFindText *find_replace;

  CEdFileName filename;
  I64	file_attr;
  I64	(*left_click_link)(CDoc *doc,CDocEntry *doc_e);
  I64	(*right_click_link)(CDoc *doc,CDocEntry *doc_e);

  //See $LK,"::/Apps/Psalmody/JukeBox.HC"$
  U8	*user_put_data; //Passed to user_put_key() and user_put_s()
  Bool	(*user_put_key)(CDoc *doc,U8 *data,I64 ch,I64 sc);
  Bool	(*user_put_s)(CDoc *doc,U8 *data,U8 *st);

  CDoc	*parent_doc; //(When browsing deeper, opening deeper docs.)
  U64	desc; //8 characters. See $LK,"DocBorderLstDraw",A="MN:DocBorderLstDraw"$().

  CDocBin bin_head;
  CDocSettings settings_head;
  CDocUndo undo_head;

  I64	user_data;
#assert !($$&7)
};

