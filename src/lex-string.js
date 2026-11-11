//Native string chunks over finite lexical byte streams.
export const LEX_STRING_SRC=String.raw`
I64 LexInStr(CCmpCtrl *cc,U8 *buf,I64 size,Bool *done)
{//Decode one caller-owned string chunk, retaining native stream state.
  I64 i=0,j,k,ch;
  *done=TRUE;
  while (i<size-1) {
    ch=LexGetChar(cc);
    if (!ch || ch=='"') {
      buf[i++]=0;
      return i;
    } else if (ch=='\\') {
      switch (ch=LexGetChar(cc)) {
	case '0':
	  buf[i++]=0;
	  break;
	case '\'':
	  buf[i++]='\'';
	  break;
	case '\`':
	  buf[i++]='\`';
	  break;
	case '\\':
	  buf[i++]='\\';
	  break;
	case '"':
	  buf[i++]='"';
	  break;
	case 'd':
	  buf[i++]='$$';
	  break;
	case 'n':
	  buf[i++]='\n';
	  break;
	case 'r':
	  buf[i++]='\r';
	  break;
	case 't':
	  buf[i++]='\t';
	  break;
	case 'x':
	case 'X':
	  j=0;
	  for (k=0;k<2;k++) {
	    ch=ToUpper(LexGetChar(cc));
	    if (Bt(char_bmp_hex_numeric,ch)) {
	      if (ch<='9')
		j=j<<4+ch-'0';
	      else
		j=j<<4+ch-'A'+10;
	    } else {
	      cc->flags|=CCF_USE_LAST_U16;
	      break;
	    }
	  }
	  buf[i++]=j;
	  break;
	default:
	  cc->flags|=CCF_USE_LAST_U16;
	  buf[i++]='\\';
      }
    } else if (ch=='$$') {
      buf[i++]='$$';
      if (cc->dollar_cnt)
	cc->dollar_cnt--;
      else if (LexGetChar(cc)!='$$') {
	cc->dollar_cnt=1;
	cc->flags|=CCF_USE_LAST_U16;
      }
    } else
      buf[i++]=ch;
  }
  *done=FALSE;
  return i;
}
`;
