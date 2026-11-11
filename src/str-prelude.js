//Native V5.03 string formatting; OS-backed formats throw FmtHost.
import {SCALE_BYTES} from "./float-scale.js";
const scales=new DataView(Uint8Array.from(atob(SCALE_BYTES),ch=>ch.charCodeAt(0)).buffer);
const powers=Array.from({length:scales.byteLength/8},(_,i)=>
  "0x"+scales.getBigUint64(i*8,true).toString(16)).join(",");
export const STR_SRC=String.raw`
#define ì 0x7FF0000000000000(F64)
U64 __str_pow10[617]={${powers}};

F64 Pow10I64(I64 i)
{
  if (i>308) return ì;
  if (i<-308) return 0.0;
  return __str_pow10[i+308](F64);
}
#define PRTF_PAD_ZERO		0x001
#define PRTF_LEFT_JUSTIFY	0x002
#define PRTF_TRUNCATE		0x004
#define PRTF_COMMA		0x008
#define PRTF_DOLLAR		0x010
#define PRTF_SLASH		0x020
#define PRTF_QUESTION		0x040
#define PRTF_AUX_FMT_NUM	0x080
#define PRTF_DECIMAL		0x100
#define PRTF_NEG		0x200
#define PRTF_NEG_E		0x400
#define PRTF_NEG_AUX_FMT_NUM	0x800

U32 char_bmp_hex_numeric[16]=
{0,0x03FF0000,0x7E,0x7E,0,0,0,0,0,0,0,0,0,0,0,0};

U64 ModU64(U64 *_q,U64 d)
{
  U64 res=*_q%d;
  *_q/=d;
  return res;
}

I64 ToUpper(U8 ch)
{
  if ('a'<=ch<='z') ch+='A'-'a';
  return ch;
}

U8 *StrNew(U8 *buf,CTask *mem_task=NULL)
{//Accepts a $LK,"CTask",A="MN:CTask"$ or $LK,"CHeapCtrl",A="MN:CHeapCtrl"$.  NULL allocs off current task's heap.
  U8 *res;
  I64 size;
  if (buf) {
    size=StrLen(buf)+1;
    res=MAlloc(size,mem_task);
    MemCpy(res,buf,size);
  } else {
    res=MAlloc(1,mem_task);
    *res=0;
  }
  return res;
}

U8 *LstSub(I64 sub,U8 *lst)
{//Point to lst entry.
//Not efficient.  Use an array of U8 ptrs for efficiency.
  if (!lst) return NULL;
  while (*lst && sub>0) {
    while (*lst)	//Advance to end of cur entry.
      lst++;
    lst++;		//Skip trailing zero.
    if (*lst=='@')	//Check for '@' alias lst entry.
      lst++;
    else
      sub--;
  }
  if (sub || !*lst)
    return NULL;
  else
    return lst;
}

U0 SPutChar(U8 **_dst,U8 ch,U8 **_buf)
{
  I64 i;
  U8 *dst=*_dst,*buf;
  if (_buf) {
    buf=*_buf;
    i=dst-buf;
    if (i>=MSize(buf)) {
      buf=MAlloc(i<<1+1);
      MemCpy(buf,*_buf,i);
      Free(*_buf);
      dst=buf+i;
      *_buf=buf;
    }
  }
  *dst++=ch;
  *_dst=dst;
}

U0 OutStr(U8 *ptr,U8 **_buf,U8 **_dst,I64 len,I64 flags)
{
  I64 i,j;
  if (!ptr)
    i=0;
  else
    i=StrLen(ptr);
  if (flags&PRTF_TRUNCATE && i>len)
    i=len;
  if (flags&PRTF_LEFT_JUSTIFY) {
    for (j=0;j<i;j++)
      SPutChar(_dst,*ptr++,_buf);
    for (j=0;j<len-i;j++)
      SPutChar(_dst,CH_SPACE,_buf);
  } else {
    for (j=0;j<len-i;j++)
      SPutChar(_dst,CH_SPACE,_buf);
    for (j=len-i;j<len;j++)
      SPutChar(_dst,*ptr++,_buf);
  }
}

U8 *MPrintQ(U8 *ptr,I64 flags)
{
  U8 **_buf,*buf,**_dst,*dst,buf2[8],*ptr2;
  I64 ch;
  buf=MAlloc(STR_LEN);
  _buf=&buf;
  dst=buf;
  _dst=&dst;
  try {
    if (ptr)
      while (ch=*ptr++) {
	switch (ch) {
	  case '$$':
	    if (flags&PRTF_DOLLAR) {
	      SPutChar(_dst,'\\',_buf);
	      SPutChar(_dst,'d',_buf);
	    } else {
	      SPutChar(_dst,ch,_buf);
	      SPutChar(_dst,ch,_buf);
	    }
	    break;
	  case '%':
	    SPutChar(_dst,ch,_buf);
	    if (flags&PRTF_SLASH)
	      SPutChar(_dst,ch,_buf);
	    break;
	  case '\n':
	    SPutChar(_dst,'\\',_buf);
	    SPutChar(_dst,'n',_buf);
	    break;
	  case '\r':
	    SPutChar(_dst,'\\',_buf);
	    SPutChar(_dst,'r',_buf);
	    break;
	  case '\t':
	    SPutChar(_dst,'\\',_buf);
	    SPutChar(_dst,'t',_buf);
	    break;
	  case '"':
	  case '\\':
	    SPutChar(_dst,'\\',_buf);
	    SPutChar(_dst,ch,_buf);
	    break;
	  default:
	    if (ch>=CH_SHIFT_SPACE && ch!=0x7F)
	      SPutChar(_dst,ch,_buf);
	    else {
	      StrPrint(buf2,"\\x%02X",ch);
	      ptr2=buf2;
	      while (*ptr2)
		SPutChar(_dst,*ptr2++,_buf);
	    }
	}
      }
    SPutChar(_dst,0,_buf);
    return buf;
  } catch {
    Free(buf);
  }
}

U8 *MPrintq(U8 *ptr,I64 flags)
{
  U8 **_buf,*buf,**_dst,*dst;
  I64 i,j,ch,ch1;
  buf=MAlloc(STR_LEN);
  _buf=&buf;
  dst=buf;
  _dst=&dst;
  try {
    if (ptr)
      while (ch=*ptr++) {
	ch1=*ptr;
	switch (ch) {
	  case '\\':
	    switch (ch1) {
	      start:
		case '0':
		  SPutChar(_dst,0,_buf);
		  break;
		case '\'':
		  SPutChar(_dst,'\'',_buf);
		  break;
		case 0x60:
		  SPutChar(_dst,0x60,_buf);
		  break;
		case '"':
		  SPutChar(_dst,'"',_buf);
		  break;
		case '\\':
		  SPutChar(_dst,'\\',_buf);
		  break;
		case 'd':
		  SPutChar(_dst,'$$',_buf);
		  break;
		case 'n':
		  SPutChar(_dst,'\n',_buf);
		  break;
		case 'r':
		  SPutChar(_dst,'\r',_buf);
		  break;
		case 't':
		  SPutChar(_dst,'\t',_buf);
		  break;
	      end:
		ptr++;
		break;

	      case 'x':
	      case 'X':
		i=0;
		ptr++;
		for (j=0;j<2;j++) {
		  ch1=ToUpper(*ptr++);
		  if (Bt(char_bmp_hex_numeric,ch1)) {
		    if (ch1<='9')
		      i=i<<4+ch1-'0';
		    else
		      i=i<<4+ch1-'A'+10;
		  } else {
		    ptr--;
		    break;
		  }
		}
		SPutChar(_dst,i,_buf);
		break;

	      default:
		SPutChar(_dst,ch,_buf);
	    }
	    break;
	  case '$$':
	    SPutChar(_dst,ch,_buf);
	    if (ch1=='$$')
	      ptr++;
	    break;
	  case '%':
	    SPutChar(_dst,ch,_buf);
	    if (flags&PRTF_SLASH && ch1=='%')
	      ptr++;
	    break;
	  default:
	    SPutChar(_dst,ch,_buf);
	}
      }
    SPutChar(_dst,0,_buf);
    return buf;
  } catch {
    Free(buf);
  }
}

U8 *sys_pos_pows_lets=" KMGTPEZY",
   *sys_neg_pows_lets=" mænpfazy",
   *sys_pos_pows_lst="kilo\0mega\0giga\0tera\0peta\0exa\0zetta\0yotta\0",
   *sys_neg_pows_lst="milli\0micro\0nano\0pico\0femto\0atto\0zepto\0yocto\0";

#define TMP_BUF_LEN	256
#define SLOP		8

U8 *StrPrintJoin(U8 *dst,U8 *fmt,I64 argc,I64 *argv)
{/*$LK,"Print(\"\") Fmt Strings",A="FI:::/Doc/Print.DD"$
In float formatting, do not exceed 18-digits
before or after the decimal point
because the numbers before and after
the decimal point are stored
in 64-bits.  Use exponentiated forms
to avoid this.
*/
  I64 i,j,l,ch,k,k0,n,n0,len,dec_len,flags,
	aux_fmt_num,comma_cnt,comma_fmt_cnt,cur_arg=0;
  U64 m;
  F64 d,d1;
  U8 *ptr,*owned=NULL,**_buf,*buf,**_dst,tmp_buf[TMP_BUF_LEN];

  if (!fmt)
    throw('StrPrint');
  if (dst) {
    _buf=NULL;
    buf=dst;
  } else {
    buf=MAlloc(STR_LEN);
    _buf=&buf;
    dst=buf;
  }
  _dst=&dst;

  try {
    while (ch=*fmt++) {
      if (ch=='%') {
	flags=0;
	if (*fmt=='-') {
	  flags|=PRTF_LEFT_JUSTIFY;
	  fmt++;
	}
	if (*fmt=='0') {
	  flags|=PRTF_PAD_ZERO;
	  fmt++;
	}
	len=0;
	while ('0'<=*fmt<='9')
	  len=len*10+ *fmt++ -'0';
	if (*fmt=='*') {
	  fmt++;
	  if (cur_arg>=argc)
	    throw('StrPrint');
	  len=argv[cur_arg++];
	}
	dec_len=0;
	if (*fmt=='.') {
	  fmt++;
	  while ('0'<=*fmt<='9')
	    dec_len=dec_len*10+ *fmt++ -'0';
	  if (*fmt=='*') {
	    fmt++;
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    dec_len=argv[cur_arg++];
	  }
	  flags|=PRTF_DECIMAL;
	}

	aux_fmt_num=0;
	while (TRUE) {
	  switch (*fmt) {
	    start:
	      case '$$':
		flags|=PRTF_DOLLAR;
		break;
	      case '/':
		flags|=PRTF_SLASH;
		break;
	      case ',':
		flags|=PRTF_COMMA;
		break;
	      case 't':
		flags|=PRTF_TRUNCATE;
		break;
	      case 'l': //harmless
		break;
	    end:
	      fmt++;
	      break;

	    case 'h':
	      fmt++;
	      flags|=PRTF_AUX_FMT_NUM;
	      if (*fmt=='?') {
		fmt++;
		flags|=PRTF_QUESTION;
	      } else {
		if (*fmt=='*') {
		  fmt++;
		  if (cur_arg>=argc)
		    throw('StrPrint');
		  aux_fmt_num=argv[cur_arg++];
		} else {
		  if (*fmt=='-') {
		    fmt++;
		    flags|=PRTF_NEG_AUX_FMT_NUM;
		  }
		  while ('0'<=*fmt<='9')
		    aux_fmt_num=aux_fmt_num*10+ *fmt++ -'0';
		  if (flags&PRTF_NEG_AUX_FMT_NUM)
		    aux_fmt_num=-aux_fmt_num;
		}
	      }
	      break;
	    default:
	      goto sp_arg;
	  }
	}

sp_arg:
	k=0;
	switch (*fmt++) {
	  start:
	    case 'Q':
	      if (cur_arg>=argc)
		throw('StrPrint');
	      ptr=owned=MPrintQ(argv[cur_arg++],flags);
	      break;
	    case 'q':
	      if (cur_arg>=argc)
		throw('StrPrint');
	      ptr=owned=MPrintq(argv[cur_arg++],flags);
	      break;
	  end:
	    OutStr(ptr,_buf,_dst,len,flags);
	    Free(owned);owned=NULL;
	    break;

	  start:
	    case 's':
	      if (cur_arg>=argc)
		throw('StrPrint');
	      ptr=argv[cur_arg++];
	      break;
	    case 'z':
	      if (cur_arg+1>=argc)
		throw('StrPrint');
	      ptr=LstSub(argv[cur_arg],argv[cur_arg+1]);
	      cur_arg=cur_arg+2;
	      break;
	  end:
	    OutStr(ptr,_buf,_dst,len,flags);
	    break;

	  start:
	    case 'c':
	      if (cur_arg>=argc)
		throw('StrPrint');
	      tmp_buf[0](I64)=argv[cur_arg++];
	      tmp_buf[8]=0;
	      break;
	    case 'C':
	      if (cur_arg>=argc)
		throw('StrPrint');
	      tmp_buf[0](I64)=argv[cur_arg++];
	      tmp_buf[8]=0;
	      ptr=tmp_buf;
	      while (*ptr) {
		*ptr=ToUpper(*ptr);
		ptr++;
	      }
	      break;
	  end:
	    if (!(flags&PRTF_AUX_FMT_NUM))
	      aux_fmt_num=1;
	    while (aux_fmt_num-->0)
	      OutStr(tmp_buf,_buf,_dst,len,flags);
	    break;

	  case 'F':
	  case 'D':
	  case 'T':
	  case 'S':
	  case 'Z':
	  case 'p':
	  case 'P':
	    throw('FmtHost',TRUE);
	  case 'd':
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    m=argv[cur_arg++];
	    if (m(I64)<0) {
	      flags|=PRTF_NEG;
	      m=-m;
	    }
sp_out_dec:
	    if (flags&PRTF_AUX_FMT_NUM) {
	      if (!len) len=12;
	      d=m;
	      goto sp_out_eng;
	    }
	    if (flags&PRTF_COMMA) {
	      comma_fmt_cnt=comma_cnt=3;
	      do {
		tmp_buf[k++]=ModU64(&m,10)+'0';
		if (!m) break;
		if (!--comma_cnt) {
		  tmp_buf[k++]=',';
		  comma_cnt=3;
		}
	      } while (k<TMP_BUF_LEN-SLOP);
sp_out_comma_num:
	      if (flags&PRTF_NEG)
		i=1;
	      else
		i=0;
	      if (len<0)
		len=0;
	      if (flags&PRTF_TRUNCATE && k+i>len)
		k=len-i;
	      if (k<0)
		k=0;
	      if (flags&PRTF_PAD_ZERO) {
		if (flags&PRTF_NEG)
		  SPutChar(_dst,'-',_buf);
		comma_cnt=(len-k-i+comma_fmt_cnt-comma_cnt+1)
		%(comma_fmt_cnt+1)+1;
		for (;i<len-k;i++) {
		  if (!--comma_cnt) {
		    SPutChar(_dst,',',_buf);
		    comma_cnt=comma_fmt_cnt;
		    if (++i>=len-k)
		      break;
		  }
		  SPutChar(_dst,'0',_buf);
		}
	      } else {
		for (;i<len-k;i++)
		  SPutChar(_dst,CH_SPACE,_buf);
		if (flags&PRTF_NEG)
		  SPutChar(_dst,'-',_buf);
	      }
	    } else {
	      do {
		tmp_buf[k++]=ModU64(&m,10)+'0';
		if (!m) break;
	      } while (k<TMP_BUF_LEN-SLOP);
sp_out_num:
	      if (flags&PRTF_NEG)
		i=1;
	      else
		i=0;
	      if (len<0)
		len=0;
	      if (flags&PRTF_TRUNCATE && k+i>len)
		k=len-i;
	      if (k<0)
		k=0;
	      if (flags&PRTF_PAD_ZERO) {
		if (flags&PRTF_NEG)
		  SPutChar(_dst,'-',_buf);
		for (;i<len-k;i++)
		  SPutChar(_dst,'0',_buf);
	      } else {
		for (;i<len-k;i++)
		  SPutChar(_dst,CH_SPACE,_buf);
		if (flags&PRTF_NEG)
		  SPutChar(_dst,'-',_buf);
	      }
	    }
	    for (i=k-1;i>=0;i--)
	      SPutChar(_dst,tmp_buf[i],_buf);
	    break;
	  case 'u':
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    m=argv[cur_arg++];
	    goto sp_out_dec;
	  case 'f':
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    d=argv[cur_arg++](F64);
	    if (d<0) {
	      flags|=PRTF_NEG;
	      d=-d;
	    }

	    if (d==ì) {
sp_out_inf:
	      if (flags&PRTF_NEG)
		i=1;
	      else
		i=0;
	      k=1;
	      if (len<0)
		len=0;
	      if (flags&PRTF_TRUNCATE && k+i>len)
		k=len-i;
	      if (k<0)
		k=0;
	      for (;i<len-k;i++)
		SPutChar(_dst,CH_SPACE,_buf);
	      if (flags&PRTF_NEG)
		SPutChar(_dst,'-',_buf);
	      for (i=0;i<k;i++)
		SPutChar(_dst,'ì',_buf);
	      break;
	    }

sp_out_f:
	    if (dec_len<0)
	      dec_len=0;
	    n=Log10(d);
	    if (i=dec_len) {
	      if (flags&PRTF_COMMA)
		i=i-i/4;
	      if (n+i>17) {
		n+=i-17;
		d*=Pow10I64(i-n);
	      } else {
		n=0;
		d*=Pow10I64(i);
	      }
	      i=dec_len;
	    } else if (n>17) {
	      n-=17;
	      d*=Pow10I64(-n);
	    } else
	      n=0;

	    m=Round(d);
	    if (flags&PRTF_COMMA) {
	      comma_cnt=i&3;
	      while (i-- && k<TMP_BUF_LEN-SLOP) {
		if (i>2 && !comma_cnt--) {
		  tmp_buf[k++]=',';
		  comma_cnt=2;
		  if (!--i) break;
		}
		if (n) {
		  n--;
		  tmp_buf[k++]='0';
		} else
		  tmp_buf[k++]=ModU64(&m,10)+'0';
		if (!i) break;
	      }
	    } else {
	      while (i-- && k<TMP_BUF_LEN-SLOP) {
		if (n) {
		  n--;
		  tmp_buf[k++]='0';
		} else
		  tmp_buf[k++]=ModU64(&m,10)+'0';
	      }
	    }
	    if (dec_len)
	      tmp_buf[k++]='.';
	    if (flags&PRTF_COMMA) {
	      comma_cnt=3;
	      do {
		if (n) {
		  n--;
		  tmp_buf[k++]='0';
		} else
		  tmp_buf[k++]=ModU64(&m,10)+'0';
		if (!m) break;
		if (!--comma_cnt) {
		  tmp_buf[k++]=',';
		  comma_cnt=3;
		}
	      } while (k<TMP_BUF_LEN-SLOP);
	    } else {
	      do {
		if (n) {
		  n--;
		  tmp_buf[k++]='0';
		} else
		  tmp_buf[k++]=ModU64(&m,10)+'0';
		if (!m) break;
	      } while (k<TMP_BUF_LEN-SLOP);
	    }
	    goto sp_out_num;
	  case 'e':
	    if (!len) len=12;
	    flags|=PRTF_TRUNCATE;

	    if (cur_arg>=argc)
	      throw('StrPrint');
	    d=argv[cur_arg++](F64);
	    if (d<0) {
	      flags|=PRTF_NEG;
	      d=-d;
	    }
	    if (d==ì) goto sp_out_inf;

	    if (d)
	      n=Floor(Log10(d));
	    else
	      n=0;
sp_out_e:
	    d/=Pow10I64(n);

	    k0=k;
	    for (l=0;l<2;l++) {
	      n0=n;
	      if (n<0) {
		n=-n;
		flags|=PRTF_NEG_E;
	      } else
		flags&=~PRTF_NEG_E;

	      i=3;
	      do tmp_buf[k++]=ModU64(&n,10)+'0';
	      while (n && i--);
	      if (flags&PRTF_NEG_E)
		tmp_buf[k++]='-';
	      tmp_buf[k++]='e';
	      dec_len=len-k-2;
	      if (flags&PRTF_NEG)
		dec_len--;

	      if (d) {
		d1=d+Pow10I64(-dec_len)/2;
		if (d1<1.0) {
		  d*=10;
		  n=n0-1;
		  k=k0;
		} else if (d1>=10) {
		  d/=10;
		  n=n0+1;
		  k=k0;
		} else
		  break;
	      } else
		break;
	    }

	    goto sp_out_f;
	  case 'g':
	    if (!len) len=12;
	    flags|=PRTF_TRUNCATE;
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    d=argv[cur_arg++](F64);
	    if (d<0) {
	      flags|=PRTF_NEG;
	      d=-d;
	    }
	    if (d==ì) goto sp_out_inf;
	    if (d)
	      n=Floor(Log10(d));
	    else
	      n=0;
	    if (n>=len-1-dec_len || n<-(dec_len-1))
	      goto sp_out_e;
	    else
	      goto sp_out_f;
	  case 'n':
	    if (!len) len=12;
	    flags|=PRTF_TRUNCATE;
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    d=argv[cur_arg++](F64);
	    if (d<0) {
	      flags|=PRTF_NEG;
	      d=-d;
	    }
sp_out_eng: //Engineering notation
	    if (d==ì) goto sp_out_inf;
	    if (d)
	      n=FloorI64(Floor(Log10(d)),3);
	    else
	      n=0;
	    d/=Pow10I64(n);

	    if (n<0) {
	      n=-n;
	      flags|=PRTF_NEG_E;
	    }
	    if (flags&PRTF_AUX_FMT_NUM && -24<=n<=24) {
	      if (flags&PRTF_QUESTION) {
		if (flags&PRTF_NEG_E)
		  i=-n/3;
		else
		  i=n/3;
		j=0;
	      } else {
		if (flags&PRTF_NEG_E)
		  j=-n-aux_fmt_num;
		else
		  j=n-aux_fmt_num;
		d*=Pow10I64(j);
		i=aux_fmt_num/3;
	      }
	      if (i<0)
		tmp_buf[k++]=sys_neg_pows_lets[-i];
	      else if (i>0)
		tmp_buf[k++]=sys_pos_pows_lets[i];
	      else if (len!=0)
		tmp_buf[k++]=CH_SPACE;
	      if (!(flags&PRTF_DECIMAL)) {
		dec_len=len-k-2;
		if (flags&PRTF_NEG)
		  dec_len--;
		if (j>0) {
		  if (flags&PRTF_COMMA)
		    dec_len-=4*j/3;
		  else
		    dec_len-=j;
		}
		d1=d+Pow10I64(-dec_len+1)/2;
		if (d1>=10) {
		  dec_len--;
		  if (d1>=100)
		    dec_len--;
		}
	      }
	    } else {
	      i=3;
	      do tmp_buf[k++]=ModU64(&n,10)+'0';
	      while (n && i--);
	      if (flags&PRTF_NEG_E)
		tmp_buf[k++]='-';
	      tmp_buf[k++]='e';
	      if (!dec_len) {
		dec_len=len-k-2;
		if (flags&PRTF_NEG)
		  dec_len--;
		d1=d+Pow10I64(-dec_len+1)/2;
		if (d1>=10) {
		  dec_len--;
		  if (d1>=100)
		    dec_len--;
		}
	      }
	    }
	    if (flags&PRTF_COMMA) {
	      if (len && dec_len>0 && !(dec_len&3))
		tmp_buf[k++]=',';
	      dec_len-=dec_len/4;
	    }
	    goto sp_out_f;
	  case 'X':
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    m=argv[cur_arg++];
	    if (flags&PRTF_COMMA) {
	      comma_fmt_cnt=comma_cnt=4;
	      do {
		tmp_buf[k]= m&15 +'0';
		if (tmp_buf[k]>'9') tmp_buf[k]+='A'-0x3A;
		k++;
		m>>=4;
		if (!m) break;
		if (!--comma_cnt) {
		  tmp_buf[k++]=',';
		  comma_cnt=4;
		}
	      } while (k<TMP_BUF_LEN-SLOP);
	      goto sp_out_comma_num;
	    } else {
	      do {
		tmp_buf[k]= m&15 +'0';
		if (tmp_buf[k]>'9') tmp_buf[k]+='A'-0x3A;
		k++;
		m>>=4;
	      } while (m && k<TMP_BUF_LEN-SLOP);
	      goto sp_out_num;
	    }
	  case 'x':
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    m=argv[cur_arg++];
	    if (flags&PRTF_COMMA) {
	      comma_fmt_cnt=comma_cnt=4;
	      do {
		tmp_buf[k]= m&15 +'0';
		if (tmp_buf[k]>'9') tmp_buf[k]+='a'-0x3A;
		k++;
		m>>=4;
		if (!m) break;
		if (!--comma_cnt) {
		  tmp_buf[k++]=',';
		  comma_cnt=4;
		}
	      } while (k<TMP_BUF_LEN-SLOP);
	      goto sp_out_comma_num;
	    } else {
	      do {
		tmp_buf[k]= m&15 +'0';
		if (tmp_buf[k]>'9') tmp_buf[k]+='a'-0x3A;
		k++;
		m>>=4;
	      } while (m && k<TMP_BUF_LEN-SLOP);
	      goto sp_out_num;
	    }
	  case 'b':
	  case 'B':
	    if (cur_arg>=argc)
	      throw('StrPrint');
	    m=argv[cur_arg++];
	    if (flags&PRTF_COMMA) {
	      comma_fmt_cnt=comma_cnt=4;
	      do {
		tmp_buf[k++]= m&1 +'0';
		m>>=1;
		if (!m) break;
		if (!--comma_cnt) {
		  tmp_buf[k++]=',';
		  comma_cnt=4;
		}
	      } while (k<TMP_BUF_LEN-SLOP);
	      goto sp_out_comma_num;
	    } else {
	      do {
		tmp_buf[k++]= m&1 +'0';
		m>>=1;
	      } while (m && k<TMP_BUF_LEN-SLOP);
	      goto sp_out_num;
	    }
	  case '%':
	    SPutChar(_dst,'%',_buf);
	    break;
	}
      } else
	SPutChar(_dst,ch,_buf);
    }
    SPutChar(_dst,0,_buf);
    return buf;
  } catch {
    Free(owned);
    if (_buf) Free(buf);
  }
}

U8 *StrPrint(U8 *dst,U8 *fmt,...)
{//See $LK,"StrPrintJoin",A="MN:StrPrintJoin"$().
  return StrPrintJoin(dst,fmt,argc,argv);
}

U8 *CatPrint(U8 *_dst,U8 *fmt,...)
{//StrCat().  See $LK,"StrPrintJoin",A="MN:StrPrintJoin"$().
  U8 *dst=_dst;
  while (*dst)
    dst++;
  StrPrintJoin(dst,fmt,argc,argv);
  return _dst;
}

U0 PutS(U8 *s)
{//Present formatted text through the host's DolDoc adapter.
  __puts(s);
}

U0 Print(U8 *fmt,...)
{//Format text for the host output stream.
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  PutS(buf);
  Free(buf);
}

U8 *MStrPrint(U8 *fmt,...)
{//MAlloc StrPrint.  See $LK,"StrPrintJoin",A="MN:StrPrintJoin"$().
  U8 *res,*buf=StrPrintJoin(NULL,fmt,argc,argv);
  try res=StrNew(buf);
  catch Free(buf);
  Free(buf);
  return res;
}

public I64 GrPrint(CDC *dc=gr.dc,I64 x,I64 y,U8 *fmt,...)
{//2D. Clipping but not transformation.
  I64 res;
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  try res=GrPutS(dc,x,y,buf);
  catch Free(buf);
  Free(buf);
  return res;
}

public I64 GrPrint3(CDC *dc=gr.dc,I64 x,I64 y,I64 z,U8 *fmt,...)
{//3D. Transformation. DCF_SYMMETRY is silly.
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  I64 res;
  try {
    if (dc->flags & DCF_TRANSFORMATION)
      (*dc->transform)(dc,&x,&y,&z);
    res=GrPrint(dc,x,y,"%s",buf);
  } catch Free(buf);
  Free(buf);
  return res;
}
#define SUF_REM_CTRL_CHARS	0x001
#define SUF_REM_LEADING		0x002
#define SUF_REM_TRAILING	0x004
#define SUF_REM_SPACES		0x008
#define SUF_SINGLE_SPACE	0x010
#define SUF_TO_UPPER		0x020
#define SUF_TO_LOWER		0x040
#define SUF_S2T			0x080
#define SUF_T2S			0x100 //Only works with MStrUtil
#define SUF_SCALE_INDENT	0x200
#define SUF_SAFE_DOLLAR		0x400

U32 char_bmp_white_space[16]=
{0x80002600,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0},
  char_bmp_safe_dollar[16]=
{0x80000000,0xFFFFFFEF,0xFFFFFFFF,0x7FFFFFFF,
0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0,0,0,0,0,0,0,0};

I64 Spaces2Tabs(U8 *dst,U8 *src)
{//Src buf with spaces to dst buf without.
  U8 *src2;
  I64 chged=0,space_cnt,space_cnt2,col=0;
  if (*src)
    while (TRUE) {
      src2=src;
      while (*src2==CH_SPACE)
	src2++;
      space_cnt=src2-src;
      while (col+space_cnt>=8) {
	space_cnt2=8-col;
	if (space_cnt2==1)
	  *dst++=CH_SPACE;
	else {
	  *dst++='\t';
	  chged+=space_cnt2-1;
	}
	space_cnt-=space_cnt2;
	col=0;
      }
      if (*src2=='\t') {
	if (space_cnt==1 && col==7)
	  *dst++=CH_SPACE;
	else
	  chged+=space_cnt;
	*dst++='\t';
	col=0;
      } else {
	while (space_cnt--) {
	  *dst++=CH_SPACE;
	  if (++col==8)
	    col=0;
	}
	if (*src2) {
	  *dst++=*src2;
	  if (++col==8)
	    col=0;
	} else
	  break;
      }
      src=++src2;
    }
  *dst=0;
  return chged;
}

U8 *StrUtil(U8 *_src,I64 flags)
{//Modifies in place. See $LK,"flags",A="MN:SUF_REM_SPACES"$ for all the options.
  U8 *src=_src,*dst=_src;
  I64 ch;

  if (flags & SUF_REM_LEADING)
    while (Bt(char_bmp_white_space,*src))
      src++;
  while (ch=*src++)
    if (Bt(char_bmp_white_space,ch)) {
      if (!(flags & SUF_REM_SPACES)) {
	if (flags & SUF_SINGLE_SPACE) {
	  *dst++ = CH_SPACE;
	  while ((ch=*src++) && Bt(char_bmp_white_space,ch));
	  src--;
	} else
	  *dst++ = ch;
      }
    } else if (!(flags & SUF_REM_CTRL_CHARS) || ch>=CH_SHIFT_SPACE)
      *dst++=ch;
  *dst=0;

  if (flags & SUF_REM_TRAILING)
    while (dst!=_src && (!*dst || Bt(char_bmp_white_space,*dst)))
      *dst-- =0;
  if (flags & SUF_TO_UPPER)
    for (dst=_src;*dst;dst++) {
      ch=*dst;
      if ('a'<=ch<='z')
	*dst=ch-0x20;
    }
  if (flags & SUF_TO_LOWER)
    for (dst=_src;*dst;dst++) {
      ch=*dst;
      if ('A'<=ch<='Z')
	*dst=ch+0x20;
    }
  if (flags & SUF_SAFE_DOLLAR)
    for (dst=_src;*dst;dst++) {
      ch=*dst;
      if (!Bt(char_bmp_safe_dollar,*dst))
	*dst='.';
    }
  if (flags & SUF_S2T)
    Spaces2Tabs(_src,_src);
  return _src;
}

I64 StrOcc(U8 *src,I64 ch)
{//Count occurrences of a char.
  I64 i=0;
  if (!src) return 0;
  while (*src)
    if (*src++==ch)
      i++;
  return i;
}

U8 *StrFirstOcc(U8 *src,U8 *marker)
{//Point to 1st occurrence of marker set in str.
  I64 ch;
  while ((ch=*src++) && !StrOcc(marker,ch));
  if (ch)
    return src-1;
  else
    return NULL;
}

U8 *StrFirstRem(U8 *src,U8 *marker,U8 *dst=NULL)
{//Remove first str segment and place in dst buf or NULL.
  I64 ch;
  U8 *ptr=src,*res=dst;
  if (dst) {
    while ((ch=*ptr++) && !StrOcc(marker,ch))
      *dst++=ch;
    *dst=0;
  } else
    while ((ch=*ptr++) && !StrOcc(marker,ch));
  if (ch)
    StrCpy(src,ptr);
  else
    *src=0;
  return res;
}

U8 *StrLastOcc(U8 *src,U8 *marker)
{//Point to last occurrence of marker set in str.
  I64 ch;
  U8 *res=NULL;
  while (ch=*src++)
    if (StrOcc(marker,ch))
      res=src-1;
  return res;
}

U8 *StrLastRem(U8 *src,U8 *marker,U8 *dst=NULL)
{//Remove last str segment and place in dst buf or NULL.
  U8 *ptr;
  if (ptr=StrLastOcc(src,marker)) {
    if (dst)
      StrCpy(dst,ptr+1);
    *ptr=0;
  } else {
    if (dst)
      StrCpy(dst,src);
    *src=0;
  }
  return dst;
}

U8 *Tabs2Spaces(U8 *src)
{//MAlloc a string with tabs expanded to spaces.
  I64 ch,i,j,l=StrLen(src)<<1+2,col=0;
  U8 *dst=MAlloc(l),*tmp;
  try {
    while (ch=*src++) {
      if (ch=='\t') {
	j=(col+8)&~7;
	for (i=col;i<j;i++) {
	  dst[i]=CH_SPACE;
	  if (i>=l-2) {
	    tmp=MAlloc(l<<1);
	    MemCpy(tmp,dst,i+1);
	    Free(dst);
	    l<<=1;
	    dst=tmp;
	  }
	}
	col=j;
      } else {
	dst[col]=ch;
	if (col>=l-2) {
	  tmp=MAlloc(l<<1);
	  MemCpy(tmp,dst,col+1);
	  Free(dst);
	  l<<=1;
	  dst=tmp;
	}
	col++;
      }
    }
    dst[col]=0;
  } catch
    Free(dst);
  return dst;
}

U8 *ScaleIndent(U8 *src,F64 indent_scale_factor)
{//MAlloc a string with scaled leading whitespace.
  I64 ch,i,col=0;
  U8 *dst,*dst2;
  while (ch=*src++) {
    if (ch=='\t')
      col=(col+8)&-0x8;
    else if (ch==CH_SPACE)
      col++;
    else
      break;
  }
  src--;
  col=Round(indent_scale_factor*col);
  dst=dst2=MAlloc(StrLen(src)+col/8+col&7+1);
  for (i=col/8;i>0;i--)
    *dst2++='\t';
  for (i=col&7;i>0;i--)
    *dst2++=CH_SPACE;
  StrCpy(dst2,src);
  return dst;
}

U8 *MStrUtil(U8 *src,I64 flags,F64 indent_scale_factor=0)
{//MAlloc a transformed and shortened string.
  U8 *dst=StrNew(src),*res,*tmp;
  try {
    StrUtil(dst,flags);
    if (flags&SUF_T2S) {
      tmp=Tabs2Spaces(dst);
      Free(dst);
      dst=tmp;
    }
    if (flags&SUF_SCALE_INDENT)
      res=ScaleIndent(dst,indent_scale_factor);
    else
      res=StrNew(dst);
  } catch
    Free(dst);
  Free(dst);
  return res;
}
`;
