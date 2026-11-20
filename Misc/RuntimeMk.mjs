import {readFileSync,writeFileSync} from "node:fs";
import {FONT} from "../src/runtime/font.js";
import {SCALE_BYTES} from "../src/float-scale.js";

const sources={
  "CMP_SRC": "Compiler/CmpCtrl.HC",
  "CMP_TYPES_SRC": "Compiler/CmpCtrl.HH",
  "CMP_TABLE_SRC": "Compiler/CmpTables.HC",
  "CMP_TABLE_TYPES_SRC": "Compiler/CmpTables.HH",
  "DEFINE_SRC": "Kernel/Define.HC",
  "DIR_SRC": "Kernel/BlkDev/Dir.HC",
  "DIR_TYPES_SRC": "Kernel/BlkDev/Dir.HH",
  "DSK_DRV_SRC": "Kernel/BlkDev/DskDrv.HC",
  "FILE_SRC": "Kernel/BlkDev/File.HC",
  "DSK_COPY_SRC": "Kernel/BlkDev/DskCopy.HC",
  "DSK_DRV_SRC": "Kernel/BlkDev/DskDrv.HC",
  "DOC_NEW_SRC": "Adam/DolDoc/DocNew.HC",
  "DOC_BIN_SRC": "Adam/DolDoc/DocBin.HC",
  "DOC_PLAIN_SRC": "Adam/DolDoc/DocPlain.HC",
  "DOC_CLIP_BOARD_SRC": "Adam/DolDoc/DocClipBoard.HC",
  "DOC_FILE_SRC": "Adam/DolDoc/DocFile.HC",
  "DOC_TREE_SRC": "Adam/DolDoc/DocTree.HC",
  "REGISTRY_SRC": "Adam/ARegistry.HC",
  "TRAINING_SRC": "Adam/Training.HC",
  "ADSK_A_SRC": "Adam/ABlkDev/ADskA.HC",
  "ADSK_B_SRC": "Adam/ABlkDev/ADskB.HC",
  "AC_FILL_SRC": "Adam/AutoComplete/ACFill.HC",
  "AC_TASK_SRC": "Adam/AutoComplete/ACTask.HC",
  "AC_INIT_SRC": "Adam/AutoComplete/ACInit.HC",
  "GOD_BIBLE_SRC": "Adam/God/GodBible.HC",
  "GOD_EXT_SRC": "Adam/God/GodExt.HC",
  "HOLY_SPIRIT_SRC": "Adam/God/HolySpirit.HC",
  "DOC_INIT_SRC": "Adam/DolDoc/DocInit.HC",
  "DOC_INIT_TYPES_SRC": "Adam/DolDoc/DocInit.HH",
  "DOC_FORM_SRC": "Adam/DolDoc/DocForm.HC",
  "DOC_DBL_BUF_SRC": "Adam/DolDoc/DocDblBuf.HC",
  "DOC_HIGHLIGHT_SRC": "Adam/DolDoc/DocHighlight.HC",
  "DOC_RECALC_LIB_SRC": "Adam/DolDoc/DocRecalcLib.HC",
  "DOC_PUT_S_SRC": "Adam/DolDoc/DocPutS.HC",
  "DOC_RUN_SRC": "Adam/DolDoc/DocRun.HC",
  "DOC_GET_SRC": "Adam/DolDoc/DocGet.HC",
  "DOC_CHAR_SRC": "Adam/DolDoc/DocChar.HC",
  "DOC_FIND_SRC": "Adam/DolDoc/DocFind.HC",
  "DOC_LINK_SRC": "Adam/DolDoc/DocLink.HC",
  "DOC_ED_SRC": "Adam/DolDoc/DocEd.HC",
  "DOC_POP_UP_SRC": "Adam/DolDoc/DocPopUp.HC",
  "DOC_GR_SRC": "Adam/DolDoc/DocGr.HC",
  "DOC_MACRO_SRC": "Adam/DolDoc/DocMacro.HC",
  "DOC_PUT_KEY_SRC": "Adam/DolDoc/DocPutKey.HC",
  "DOC_TERM_SRC": "Adam/DolDoc/DocTerm.HC",
  "DOC_RECALC_SRC": "Adam/DolDoc/DocRecalc.HC",
  "DOC_TYPES_SRC": "Adam/DolDoc/Doc.HH",
  "FIFO_SRC": "Kernel/Fifo.HC",
  "FIFO_TYPES_SRC": "Kernel/Fifo.HH",
  "FLOAT_CONVERT_SRC": "Compiler/F64ToI64.HC",
  "GR_COMPOSITES_SRC": "Adam/Gr/GrComposites.HC",
  "GR_MATH_SRC": "Adam/Gr/GrMath.HC",
  "GR_PALETTE_SRC": "Adam/Gr/GrPalette.HC",
  "GR_SRC": "Adam/Gr/Gr.HC",
  "GR_TEXT_BASE_SRC": "Adam/Gr/GrTextBase.HC",
  "GR_TYPES_SRC": "Adam/Gr/Gr.HH",
  "GR_PRIMITIVES_SRC": "Adam/Gr/GrPrimitives.HC",
  "SPRITE_SRC": "Adam/Gr/Sprite.HC",
  "SPRITE_ED_SRC": "Adam/Gr/SpriteEd.HC",
  "SPRITE_TYPES_SRC": "Adam/Gr/Sprite.HH",
  "HASH_SRC": "Kernel/Hash.HC",
  "HASH_TYPES_SRC": "Kernel/Hash.HH",
  "KBD_SRC": "Kernel/Kbd.HC",
  "MOUSE_SRC": "Kernel/SerialDev/Mouse.HC",
  "KEYDEV_SRC": "Adam/KeyDev.HC",
  "KMATH_A_SRC": "Kernel/KMathA.HC",
  "KMISC_SRC": "Kernel/KMisc.HC",
  "COMPRESS_SRC": "Kernel/Compress.HC",
  "KUTILS_SRC": "Kernel/KUtils.HC",
  "MULTI_PROC_SRC": "Kernel/MultiProc.HC",
  "AMATH_SRC": "Adam/AMath.HC",
  "AMATH_ODE_SRC": "Adam/AMathODE.HC",
  "GR_SCRN_SRC": "Adam/Gr/GrScrn.HC",
  "DISPLAY_SRC": "Kernel/Display.HC",
  "LEX_EXT_SRC": "Compiler/LexExt.HC",
  "LEX_REM_SRC": "Compiler/LexRem.HC",
  "LEX_REPORT_SRC": "Compiler/LexReport.HC",
  "LEX_GLOBALS_SRC": "Compiler/LexGlbls.HC",
  "LEX_SRC": "Compiler/Lex.HC",
  "LEX_TYPES_SRC": "Compiler/Lex.HH",
  "LEX_STRING_SRC": "Compiler/LexStr.HC",
  "LEX_TOKEN_DIAG_SRC": "Compiler/LexTokenDiag.HC",
  "LEX_TOKEN_SRC": "Compiler/LexToken.HC",
  "MEMBER_SRC": "Compiler/Member.HC",
  "CHASH_SRC": "Compiler/CHash.HC",
  "MENU_SRC": "Adam/Menu.HC",
  "PRS_EXP_SRC": "Compiler/PrsExp.HC",
  "CMAIN_SRC": "Compiler/CMain.HC",
  "CMISC_SRC": "Compiler/CMisc.HC",
  "JOB_SRC": "Kernel/Job.HC",
  "MESSAGE_SRC": "Kernel/SerialDev/Message.HC",
  "KDBG_SRC": "Kernel/KDbg.HC",
  "SND_MATH_SRC": "Adam/Snd/SndMath.HC",
  "SND_MUSIC_SRC": "Adam/Snd/SndMusic.HC",
  "QSORT_SRC": "Kernel/QSort.HC",
  "SND_EFFECTS_SRC": "Adam/Snd/SndEffects.HC",
  "MEMBER_TYPES_SRC": "Compiler/Member.HH",
  "QUE_VECT_SRC": "Kernel/QueVect.HC",
  "QUE_VECT_TYPES_SRC": "Kernel/QueVect.HH",
  "RAW_SRC": "Kernel/Raw.HC",
  "STR_SRC": "Kernel/Str.HC",
  "STR_A_SRC": "Kernel/StrA.HC",
  "STR_SCAN_SRC": "Kernel/StrScan.HC",
  "TASK_MESSAGE_SRC": "Kernel/TaskMsg.HC",
  "TASK_SRC": "Kernel/Task.HC",
  "TASK_TYPES_SRC": "Kernel/Task.HH",
  "TASK_SCHEDULE_SRC": "Kernel/TaskSched.HC",
  "TASK_SETTINGS_SRC": "Kernel/TaskSettings.HC",
  "WINDOW_SRC": "Adam/Win.HC",
  "CTRLS_A_SRC": "Adam/Ctrls/CtrlsA.HC",
  "CTRLS_BTTN_SRC": "Adam/Ctrls/CtrlsBttn.HC",
  "RUNTIME_TYPES_SRC": "Kernel/Runtime.HH",
  "GR_STORAGE_SRC": "Adam/Gr/GrData.HH",
  "RUNTIME_BASE_SRC": "Kernel/RuntimeA.HC",
  "RUNTIME_OUTPUT_SRC": "Kernel/RuntimeB.HC",
  "RUNTIME_TAIL_SRC": "Kernel/RuntimeC.HC",
  "HOME_SYS_SRC": "HomeSys.HC",
  "WALL_PAPER_SRC": "Adam/WallPaper.HC"
};
const scales=Buffer.from(SCALE_BYTES,"base64");
const powers=Array.from({length:scales.length/8},(_,i)=>
  "0x"+scales.readBigUInt64LE(i*8).toString(16)).join(",");
const data={"/*SYS_FONT_STD*/":Array.from(FONT).join(","),"/*POW10_I64*/":powers};
const counts=Object.fromEntries(Object.keys(data).map(marker=>[marker,0]));
let output="// Generated by Misc/RuntimeMk.mjs from Kernel, Compiler and Adam. Do not edit.\n";
for (const [name,path] of Object.entries(sources)) {
  let source=readFileSync(new URL("../"+path,import.meta.url),"utf8");
  for (const [marker,value] of Object.entries(data)) {
    counts[marker]+=source.split(marker).length-1;
    source=source.replaceAll(marker,value);
  }
  output+="export const "+name+"="+JSON.stringify(source)+";\n";
}
for (const [marker,count] of Object.entries(counts))
  if (count!==1) throw new Error(marker+": expected exactly one table insertion");
const target=new URL("../src/runtime-source.js",import.meta.url);
if (process.argv.includes("--check")) {
  if (readFileSync(target,"utf8")!==output)
    throw new Error("Runtime source is stale; run npm run generate");
  console.log("Canonical HolyC and generated runtime source match.");
} else writeFileSync(target,output);
