import {
  GR_PRIMITIVES_SRC,GR_PALETTE_SRC,GR_MATH_SRC,GR_TYPES_SRC,GR_SRC,
  HASH_TYPES_SRC,HASH_SRC,QUE_VECT_TYPES_SRC,QUE_VECT_SRC,
  LEX_TOKEN_DIAG_SRC,LEX_TOKEN_SRC,LEX_EXT_SRC,LEX_REPORT_SRC,LEX_REM_SRC,
  LEX_STRING_SRC,LEX_TYPES_SRC,LEX_GLOBALS_SRC,LEX_SRC,
  CMP_TABLE_TYPES_SRC,CMP_TABLE_SRC,MEMBER_TYPES_SRC,MEMBER_SRC,CHASH_SRC,CMP_TYPES_SRC,
  CMP_SRC,DEFINE_SRC,TASK_TYPES_SRC,TASK_SRC,TASK_SETTINGS_SRC,
  TASK_MESSAGE_SRC,DIR_TYPES_SRC,DIR_SRC,DSK_DRV_SRC,FILE_SRC,DSK_COPY_SRC,TASK_SCHEDULE_SRC,
  DOC_TYPES_SRC,WINDOW_SRC,CTRLS_A_SRC,CTRLS_BTTN_SRC,DOC_INIT_TYPES_SRC,DOC_INIT_SRC,
  FIFO_TYPES_SRC,FIFO_SRC,KBD_SRC,MOUSE_SRC,RAW_SRC,KEYDEV_SRC,
  STR_SRC,GR_COMPOSITES_SRC,SPRITE_TYPES_SRC,SPRITE_SRC,SPRITE_ED_SRC,RUNTIME_TYPES_SRC,MENU_SRC,
  PRS_EXP_SRC,CMAIN_SRC,JOB_SRC,MESSAGE_SRC,CMISC_SRC,KDBG_SRC,SND_MATH_SRC,SND_MUSIC_SRC,SND_EFFECTS_SRC,QSORT_SRC,
  GR_STORAGE_SRC,RUNTIME_BASE_SRC,RUNTIME_OUTPUT_SRC,RUNTIME_TAIL_SRC,
  KMATH_A_SRC,KMISC_SRC,COMPRESS_SRC,MULTI_PROC_SRC,AMATH_SRC,AMATH_ODE_SRC,GR_TEXT_BASE_SRC,GR_SCRN_SRC,DISPLAY_SRC,STR_A_SRC,KUTILS_SRC,STR_SCAN_SRC,
  DOC_BIN_SRC,DOC_NEW_SRC,DOC_FORM_SRC,DOC_DBL_BUF_SRC,DOC_PLAIN_SRC,
  DOC_HIGHLIGHT_SRC,DOC_RECALC_LIB_SRC,DOC_RECALC_SRC,DOC_FILE_SRC,DOC_CLIP_BOARD_SRC,
  DOC_RUN_SRC,DOC_GET_SRC,DOC_CHAR_SRC,DOC_FIND_SRC,DOC_LINK_SRC,DOC_ED_SRC,DOC_POP_UP_SRC,DOC_GR_SRC,DOC_MACRO_SRC,
  DOC_PUT_KEY_SRC,DOC_PUT_S_SRC,DOC_TREE_SRC,DOC_TERM_SRC,REGISTRY_SRC,ADSK_A_SRC,ADSK_B_SRC,TRAINING_SRC,
  AC_FILL_SRC,AC_TASK_SRC,AC_INIT_SRC,GOD_BIBLE_SRC,GOD_EXT_SRC,HOLY_SPIRIT_SRC,HOME_SYS_SRC,WALL_PAPER_SRC
} from "./runtime-source.js";

