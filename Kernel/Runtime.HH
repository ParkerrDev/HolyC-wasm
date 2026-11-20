
//==================== constants ====================
#define NULL 0
#define TRUE 1
#define FALSE 0
#define ON 1
#define OFF 0
#define GR_WIDTH 640
#define GR_HEIGHT 480
#define FONT_WIDTH 8
#define FONT_HEIGHT 8
#define TEXT_ROWS (GR_HEIGHT/FONT_HEIGHT)
#define TEXT_COLS (GR_WIDTH/FONT_WIDTH)
#define COLORS_NUM 16
#define STR_LEN 144

#define BLACK 0
#define BLUE 1
#define GREEN 2
#define CYAN 3
#define RED 4
#define PURPLE 5
#define BROWN 6
#define LTGRAY 7
#define DKGRAY 8
#define LTBLUE 9
#define LTGREEN 10
#define LTCYAN 11
#define LTRED 12
#define LTPURPLE 13
#define YELLOW 14
#define WHITE 15

#define I8_MIN (-0x80)
#define I8_MAX 0x7F
#define I16_MIN (-0x8000)
#define I16_MAX 0x7FFF
#define I32_MIN (-0x80000000)
#define I32_MAX 0x7FFFFFFF
#define I64_MIN (-0x8000000000000000)
#define I64_MAX 0x7FFFFFFFFFFFFFFF
#define U8_MAX 0xFF
#define U16_MAX 0xFFFF
#define U32_MAX 0xFFFFFFFF
#define U64_MAX 0xFFFFFFFFFFFFFFFF
#define INVALID_PTR I64_MAX //V5.03 Kernel/KernelA.HH.

#define CH_CTRLA 0x01
#define CH_CTRLB 0x02
#define CH_CTRLC 0x03
#define CH_CTRLD 0x04
#define CH_CTRLE 0x05
#define CH_CTRLF 0x06
#define CH_CTRLG 0x07
#define CH_CTRLH 0x08
#define CH_CTRLI 0x09
#define CH_CTRLJ 0x0A
#define CH_CTRLK 0x0B
#define CH_CTRLL 0x0C
#define CH_CTRLM 0x0D
#define CH_CTRLN 0x0E
#define CH_CTRLO 0x0F
#define CH_CTRLP 0x10
#define CH_CTRLQ 0x11
#define CH_CTRLR 0x12
#define CH_CTRLS 0x13
#define CH_CTRLT 0x14
#define CH_CTRLU 0x15
#define CH_CTRLV 0x16
#define CH_CTRLW 0x17
#define CH_CTRLX 0x18
#define CH_CTRLY 0x19
#define CH_CTRLZ 0x1A
#define CH_CURSOR 0x05
#define CH_ESC 0x1B
#define CH_SHIFT_ESC 0x1C

//GetStr flags
#define GSF_SHIFT_ESC_EXIT	1 //This kills task on <SHIFT-ESC>
#define GSF_WITH_NEW_LINE	2
#define CH_SPACE ' '
#define CH_SHIFT_SPACE 0x1F
#define CH_BACKSPACE 8
#define CH_TAB 9
#define CH_RETURN '\n'
#define CH_NEW_LINE '\n'

#define ST_ERR_ST   "$$LTRED$$$$BK,1$$ERROR:$$FG$$$$BK,0$$ "
#define ST_WARN_ST  "$$RED$$$$BK,1$$WARNING:$$FG$$$$BK,0$$ "

//==================== math constants ====================
//(Int to F64 conversion is signed)
#define U64_F64_MAX (0x43F0000000000000(F64))
#define F64_MAX (0x7FEFFFFFFFFFFFFF(F64))
#define F64_MIN (0xFFEFFFFFFFFFFFFF(F64))
#define inf	(0x7FF0000000000000(F64))
#define ∞	(0x7FF0000000000000(F64))
#define pi (0x400921FB54442D18(F64))
#define π pi
#define exp_1 (0x4005BF0A8B145769(F64))
#define log2_10 (0x400A934F0979A371(F64))
#define log2_e	(0x3FF71547652B82FE(F64))
#define log10_2	(0x3FD34413509F79FF(F64))
#define loge_2	(0x3FE62E42FEFA39EF(F64))
#define sqrt2 (0x3FF6A09E667F3BCD(F64))
#define eps	(0x3CB0000000000000(F64))

//==================== points (V5.03 Kernel/KernelA.HH) ====================
public class CD2I32
{
  I32 x,y;
};

public class CD3I32
{
  I32 x,y,z;
};

public class CD2I64
{
  I64 x,y;
};

public class CD3I64
{
  I64 x,y,z;
};

public class CD2
{
  F64 x,y;
};

public class CD3
{
  F64 x,y,z;
};

public class Complex
{
  F64	x,y;
};

