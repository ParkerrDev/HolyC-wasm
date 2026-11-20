U0 FFPrint(CDirEntry *tmpde,I64 depth=0)
{
  while (tmpde) {
    "%h*c%s %X %d %s\n",depth*2,' ',tmpde->name,tmpde->attr,
	  tmpde->size,tmpde->full_name;
    if (tmpde->sub)
      FFPrint(tmpde->sub,depth+1);
    tmpde=tmpde->next;
  }
}

U0 FFChk()
{
  CDirEntry *tmpde;
  I64 a,b;
  "%d%d%d%d%d%d\n",WildMatch("ABC.DD","*.DD"),WildMatch("ABC.DD","A?C*"),
	WildMatch("ABC.DD","*.HC"),WildMatch("","*"),WildMatch("AB","ABC"),
	WildMatch("XAXB","*A*B");
  a=FilesFindMatch("C:/Home/X.DD","*.HC;*.DD");
  b=FilesFindMatch("C:/Home/X.DD","*.HC;!*.DD;*");
  "%d%d",a,b;
  a=FilesFindMatch("C:/Home/X.DD.Z","*",FUF_JUST_TXT);
  b=FilesFindMatch("C:/Home/X.GR","*",FUF_JUST_TXT);
  "%d%d",a,b;
  a=FilesFindMatch("C:/Home/X.GR","*",FUF_JUST_GR);
  b=FilesFindMatch("C:/Home/X.GR","/Home/*");
  "%d%d\n",a,b;
  DirMk("~/FF");
  DirMk("~/FF/Sub");
  FileWrite("~/FF/Bee.TXT","Bee",3);
  FileWrite("~/FF/Ant.DD","Ant!",4);
  FileWrite("~/FF/Sub/Cat.DD","Cat..",5);
  FileWrite("~/FF/Sub/Dog.HC","Dog...",6);
  tmpde=FilesFind("~/FF/*");
  "%d\n",LinkedLstCnt(tmpde);
  FFPrint(tmpde);
  DirTreeDel(tmpde);
  tmpde=FilesFind("~/FF/*.DD*",FUF_RECURSE);
  FFPrint(tmpde);
  DirTreeDel(tmpde);
  tmpde=FilesFind("~/FF/*",FUF_RECURSE|FUF_JUST_FILES);
  FFPrint(tmpde);
  DirTreeDel(tmpde);
  tmpde=FilesFind("~/FF/*",FUF_RECURSE|FUF_JUST_DIRS);
  FFPrint(tmpde);
  DirTreeDel(tmpde);
  tmpde=FilesFind("~/FF/*",FUF_RECURSE|FUF_FLATTEN_TREE|FUF_JUST_SRC);
  FFPrint(tmpde);
  DirTreeDel(tmpde);
  tmpde=FilesFind("~/FF/Sub",FUF_SINGLE);
  FFPrint(tmpde);
  DirTreeDel(tmpde);
  Silent;
  tmpde=FilesFind("~/FF/None/*");
  Silent(OFF);
  "%d %s\n",tmpde,DirCur;
}

FFChk;
