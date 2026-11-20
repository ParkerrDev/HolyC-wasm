// abi.js - the contract between compiled HolyC modules and the JS runtime host.
// Both src/codegen.js and src/runtime/host.js import this so memory layout and
// host import signatures stay in sync.
//
// Convention: every integer/pointer is passed as wasm i64, every float as f64.
// HolyC's own value model is identical, so call sites need no conversion.

// --- Linear memory layout (byte addresses) ---
export const PAGE = 65536;
export const MEM_INITIAL_PAGES = 512;          // 32 MiB initial
export const MEM_MAX_PAGES = 8192;             // 512 MiB max (growable)
export const STACK_TOP = 256 * PAGE;           // shadow stack grows DOWN from 16 MiB
export const HEAP_BASE = STACK_TOP;            // heap grows UP from 16 MiB (16 MiB free initially)

export const JUNK_ADDR = 32;                   // scratch for unknown field/symbol writes (16 B)
export const MS_ADDR = 64;                     // ms, V5.03 CMsStateGlbls (168 B); the host
                                               // reaches it through MsHardSet, never by address
export const ARG_BUF = 1024;                   // legacy embedded-module printf arguments
export const ARG_SLOT = 16;                    // [tag @0 (i64)][value @8 (i64/f64)]
export const ARG_MAX = 64;                     // max marshalled args per call
export const DATA_BASE = 8192;                 // static data (globals, strings) start

// printf arg tags
export const TAG_INT = 0;
export const TAG_FLT = 1;

export {GR_WIDTH,GR_HEIGHT,PALETTE} from "./runtime/palette.js";

export const COLOR_NAMES = {
  BLACK: 0, BLUE: 1, GREEN: 2, CYAN: 3, RED: 4, PURPLE: 5, BROWN: 6, LTGRAY: 7,
  DKGRAY: 8, LTBLUE: 9, LTGREEN: 10, LTCYAN: 11, LTRED: 12, LTPURPLE: 13,
  YELLOW: 14, WHITE: 15,
};

const I=0x7E,F=0x7C;

// Host imports (module "env"). name -> {params, results} in wasm value types.
export const HOST_IMPORTS = {
  __printf:      { params: [I, I], results: [] },        // (fmtAddr, nargs)
  __rt_init_failed: {params: [], results: []},
  __rt_booted: {params: [], results: []},            // the prelude's boot is done
  __lex_error: {params: [I,I,I,I,I,I,I,I,I], results: []},
  __puts:        { params: [I], results: [] },
  __print_bytes: { params: [I, I], results: [] },        // (addr, n)
  __putc:        { params: [I], results: [] },           // (ch)

  __gr_plot:     { params: [I, I, I], results: [] },     // x,y,color
  __gr_flip:     { params: [], results: [] },
  __gr_width:    { params: [], results: [I] },
  __gr_height:   { params: [], results: [I] },
  __gr_update:   { params: [I, I, I, I, I, I], results: [] }, // bitmap,stride,x,y,width,height

  __snd:         { params: [F], results: [] },           // freq Hz (0 = off)
  __play_note:   { params: [F, I], results: [] },        // freq, ms (blocks)

  __sleep:       { params: [I], results: [] },           // ms (blocks)
  __yield:       { params: [], results: [] },
  __ms_set:      { params: [I,I,I,I,I], results: [] },
  __time_ms:     { params: [], results: [F] },
  __tsc:        { params: [], results: [I] },
  __time_ms_checked: {params: [], results: [F]}, // finite time or NaN failure
  __date_utc:    { params: [], results: [I] }, // sec,min,hour,weekday,day,month,year16

  __fs_seed: {params: [], results: [I]},
  __task_require: {params: [], results: []},
  __task_spawn: {params: [I,I,I,I,I,I,I], results: [I]},
  __task_kill: {params: [I,I,I], results: [I]},
  __task_break: {params: [I,I], results: []},
  __task_wait: {params: [I], results: []},
  __task_exit: {params: [], results: []},
  __task_user: {params: [I], results: []}, // (task) the user task, whose end ends the run; NULL on it: run the program's entry
  __task_stack_fail: {params: [], results: []},
  __kbd_ctrl_alt: {params: [I,I,I], results: []},
  __kbd_leds: {params: [I], results: []},

  __malloc:      { params: [I, I], results: [I] }, // (size,hc) hc is the CHeapCtrl, 0 for none
  __heap_bp:     { params: [], results: [I] },     // the CBlkPool, V5.03's sys_code_bp
  __free:        { params: [I], results: [] },
  __msize2:      { params: [I], results: [I] },
  __msize:       { params: [I], results: [I] },

  // an expression compiled while the program runs (src/jit.js, Compiler/PrsExp.HC)
  __jit_tok:  { params: [I, I, F, I, I], results: [] },  // token,cur_i64,cur_f64,cur_str,cur_str_len
  __jit_expr: { params: [I], results: [I] },             // (_type) -> handle, 0 if it does not compile
  __jit_call: { params: [I], results: [I] },             // handle -> the value's 64 bits
  __jit_del:  { params: [I], results: [] },             // handle, or 0 for the tokens not yet compiled
  __jit_stmt: { params: [I], results: [I] },             // (_type) -> the code's table entry, INVALID_PTR if it only declares, 0 if it does not compile
  __jit_rest: { params: [I], results: [] },             // (part) compile and run the program's next part
  __jit_exe:  { params: [I, I, I], results: [I] },       // (text,filename,I64 *res) -> 0 if it does not compile
  __jit_define: { params: [I, I], results: [] },        // (name,text) a define made at run time
  __call_ext: { params: [I, I, I], results: [I] },      // (name,argc,argv) CallExtStr: what it returns, 0 if no such function

  // transcendental math (wasm lacks these as opcodes)
  __sin:  { params: [F], results: [F] }, __cos:  { params: [F], results: [F] },
  __tan:  { params: [F], results: [F] }, __asin: { params: [F], results: [F] },
  __acos: { params: [F], results: [F] }, __atan: { params: [F], results: [F] },
  __atan2:{ params: [F, F], results: [F] }, __pow:  { params: [F, F], results: [F] },
  __log:  { params: [F], results: [F] }, __log10:{ params: [F], results: [F] },
  __exp:  { params: [F], results: [F] },
  __fmod: { params: [F, F], results: [F] },
};
