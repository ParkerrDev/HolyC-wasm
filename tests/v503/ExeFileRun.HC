//ExeFile compiles and runs a file; its globals and functions stay.
U8 *src="I64 ef=7;\nI64 EfTwice(){return 2*ef;}\n\"ran %d\\n\",ef;\nef*3;\n";
FileWrite("~/ExeFileRun.HC",src,StrLen(src));
"res %d\n",ExeFile("~/ExeFileRun.HC");
"read\n";//V5.03 lexes one token ahead: ef cannot start this one.
ef+=1;
"%d %d\n",ef,EfTwice;
