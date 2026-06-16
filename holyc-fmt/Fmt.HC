//Fmt.HC -- TempleOS driver for holyc-fmt.  Reads a .HC file, runs HolyCFmtBuf,
//and prints the result (or writes it to a file).  Run it inside TempleOS / hemu:
//
//  #include "Fmt"
//  Fmt("::/Demo/Games/Life.HC");              //print the formatted source
//  Fmt("MyMessyFile.HC","MyMessyFile.HC");    //reformat in place (TEXT files only)
//
//Config (set before calling):  g_indent_w=2;  g_use_tabs=FALSE;
//
//NOTE: this formats plain-text HolyC.  DolDoc files with embedded BINARY (sprites,
//etc. -- they contain NUL bytes) are not plain text; edit those with Ed instead.
#include "HolyCFmt"

U0 Fmt(U8 *in_name, U8 *out_name=NULL)
{
  I64 size=0;
  U8 *raw=FileRead(in_name,&size);
  U8 *src, *res;
  if (!raw) {
    "$FG,4$holyc-fmt: can't read %s$FG$\n",in_name;
    return;
  }
  src=MAlloc(size+1);          //guarantee a NUL terminator for the formatter
  MemCpy(src,raw,size);
  src[size]=0;
  Free(raw);
  res=HolyCFmtBuf(src);
  if (out_name)
    FileWrite(out_name,res,StrLen(res));
  else
    "%s",res;
  Free(res);
  Free(src);
}