// Runtime initialization is a dependency of the globals it establishes. The
// compiler uses the same reachability graph for these hooks and ordinary calls.
export const RUNTIME_INITIALIZERS=[
  {name:"__hcrt_init",always:true},
  {name:"DirHostInit",globals:["blkdev","dir_host_ready","dir_host_nodes",
      "dir_host_node_cnt","dir_host_byte_cnt","dir_host_drvs","dir_host_bds"],
    fields:["CTask.cur_dir","CTask.cur_dv"],
    exports:["DirHostTaskInit","DirHostSeed","DirHostReady","DirHostNext",
      "DirHostName","DirHostData","DirHostSize","DirHostIsDir",
      "DirHostMaxPath","DirHostMaxBytes","DirHostMaxNodes","MAlloc","Free"]},
  {name:"HashHostInit",fields:["CTask.hash_table"],
    exports:["HashHostTaskInit"]},
  {name:"RawHostInit",globals:["text"]},
  {name:"CmpLexHostInit",globals:["cmp"],writeOnlyGlobals:["cmp"]},
  {name:"CmpTablesHostInit",fields:["cmp.to_reg_vars_map","cmp.num_reg_vars",
    "cmp.reg_vars_mask","cmp.non_ptr_vars_map","cmp.num_non_ptr_vars",
    "cmp.non_ptr_vars_mask","cmp.dual_U16_tokens1","cmp.dual_U16_tokens2",
    "cmp.dual_U16_tokens3","cmp.binary_ops"]},
  {name:"SysDefinesLoad",fields:["CTask.hash_table"]},
  {name:"CmpKeyWordsLoad",fields:["CCmpCtrl.hash_entry"]},
  {name:"DocInit",globals:["doldoc"]},
  {name:"KbdHostInit",globals:["kbd"]},
  {name:"KeyOutputHostInit",globals:["keydev"]},
  {name:"GetStrHostInit",globals:["fp_getstr2"]},
  //The doc key device serves DolDoc, which every printing program need not have.
  {name:"DocKeyDevInit",globals:["doldoc","fp_getstr2","fp_doc_put"]},
  {name:"MacroHostInit",globals:["sys_macro_head"]},
  {name:"BitsTablesHostInit",globals:["rev_bits_table","set_bits_table"]},
  {name:"ClipHostInit",globals:["sys_clip_doc"]},
  {name:"MsHostInit",globals:["ms","ms_last","ms_hard","ms_hard_last","ms_grid"],
    exports:["MsHardSet","WinMsUpdate"]},
  {name:"__hgr_init",globals:["gr","__gr_font"]},
  {name:"__hgr_pen_init",fields:["gr.pen_brushes","gr.collision_pen_brushes",
    "gr.even_pen_brushes","gr.odd_pen_brushes","gr.circle_lo","gr.circle_hi"]},
  {name:"GrScrnHostInit",fields:["gr.dc1","gr.dc_cache","gr.scrn_image"]},
  //V5.03 has the word list from boot: VocabQuiz reads acd with no AutoComplete(ON).
  {name:"ACChk",globals:["acd"]},
];
export const RUNTIME_INTERFACES=[{
  name:"task-continuations",
  globals:["kbd"],
  imports:["__task_spawn","__task_kill","__task_wait","__task_exit","__task_break","__task_user"],
  check:"__task_require",
  exports:["TaskHostRoot","TaskHostEnter","TaskHostNew","TaskHostDone",
    "TaskHostFlags","TaskHostStk","TaskHostStkTop","TaskHostKill","TaskHostMsg","TaskHostEnd","TaskHostReady",
    "KbdHostByte","KbdHostReset","Break","TaskHostBreak"],
}];
// Live V5.03 exports these storage addresses as untyped, nonassignable symbols.
// The progress bars are KStart32.HC's labels in SYS_PROGRESSES, a CProgress each.
export const RUNTIME_ADDRESSES=[
  {name:"sys_font_std",storage:"__sys_font_std"},
  {name:"sys_font_cyrillic",storage:"__sys_font_cyrillic"},
  ...[1,2,3,4].flatMap(n=>[["",0],["_max",8],["_t0",16],["_tf",24],["_desc",32]]
    .map(([field,offset])=>({name:`progress${n}${field}`,storage:"sys_progresses",offset:(n-1)*80+offset}))),
];

