//V5.03 Copy, Move, Del, CopyTree, DelTree (ADskA.HC, DskCopy.HC) and Size
//(ADskB.HC) on files made here. A Del of many files is silent: his order is
//the dir's on disk.
U0 MVPrint(U8 *mask)
{
  CDirEntry *tmpde=FilesFind(mask,FUF_RECURSE|FUF_JUST_FILES|FUF_FLATTEN_TREE),
	*tmpde1=tmpde;
  while (tmpde) {
    "%s %d\n",tmpde->full_name,tmpde->size;
    tmpde=tmpde->next;
  }
  DirTreeDel(tmpde1);
}

U0 MVChk()
{
  U8 *st;
  I64 a,b,flags=0;
  Silent;
  DirMk("~/MV");
  DirMk("~/MV/Sub");
  Silent(OFF);
  FileWrite("~/MV/A.TXT","Apple",5);
  FileWrite("~/MV/Sub/B.TXT","Banana",6);
  FileWrite("~/MV/Z.TXT.Z","Zebra zebra zebra zebra",23);
  a=Copy("~/MV/A.TXT","~/MV/C.TXT");
  b=Copy("~/MV/A.TXT","~/MV/A.TXT");
  "%d %d\n",a,b;
  a=Copy("~/MV/Z.TXT.Z","~/MV/Y.TXT");
  b=Copy("~/MV/Z.TXT.Z","~/MV/W.TXT.Z");
  "%d %d\n",a,b;
  st=FileRead("~/MV/Y.TXT");
  "%s\n",st;
  Free(st);
  st=FileRead("~/MV/W.TXT.Z");
  "%s\n",st;
  Free(st);
  a=Move("~/MV/C.TXT","~/MV/D.TXT");
  "%d %d %d\n",a,FileFind("~/MV/C.TXT"),FileFind("~/MV/D.TXT");
  Silent;
  a=Copy("~/MV/*.TXT","~/MV/Sub");
  Silent(OFF);
  "%d\n",a;
  MVPrint("~/MV/*");
  "%d %d\n",Size("~/MV/*.TXT","-r"),Size("~/MV/*.TXT","-r",512);
  "%d %d\n",Size("~/MV/*.Z","-r"),Size("~/MV/*.Z","-r+x");
  ScanFlags(&flags,Define("ST_FILE_UTIL_FLAGS"),"+r+d-r+x");
  "%X\n",flags;
  Silent;
  a=CopyTree("~/MV/Sub","~/MV2");
  Silent(OFF);
  "%d\n",a;
  MVPrint("~/MV2/*");
  a=Del("~/MV/*.TXT",,,FALSE);
  "%d\n",a;
  MVPrint("~/MV/*");
  a=Del("~/MV/W.TXT.Z");
  "%d %d\n",a,Del("~/MV/None.TXT");
  Silent;
  a=DelTree("~/MV2");
  b=DelTree("~/MV");
  Silent(OFF);
  "%d %d %d %d\n",a,b,IsDir("~/MV2"),IsDir("~/MV");
}

MVChk;
