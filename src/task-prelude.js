//Native V5.03 task, settings and keyboard record layouts.
export const TASK_TYPES_SRC=String.raw`
#define JOBT_TEXT_INPUT		0 //$LK,"TaskText",A="MN:TaskText"$()	Feed StdIn
#define JOBT_MSG		1 //$LK,"TaskMsg",A="MN:TaskMsg"$()	Post msg
#define JOBT_EXE_STR		2 //$LK,"TaskExe",A="MN:TaskExe"$()	Compile & execute src code text
#define JOBT_CALL		3 //$LK,"JobQue",A="MN:JobQue"$()	Tell MP to call function
#define JOBT_SPAWN_TASK		4 //$LK,"Spawn",A="MN:Spawn"$()	Tell MP to spawn task
#define JOBCf_LOCKED		0
#define MSG_NULL		0
#define MSG_CMD			1
#define MSG_KEY_DOWN		2  //($LK,"ASCII",A="MN:CH_CTRLA"$,$LK,"scan code",A="FI:::/Doc/CharOverview.DD"$) Press <CTRL-SHIFT-L>
#define MSG_KEY_UP		3  //($LK,"ASCII",A="MN:CH_CTRLA"$,$LK,"scan code",A="FI:::/Doc/CharOverview.DD"$) Press <CTRL-SHIFT-L>
#define MSG_MS_MOVE		4  //(x,y)
#define MSG_MS_L_DOWN		5  //(x,y)
#define MSG_MS_L_UP		6  //(x,y)
#define MSG_MS_L_D_DOWN 	7  //(x,y)
#define MSG_MS_L_D_UP		8  //(x,y)
#define MSG_MS_R_DOWN		9  //(x,y)
#define MSG_MS_R_UP		10 //(x,y)
#define MSG_MS_R_D_DOWN 	11 //(x,y)
#define MSG_MS_R_D_UP		12 //(x,y)
#define MSG_KEY_DOWN_UP		-2  //Down & UP
#define MSG_MS_L_DOWN_UP	-5  //Down & Up
#define MSG_MS_L_D_DOWN_UP	-7  //Down & Up
#define MSG_MS_R_DOWN_UP	-9  //Down & Up
#define MSG_MS_R_D_DOWN_UP	-11 //Down & Up
#define TSF_SAME_SONG	1
#define BDS_CONST		0
#define BDS_CUR_DRV		1
#define BDS_ED_FILENAME_DRV	2
#define TTS_CONST		0
#define TTS_LOCKED_CONST	1 //This is not strictly enforced
#define TTS_TASK_NAME		2
#define TTS_ED_FILENAME		3
#define TTS_CUR_LEX		4
#define TASKf_TASK_LOCK		0
#define TASKf_KILL_TASK		1
#define TASKf_SUSPENDED		2
#define TASKf_IDLE		3
#define TASKf_CMD_LINE_PMT	4
#define TASKf_INPUT_FILTER_TASK	5
#define TASKf_FILTER_INPUT	6
#define TASKf_HAS_SONG		7
#define TASKf_DISABLE_BPTS	8
#define TASKf_AWAITING_MSG	9
#define TASKf_BREAK_LOCKED	10
#define TASKf_PENDING_BREAK	11
#define TASKf_BREAK_TO_SHIFT_ESC 12
#define TASKf_KILL_AFTER_DBG	13
#define TASKf_NONTIMER_RAND	14
#define DISPLAYf_SHOW			0
#define DISPLAYf_NOT_RAW		1
#define DISPLAYf_SILENT			2
#define DISPLAYf_NO_BORDER		3
#define DISPLAYf_WIN_ON_TOP		4
#define DISPLAYf_CHILDREN_NOT_ON_TOP	5
#define SCf_E0_PREFIX	7
#define SCf_KEY_UP	8
#define SCf_SHIFT	9
#define SCf_CTRL	10
#define SCf_ALT 	11
#define SCf_CAPS	12
#define SCf_NUM 	13
#define SCf_SCROLL	14
#define SCf_NEW_KEY	15
#define SCf_MS_L_DOWN	16
#define SCf_MS_R_DOWN	17
#define SCf_DELETE	18
#define SCf_INS		19
#define SCf_NO_SHIFT	30
#define SCf_KEY_DESC	31
#define SCF_E0_PREFIX	(1<<SCf_E0_PREFIX)
#define SCF_KEY_UP	(1<<SCf_KEY_UP)
#define SCF_SHIFT	(1<<SCf_SHIFT)
#define SCF_CTRL	(1<<SCf_CTRL)
#define SCF_ALT		(1<<SCf_ALT)
#define SCF_CAPS	(1<<SCf_CAPS)
#define SCF_NUM		(1<<SCf_NUM)
#define SCF_SCROLL	(1<<SCf_SCROLL)
#define SCF_NEW_KEY	(1<<SCf_NEW_KEY)
#define SCF_MS_L_DOWN	(1<<SCf_MS_L_DOWN)
#define SCF_MS_R_DOWN	(1<<SCf_MS_R_DOWN)
#define SCF_DELETE	(1<<SCf_DELETE)
#define SCF_INS 	(1<<SCf_INS)
#define SCF_NO_SHIFT	(1<<SCf_NO_SHIFT)
#define SCF_KEY_DESC	(1<<SCf_KEY_DESC)
#define SC_ESC		0x01
#define SC_BACKSPACE	0x0E
#define SC_TAB		0x0F
#define SC_ENTER	0x1C
#define SC_SHIFT	0x2A
#define SC_CTRL		0x1D
#define SC_ALT		0x38
#define SC_CAPS		0x3A
#define SC_NUM		0x45
#define SC_SCROLL	0x46
#define SC_CURSOR_UP	0x48
#define SC_CURSOR_DOWN	0x50
#define SC_CURSOR_LEFT	0x4B
#define SC_CURSOR_RIGHT 0x4D
#define SC_PAGE_UP	0x49
#define SC_PAGE_DOWN	0x51
#define SC_HOME		0x47
#define SC_END		0x4F
#define SC_INS		0x52
#define SC_DELETE	0x53
#define SC_F1		0x3B
#define SC_F2		0x3C
#define SC_F3		0x3D
#define SC_F4		0x3E
#define SC_F5		0x3F
#define SC_F6		0x40
#define SC_F7		0x41
#define SC_F8		0x42
#define SC_F9		0x43
#define SC_F10		0x44
#define SC_F11		0x57
#define SC_F12		0x58
#define SC_PAUSE	0x61
#define SC_GUI		0xDB
#define SC_PRTSCRN1	0xAA
#define SC_PRTSCRN2	0xB7
#define TASK_SIGNATURE_VAL 'TskS'
#define TASK_NAME_LEN 32
#define TASK_EXCEPT_CALLERS 8

public class CWinScroll
{
  I64	min,pos,max;
  U32	flags;
  U8	color,pad[3];
};

class CJob
{
  CJob *next,*last;
  CJobCtrl *ctrl;
  I64	job_code,flags,msg_code;

  I64	(*addr)(U8 *fun_arg);
  U8	*fun_arg;

  U8	*aux_str;
  I64	aux1,aux2, //Sometimes called arg1 and arg2. (Windows msg param1 param2)
	res;

  CTask	*spawned_task,
	*master_task;
};

class CJobCtrl
{
  CJob *next_waiting,*last_waiting;
  CJob *next_done,*last_done;
  I64	flags;
};

public class CTaskSettings
{
  CTaskSettings *next;
  U8	*cur_dir;
  I64	left,right,top,bottom;
  U0	(*draw_it)(CTask *task,CDC *dc);
  U0	(*task_end_cb)();
  CTask *song_task,*animate_task;
  I64	scroll_x,scroll_y,scroll_z;
  CBGR48 palette[COLORS_NUM];
  U32	win_inhibit;
  U8	text_attr,title_src,
	border_attr,border_src,
	task_title[STR_LEN];
  Bool	border,hide_cursor,highlight_cursor,scroll,autocomplete,pad[3];
};

class CTaskStk
{
  CTaskStk *next_stk;
  I64	stk_size,stk_ptr;
  U0	stk_base;
};

class CTaskDying
{
  CTask *next,*last;
  I64	wake_jiffy;
};

public class CTask //The Fs segment reg points to current CTask.
{
  CTask *addr; //Self-addressed ptr
  U32	task_signature,win_inhibit;
  I64	wake_jiffy;
  U32	task_flags,display_flags;

  CHeapCtrl *code_heap,*data_heap;

  CDoc	*put_doc,*display_doc, //When double buffering, these two differ.
	*border_doc;
  I64	win_left,win_right,win_top,win_bottom;

  CDrv	*cur_dv;
  U8	*cur_dir;

  CTask *parent_task,
	*next_task,*last_task,
	*next_input_filter_task,*last_input_filter_task,
	*next_sibling_task,*last_sibling_task,
	*next_child_task,*last_child_task;

  //These are derived from left,top,right,bottom
  I64	win_width,win_height,
	pix_left,pix_right,pix_width, //These are in pixs, not characters
	pix_top,pix_bottom,pix_height,
	scroll_x,scroll_y,scroll_z;

  //These must be in this order
  //for $LK,"TASK_CONTEXT_SAVE",A="FF:::/Kernel/Sched.HC,TASK_CONTEXT_SAVE"$ and $LK,"_TASK_CONTEXT_RESTORE",A="FF:::/Kernel/Sched.HC,_TASK_CONTEXT_RESTORE"$
  I64	rip,rflags,rsp,rsi,rax,rcx,rdx,rbx,rbp,rdi,
	r8,r9,r10,r11,r12,r13,r14,r15;
  CCPU	*gs;
  CFPU	*fpu_mmx;
  I64	swap_cnter;

  U0	(*draw_it)(CTask *task,CDC *dc);

  U8	task_title[STR_LEN],
	task_name[TASK_NAME_LEN],
	wallpaper_data[STR_LEN],

	title_src,border_src,
	text_attr,border_attr;
  U16	win_z_num,pad;

  CTaskStk *stk;

  CExcept *next_except,*last_except;
  I64	except_rbp,	//throw routine's RBP
	except_ch;	//throw(ch)
  U8	*except_callers[TASK_EXCEPT_CALLERS];

  Bool	catch_except;
  Bool	new_answer;
  U8	answer_type,pad[5];
  I64	answer;
  F64	answer_time;
  CBpt	*bpt_lst;
  CCtrl	*next_ctrl,*last_ctrl;
  CMenu	*cur_menu;
  CTaskSettings *next_settings;
  CMathODE *next_ode,*last_ode;
  F64	last_ode_time;
  CHashTable *hash_table;

  CJobCtrl srv_ctrl;
  CCmpCtrl *next_cc,*last_cc;
  CHashFun *last_fun;

  U0	(*task_end_cb)();
  CTask *song_task,*animate_task;
  I64	rand_seed,
	task_num,
	fault_num,fault_err_code;
  CTask *popup_task,
	*dbg_task;
  CWinScroll horz_scroll,vert_scroll;

  I64	user_data;
};

public class CKbdStateGlbls
{
  I64	scan_code,	//See $LK,"scan codes",A="FI:::/Doc/CharOverview.DD"$
	last_down_scan_code,
	cnt,		//Count of keys pressed since boot.
	timestamp,	//Output: GetTSC when event.
	new_key_timestamp; //Output: GetTSC when new key event.
  CFifoU8 *fifo,*fifo2; //Private
  CFifoI64 *scan_code_fifo;

  //BitTest, $LK,"Bt",A="MN:Bt"$(), with a merged scan code.
  //(Left and right shift merged, for example.)
  U32	down_bitmap[8],
//BitTest, $LK,"Bt",A="MN:Bt"$(), with an unmerged scan code.
	down_bitmap2[8];

  Bool	rst,		//Private: Reset KbdMs
	irqs_working;	//Private
};
`;

export const TASK_SRC=String.raw`
Bool TaskValidate(CTask *task)
{//return TRUE if task looks valid.
  if (!(0<task<=I32_MAX) || task->addr!=task ||
	task->task_signature!=TASK_SIGNATURE_VAL)
    return FALSE;
  else
    return TRUE;
}
`;