//==================== Run levels (V5.03 Kernel/KernelA.HH) ====================
#define RLf_16BIT		0
#define RLf_VGA			1
#define RLf_32BIT		2
#define RLf_PATCHED		3
#define RLf_16MEG_SYS_CODE_BP	4
#define RLf_64BIT		5
#define RLf_16MEG_ADAM_HEAP_CTRL 6
#define RLf_FULL_HEAPS		7
#define RLf_RAW			8
#define RLf_INTERRUPTS		9
#define RLf_BLKDEV		10
#define RLf_MP			11
#define RLf_COMPILER		12
#define RLf_DOC			13
#define RLf_WINMGR		14
#define RLf_REGISTRY		15
#define RLf_HOME		16
#define RLf_AUTO_COMPLETE	17
#define RLf_ADAM_SERVER		18
#define RLf_ONCE_ADAM		19
#define RLf_ONCE_USER		20

//==================== Counts (V5.03 Kernel/KernelA.HH) ====================
public class CCntsGlbls
{
  I64	jiffies,	//$LK,"JIFFY_FREQ",A="MN:JIFFY_FREQ"$
	timer,		//$LK,"SYS_TIMER_FREQ",A="MN:SYS_TIMER_FREQ"$. Use $LK,"SysTimerRead",A="MN:SysTimerRead"$().
	time_stamp_freq,
	time_stamp_kHz_freq,
	time_stamp_freq_initial, //Initial freq, sampled once at boot time.
	HPET_freq,
	HPET_kHz_freq,
	HPET_initial;	//Initial count, sampled at boot time.
  Bool	time_stamp_calibrated;
};

#define JIFFY_FREQ		1000 // Hz
#define CDATE_FREQ		49710 // Hz
#define SYS_TIMER_FREQ		(18333*65536/1000) //Hz
#define SYS_TIMER0_PERIOD	(65536*182/10/JIFFY_FREQ)

//==================== Semaphores (V5.03 Kernel/KernelA.HH) ====================
#define DFT_CACHE_LINE_WIDTH	128

//Semaphores
class CSema
{
  Bool	val,pad[DFT_CACHE_LINE_WIDTH-1];
};
#define SEMA_DEBUG		0
#define SEMA_RECORD_MACRO	1
#define SEMA_SYS_TIMER		2
#define SEMA_SYS_DATE		3
#define SEMA_DBG_MODE		4
#define SEMA_SND		5
#define SEMA_HEAPLOG_ACTIVE	6
#define SEMA_HEAPLOG_LOCK	7
#define SEMA_REFRESH_IN_PROGRESS 8
#define SEMA_FLUSH_VGA_IMAGE	9
#define SEMA_SINGLE_USER	10
#define SEMA_DSK_CACHE		11
#define SEMA_FAR_CALL32		12
#define SEMA_DEV_MEM		13
#define SEMA_VGA		14
#define SEMA_UPDATE_WIN_Z_BUF	15
#define SEMA_TT			16
#define SEMA_MUTE		17
#define SEMA_JUST_PUMP_MSGS	18
#define SEMA_TMBEAT		19
#define SEMA_FIX		20
#define SEMA_SEMAS_NUM		21

//==================== AutoComplete (V5.03 Kernel/KernelA.HH) ====================
#help_index "AutoComplete"
#define ACf_INIT_IN_PROGRESS	0
#define AC_FILLINS_NUM 10
public class CAutoCompleteGlbls
{
  I64	num_words;
  CHashTable *hash_table;
  U8	*cur_word;
  I64	flags;
  CTask	*task;
  I64	partial_len,num_fillins,
	fillin_hits	[AC_FILLINS_NUM+1];
  CHashAC *fillin_matches[AC_FILLINS_NUM+1];
};

#help_index "AutoComplete/Dictionary"
#define ACD_WORD_FILENAME	"/Adam/AutoComplete/ACWords.DATA.Z"
#define ACD_DEF_FILENAME	"/Adam/AutoComplete/ACDefs.DATA"
#define ACD_DEF_FILENAME_Z	"/Adam/AutoComplete/ACDefs.DATA.Z"

#define ACD_H1			0
#define ACD_H1_END		1
#define ACD_DEF			2
#define ACD_DEF_END		3
#define ACD_PRONUNCIATION	4
#define ACD_PRONUNCIATION_END	5
#define ACD_POS			6
#define ACD_POS_END		7
#define ACD_EXTRA		8
#define ACD_EXTRA_END		9
#define ACD_BLK_SIZE		0x4000

#define ACD_END_CHAR		0x00
#define ACD_WORD_CHAR		0x01
#define ACD_DEF_CHAR		0x02
#define ACD_PRONUNCIATION_CHAR	0x03
#define ACD_POS_CHAR		0x04
#define ACD_EXTRA_CHAR		0x05