// TempleOS has one Adam, and every program gets all of it. PRELUDE_FILES is
// the line each of its files starts on: V5.03 runs a file's statements when
// it loads the file, so a program runs those of the files it reaches.
function Adam(...parts)
{//Join the files (a list is joined with newlines) and note where each starts.
  let src="",line=1;
  const starts=[],Add=file=>{starts.push(line);src+=file;line+=file.split("\n").length-1;};
  for (const part of parts)
    if (Array.isArray(part)) part.forEach((file,i)=>{if (i) {src+="\n";line++;} Add(file);});
    else Add(part);
  return {src,starts};
}
const ADAM=Adam(RUNTIME_TYPES_SRC,[GR_TYPES_SRC,SPRITE_TYPES_SRC],
    GR_STORAGE_SRC,[FIFO_TYPES_SRC,HASH_TYPES_SRC,TASK_TYPES_SRC,DIR_TYPES_SRC,
      DOC_TYPES_SRC,DOC_INIT_TYPES_SRC,CMP_TYPES_SRC,
      CMP_TABLE_TYPES_SRC,LEX_TYPES_SRC,QUE_VECT_TYPES_SRC,MEMBER_TYPES_SRC],
    RUNTIME_BASE_SRC,KEYDEV_SRC,RUNTIME_OUTPUT_SRC,[
      KMATH_A_SRC,KMISC_SRC,DISPLAY_SRC,KUTILS_SRC,COMPRESS_SRC,MULTI_PROC_SRC,AMATH_SRC,GR_TEXT_BASE_SRC,GR_MATH_SRC,GR_SRC,GR_PALETTE_SRC,GR_PRIMITIVES_SRC,STR_A_SRC,STR_SRC,
      GR_COMPOSITES_SRC,SPRITE_SRC,SPRITE_ED_SRC,TASK_SRC,TASK_MESSAGE_SRC,TASK_SCHEDULE_SRC,
      FIFO_SRC,KBD_SRC,MOUSE_SRC,WINDOW_SRC,CTRLS_A_SRC,CTRLS_BTTN_SRC,TASK_SETTINGS_SRC,AMATH_ODE_SRC,GR_SCRN_SRC,DIR_SRC,DSK_DRV_SRC,FILE_SRC,DSK_COPY_SRC,HASH_SRC,
      DEFINE_SRC,STR_SCAN_SRC,CMP_SRC,MEMBER_SRC,CHASH_SRC,LEX_GLOBALS_SRC,CMP_TABLE_SRC,
      LEX_SRC,LEX_STRING_SRC,QUE_VECT_SRC,LEX_REM_SRC,LEX_REPORT_SRC,
      LEX_TOKEN_DIAG_SRC,LEX_TOKEN_SRC,LEX_EXT_SRC,
      DOC_INIT_SRC,PRS_EXP_SRC,CMAIN_SRC,JOB_SRC,MESSAGE_SRC,CMISC_SRC,KDBG_SRC,MENU_SRC,SND_MATH_SRC,SND_MUSIC_SRC,SND_EFFECTS_SRC,QSORT_SRC,
      DOC_BIN_SRC,DOC_NEW_SRC,DOC_FORM_SRC,DOC_DBL_BUF_SRC,DOC_PLAIN_SRC,
      DOC_HIGHLIGHT_SRC,DOC_RECALC_LIB_SRC,DOC_RECALC_SRC,DOC_FILE_SRC,DOC_CLIP_BOARD_SRC,
      DOC_RUN_SRC,DOC_GET_SRC,DOC_CHAR_SRC,DOC_FIND_SRC,DOC_LINK_SRC,DOC_ED_SRC,DOC_POP_UP_SRC,DOC_GR_SRC,DOC_MACRO_SRC,
      DOC_PUT_KEY_SRC,DOC_PUT_S_SRC,DOC_TREE_SRC,DOC_TERM_SRC,REGISTRY_SRC,ADSK_A_SRC,ADSK_B_SRC,TRAINING_SRC,
      AC_FILL_SRC,AC_TASK_SRC,AC_INIT_SRC,GOD_BIBLE_SRC,GOD_EXT_SRC,HOLY_SPIRIT_SRC,HOME_SYS_SRC
    ],RUNTIME_TAIL_SRC,RAW_SRC,"\n",
    WALL_PAPER_SRC); //Last: his sprite bin follows the NUL that ends the text.
export const PRELUDE_SRC=ADAM.src,PRELUDE_FILES=ADAM.starts;
