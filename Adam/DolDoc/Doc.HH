//DolDoc records from TempleOS V5.03 Kernel/KernelA.HH.

public class CDocBin
{
  CDocBin *next,*last;
  I32	tmp_use_cnt,renum_num;
  U8	*tag;
  U0	start;
  U32	num,flags,size,use_cnt;
  U0	end;
  U8	*data;
};

public class CDocSettings
{
  U32	final_u32_attr;
  I16	left_margin,right_margin,indent;
  U16	page_len,header,footer;
  I8	shifted_x,shifted_y;
  U8	state,comment_depth,paren_depth,brace_depth,
	cur_text_attr,dft_text_attr;
};

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
};

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
};

class CEdFindText
{
  U8	find_text[STR_LEN],
	replace_text[STR_LEN];
  Bool	replace,
	scan_fwd,
	scan_sel_text,
	match_case,
	whole_labels,
	local_var,
	pmt,pad;
  I64	filter_lines;
};

class CEdFileName
{
  CDirContext *dirc;
  U8	name[256];
};

class CDocUndo
{
  CDocUndo *next,*last;
  I64	size,doc_flags,time_stamp;
  U8	*body;
};

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
};

#define DOC_SIGNATURE_VAL 'DocS'
#define DOCf_HIDE_CURSOR 11
#define DOCf_DONT_HIGHLIGHT_CURSOR 12
#define DOCf_NO_SCROLL_BARS 13