#define ACD_FILLINS_NUM 10
public class CAutoCompleteDictGlbls
{
  U8	*word_lst;
  I64	word_lst_size,num_words,num_fillins;
  U8	*fillins[ACD_FILLINS_NUM];
  Bool	has_words,has_defs;
};


//==================== Compression (V5.03 Kernel/KernelA.HH) ====================
#define ARC_BITS_MAX	12

#define CT_NONE 	1
#define CT_7_BIT	2
#define CT_8_BIT	3
class CArcEntry
{
  CArcEntry *next;
  U16	basecode;
  U8	ch,pad;
  U32	pad;
};

public class CArcCtrl
{
  I64	src_pos,src_size,
	dst_pos,dst_size;
  U8	*src_buf,*dst_buf;
  I64	min_bits,min_table_entry;
  CArcEntry *cur_entry,*next_entry;
  I64	cur_bits_in_use,next_bits_in_use;
  U8	*stk_ptr,*stk_base;
  I64	free_idx,free_limit,
	saved_basecode,
	entry_used,
	last_ch;
  CArcEntry compress[1<<ARC_BITS_MAX],
	*hash[1<<ARC_BITS_MAX];
};

public class CArcCompress
{
  I64	compressed_size,expanded_size;
  U8	compression_type;
  U0	body;
};

//==================== Progress (V5.03 Kernel/KernelA.HH) ====================
#define PROGRESS_BARS_NUM	4
#define PROGRESS_DESC_LEN	(64-8-8)
class CProgress
{
  I64	val,max;
  F64	t0,tf;
  U8	desc[PROGRESS_DESC_LEN];
};

//==================== ODE (V5.03 Kernel/KernelA.HH) ====================
public class COrder2D3
{
  F64	x,y,z,
	DxDt,DyDt,DzDt;
};

#define MSF_INACTIVE		1
#define MSF_FIXED		2
public class CMass
{
  CMass	*next,*last;
  COrder2D3 *state, //Point to entries in $LK,"CMathODE",A="MN:CMathODE"$.state[]
	*DstateDt;  //Point to entries in $LK,"CMathODE",A="MN:CMathODE"$.DstateDt[]

  U0	start;
  U32	flags,num;
  F64	mass,drag_profile_factor;
  U0	saved_state;
  F64	x,y,z,
	DxDt,DyDt,DzDt;
  U0	end;
};

#define SSF_INACTIVE		1
#define SSF_NO_COMPRESSION	2
#define SSF_NO_TENSION		4
public class CSpring
{
  CSpring *next,*last;
  CMass	*end1,*end2;
  F64	f,displacement; //set for you to check

  U0	start;
  U32	flags,num,
	end1_num,end2_num;
  F64	const,rest_len;
  U0	end;
};

//Ordinary Differential Equations
#define ODEF_HAS_MASSES	1
#define ODEF_PAUSED	2
#define ODEF_STARTED	4
#define ODEF_BUSY	8

#define ODEf_HAS_MASSES	0
#define ODEf_PAUSED	1
#define ODEf_STARTED	2
#define ODEf_BUSY	3

public class CMathODE
{
  CMathODE *next,*last;
  I64	flags,n,n_internal;
  CMass	*next_mass,*last_mass;
  CSpring *next_spring,*last_spring;
  F64	drag_v,  //drag proportional to velocity
	drag_v2, //drag proportional to velocity squared
	drag_v3, //drag proportional to velocity cubed
	acceleration_limit, //This clips acceleration
	base_t,
	t,t_scale,
	h,h_min,h_max;

  //This is not precise, just a ballpark.
  //TempleOS CMathODE's are for video games
  //not science.  It bails if it takes
  //too long.
  F64	min_tolerance,max_tolerance;

  F64	tolerance_internal,
	*array_base,
	*state,
	*state_internal,
	*DstateDt,
	*state_scale,
	*initial_state,
	*tmp0,*tmp1,*tmp2,*tmp3,
	*tmp4,*tmp5,*tmp6,*tmp7;
  CTask	*mem_task,*win_task;
  U0	(*derive)(CMathODE *o,F64 t,F64 *state,F64 *DstateDt);
  U0	(*mp_derive)(CMathODE *o,F64 t, //If break into parallel pieces.
		I64 cpu_num,F64 *state,F64 *DstateDt);
  CTask **slave_tasks;
  I64	mp_not_done_flags;
  F64	mp_t,*mp_state,*mp_DstateDt;

  I64	user_data;
};

public U16 class CColorROPU16
{
  U8 color,rop;
};

public U32 class CColorROPU32
{
  CColorROPU16 c0,c1;
};

public U32 class CBGR24
{
  U8 b,g,r,pad;
};

public I64 class CBGR48
{
  U16 b,g,r,pad;
};

//==================== device context ====================
