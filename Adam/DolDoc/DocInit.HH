
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
