import {
  GR_PRIMITIVES_SRC,GR_PALETTE_SRC,GR_MATH_SRC,GR_TYPES_SRC,GR_SRC,
  HASH_TYPES_SRC,HASH_SRC,QUE_VECT_TYPES_SRC,QUE_VECT_SRC,LEX_TOKEN_DATA_SRC,
  LEX_TOKEN_DIAG_SRC,LEX_TOKEN_SRC,LEX_EXT_SRC,LEX_REPORT_SRC,LEX_REM_SRC,
  LEX_STRING_SRC,LEX_TYPES_SRC,LEX_BITMAP_SRC,LEX_GLOBALS_SRC,LEX_SRC,
  CMP_TABLE_TYPES_SRC,CMP_TABLE_SRC,MEMBER_TYPES_SRC,MEMBER_SRC,CMP_TYPES_SRC,
  CMP_SRC,DEFINE_SRC,TASK_TYPES_SRC,TASK_SRC,TASK_SETTINGS_SRC,
  TASK_MESSAGE_SRC,DIR_TYPES_SRC,DIR_SRC,FILE_SRC,TASK_SCHEDULE_SRC,
  DOC_TYPES_SRC,WINDOW_SRC,DOC_NAV_SRC,DOC_INIT_TYPES_SRC,DOC_INIT_SRC,
  DOC_ENTRY_TYPES_SRC,FIFO_TYPES_SRC,FIFO_SRC,KBD_SRC,RAW_SRC,CONSOLE_SRC,
  STR_SRC,GR_COMPOSITES_SRC,SPRITE_TYPES_SRC,SPRITE_SRC,RUNTIME_TYPES_SRC,
  GR_STORAGE_SRC,RUNTIME_BASE_SRC,RUNTIME_OUTPUT_SRC,RUNTIME_TAIL_SRC
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
  {name:"DocHostInit",globals:["doldoc"]},
  {name:"KbdHostInit",globals:["kbd"]},
  {name:"__hgr_init",globals:["gr","__gr_font"]},
  {name:"__hgr_pen_init",fields:["gr.pen_brushes","gr.collision_pen_brushes",
    "gr.even_pen_brushes","gr.odd_pen_brushes","gr.circle_lo","gr.circle_hi"]},
];
export const RUNTIME_INTERFACES=[{
  name:"task-continuations",
  globals:["kbd"],
  imports:["__task_spawn","__task_kill","__task_wait","__task_exit","__task_break"],
  check:"__task_require",
  exports:["TaskHostRoot","TaskHostEnter","TaskHostNew","TaskHostDone",
    "TaskHostFlags","TaskHostStk","TaskHostStkTop","TaskHostKill","TaskHostMsg","TaskHostEnd","TaskHostReady",
    "KbdHostByte","KbdHostReset","Break","TaskHostBreak"],
}];
// Live V5.03 exports these storage addresses as untyped, nonassignable symbols.
export const RUNTIME_ADDRESSES=[
  {name:"sys_font_std",storage:"__sys_font_std"},
  {name:"sys_font_cyrillic",storage:"__sys_font_cyrillic"},
];

export function Prelude(outputSrc=CONSOLE_SRC,docEntrySrc="") {
  return RUNTIME_TYPES_SRC+[GR_TYPES_SRC,SPRITE_TYPES_SRC].join("\n")+
    GR_STORAGE_SRC+[FIFO_TYPES_SRC,HASH_TYPES_SRC,TASK_TYPES_SRC,DIR_TYPES_SRC,
      DOC_TYPES_SRC,DOC_ENTRY_TYPES_SRC,DOC_INIT_TYPES_SRC,CMP_TYPES_SRC,
      CMP_TABLE_TYPES_SRC,LEX_TYPES_SRC,QUE_VECT_TYPES_SRC,MEMBER_TYPES_SRC].join("\n")+
    RUNTIME_BASE_SRC+outputSrc+RUNTIME_OUTPUT_SRC+[
      GR_MATH_SRC,GR_SRC,GR_PALETTE_SRC,GR_PRIMITIVES_SRC,STR_SRC,
      GR_COMPOSITES_SRC,SPRITE_SRC,TASK_SRC,TASK_MESSAGE_SRC,TASK_SCHEDULE_SRC,
      FIFO_SRC,KBD_SRC,WINDOW_SRC,TASK_SETTINGS_SRC,DIR_SRC,FILE_SRC,HASH_SRC,
      DEFINE_SRC,CMP_SRC,MEMBER_SRC,LEX_BITMAP_SRC,LEX_GLOBALS_SRC,CMP_TABLE_SRC,
      LEX_SRC,LEX_STRING_SRC,QUE_VECT_SRC,LEX_REM_SRC,LEX_REPORT_SRC,
      LEX_TOKEN_DATA_SRC,LEX_TOKEN_DIAG_SRC,LEX_TOKEN_SRC,LEX_EXT_SRC,
      DOC_INIT_SRC,DOC_NAV_SRC,docEntrySrc
    ].join("\n")+RUNTIME_TAIL_SRC+RAW_SRC+"\n";
}

export const PRELUDE_SRC=Prelude();
