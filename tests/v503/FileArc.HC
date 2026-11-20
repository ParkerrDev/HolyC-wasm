U0 FileArc()
{
  U8 *st="In the beginning God created the heaven and the earth. "
	"And the earth was without form, and void; and the earth.",*buf;
  I64 size,attr;
  CArcCompress *arc=CompressBuf(st,StrLen(st));
  "%d %d\n",arc->compressed_size,arc->expanded_size;
  Free(arc);
  FileWrite("~/FileArc.DD.Z",st,StrLen(st));
  buf=FileRead("~/FileArc.DD.Z",&size,&attr);
  "%d %d %s\n",size,attr&RS_ATTR_COMPRESSED,buf;
  Free(buf);
  buf=FileRead("~/FileArc.DD",&size);
  "%d %s\n",size,buf;
  Free(buf);
}

FileArc;
