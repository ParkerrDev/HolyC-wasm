//Finite byte-token scanning; native compiler and debugger capabilities stay explicit.
export const LEX_TOKEN_DATA_SRC=String.raw`
U32 char_bmp_dec_numeric[16]=
  {0,0x03FF0000,0,0,0,0,0,0,0,0,0,0,0,0,0,0};
`;

export const LEX_TOKEN_DIAG_SRC=String.raw`
U0 LexHostFail(CCmpCtrl *cc,U8 *reason,I64 code='Compiler')
{//Report host error data; native debugger and Adam diagnostics are unavailable.
  CLexFile *tmpf=NULL;
  U8 *filename=NULL;
  I64 line=0,offset=-1,col=-1,token=0,last_line=0;
  if (cc) {
    if (code=='Compiler') cc->error_cnt++;
    token=cc->token;
    last_line=cc->last_line_num;
    if (tmpf=cc->lex_include_stk) {
      filename=tmpf->full_name;
      line=tmpf->line_num;
      if (!(tmpf->flags&LFSF_DOC) && cc->cur_buf_ptr) {
	if (tmpf->buf) offset=cc->cur_buf_ptr-tmpf->buf;
	if (tmpf->line_start) col=cc->cur_buf_ptr-tmpf->line_start;
      }
    }
  }
  __lex_error(Fs,code,reason,filename,line,offset,col,token,last_line);
  throw(code);
}
`;

export const LEX_TOKEN_SRC=String.raw`
I64 Lex(CCmpCtrl *cc)
{//Fetch next token.
  I64 i,j,k,l,ch;
  CHash *tmph;
  Bool str_done,neg_e;
  U8 *buf2=NULL,*buf3=NULL,buf[STR_LEN];
  CLexFile *tmpf;
  if (!cc) LexHostFail(NULL,"Missing compiler control",'LexState');
  if (cc->flags&CCF_PMT)
    LexHostFail(cc,"Interactive input requires native execution",'LexCaps');
  if (!cc->lex_include_stk)
    LexHostFail(cc,"Missing source stream",'LexState');
  for (tmpf=cc->lex_include_stk;tmpf;tmpf=tmpf->next)
    if (tmpf->flags&LFSF_DOC)
      LexHostFail(cc,"Document input requires native execution",'LexCaps');
  try {
    cc->last_line_num=cc->lex_include_stk->line_num;
    while (TRUE) {
lex_cont:
      switch [ch=LexGetChar(cc)] {
	case 0:
	  return cc->token=TK_EOF;
	case TK_SUPERSCRIPT:
	  ch='>';
	  goto lex_ident;
	case TK_SUBSCRIPT:
	  ch='<';
	  goto lex_ident;
	case TK_NORMALSCRIPT:
	  ch='=';
	  goto lex_ident;
	case '@':
	  if (cc->flags&CCF_KEEP_AT_SIGN) {
	    cc->token=ch;
	    goto lex_end;
	  }
	case 'A'...'Z':
	case 'a'...'z':
	case '_':
	case 128...255:
lex_ident:
	  i=0;
	  buf[i++]=ch;
	  while (TRUE) {
	    if (i>=STR_LEN)
	      LexHostFail(cc,"Ident limited to STR_LEN chars at ");
	    else if (!(ch=LexGetChar(cc)))
	      break;
	    else if (Bt(cc->char_bmp_alpha_numeric,ch))
	      buf[i++]=ch;
	    else if (ch==TK_SUPERSCRIPT)
	      buf[i++]='>';
	    else if (ch==TK_SUBSCRIPT)
	      buf[i++]='<';
	    else if (ch==TK_NORMALSCRIPT)
	      buf[i++]='=';
	    else {
	      cc->flags|=CCF_USE_LAST_U16;
	      break;
	    }
	  }
	  buf[i++]=0;
	  tmph=NULL;
	  if (cc->htc.local_var_lst)
	    cc->local_var_entry=MemberFind(buf,cc->htc.local_var_lst);
	  else
	    cc->local_var_entry=NULL;
	  if (!cc->local_var_entry && cc->htc.hash_table_lst)
	    tmph=HashFind(buf,cc->htc.hash_table_lst,cc->htc.hash_mask);
	  if (tmph)
	    j=tmph->type;
	  else
	    j=0;
	  if (j & HTT_DEFINE_STR && !(cc->flags & CCF_NO_DEFINES)) {
	    buf2=StrNew(tmph(CHashDefineStr *)->data);
	    LexIncludeStr(cc,tmph->str,buf2,FALSE);
	    buf2=NULL;
	    cc->lex_include_stk->flags|=LFSF_DEFINE;
	  } else {
	    cc->hash_entry=tmph;
	    buf2=StrNew(buf);
	    Free(cc->cur_str);
	    cc->cur_str=buf2;
	    buf2=NULL;
	    cc->cur_str_len=i;
	    cc->token=TK_IDENT;
	    goto lex_end;
	  }
	  break;
	case '0'...'9':
	  i=ch-'0';
	  ch=ToUpper(LexGetChar(cc));
	  if (ch=='X') {
	    while (TRUE) {
	      ch=ToUpper(LexGetChar(cc));
	      if (Bt(char_bmp_hex_numeric,ch)) {
		if (ch<='9')
		  i=i<<4+ch-'0';
		else
		  i=i<<4+ch-'A'+10;
	      } else {
		cc->cur_i64=i;
		cc->flags|=CCF_USE_LAST_U16;
		cc->token=TK_I64;
		goto lex_end;
	      }
	    }
	  } else if (ch=='B') {
	    while (TRUE) {
	      ch=LexGetChar(cc);
	      if (ch=='0')
		i=i<<1;
	      else if (ch=='1')
		i=i<<1+1;
	      else {
		cc->cur_i64=i;
		cc->flags|=CCF_USE_LAST_U16;
		cc->token=TK_I64;
		goto lex_end;
	      }
	    }
	  }
	  while (TRUE) {
	    if (Bt(char_bmp_dec_numeric,ch))
	      i=i*10+ch-'0';
	    else {
	      if (ch=='.' || ch=='e' || ch=='E') break;
lex_is_int:
	      cc->cur_i64=i;
	      cc->flags|=CCF_USE_LAST_U16;
	      cc->token=TK_I64;
	      goto lex_end;
	    }
	    ch=LexGetChar(cc);
	  }
	  if (ch=='.') {
	    ch=LexGetChar(cc);
	    if (ch=='.') {
	      cc->flags|=CCF_LAST_WAS_DOT;
	      goto lex_is_int;
	    }
	  }
lex_float_start:
	  k=0;
	  while (TRUE) {
	    if (Bt(char_bmp_dec_numeric,ch)) {
	      i=i*10+ch-'0';
	      k++;
	    } else {
	      if (ch=='e' || ch=='E')
		break;
	      cc->cur_f64=i*Pow10I64(-k);
	      cc->flags|=CCF_USE_LAST_U16;
	      cc->token=TK_F64;
	      goto lex_end;
	    }
	    ch=LexGetChar(cc);
	  }
	  ch=LexGetChar(cc);
	  neg_e=FALSE;
	  if (ch=='-') {
	    neg_e=TRUE;
	    ch=LexGetChar(cc);
	  }
	  j=0;
	  while (TRUE) {
	    if (Bt(char_bmp_dec_numeric,ch))
	      j=j*10+ch-'0';
	    else {
	      if (neg_e)
		cc->cur_f64=i*Pow10I64(-j-k);
	      else
		cc->cur_f64=i*Pow10I64(j-k);
	      cc->flags|=CCF_USE_LAST_U16;
	      cc->token=TK_F64;
	      goto lex_end;
	    }
	    ch=LexGetChar(cc);
	  }
	  break;
	case '"':
	  cc->flags|=CCF_IN_QUOTES;
	  buf2=NULL;
	  i=0;
	  do {
	    j=LexInStr(cc,buf,STR_LEN,&str_done);
	    buf3=MAlloc(i+j);
	    if (buf2) {
	      MemCpy(buf3,buf2,i);
	      Free(buf2);
	    }
	    buf2=buf3;
	    buf3=NULL;
	    MemCpy(buf2+i,buf,j);
	    i+=j;
	  } while (!str_done);
	  buf3=MAlloc(i);
	  MemCpy(buf3,buf2,i);
	  Free(buf2);
	  buf2=NULL;
	  Free(cc->cur_str);
	  cc->cur_str=buf3;
	  buf3=NULL;
	  cc->cur_str_len=i;
	  cc->flags&=~CCF_IN_QUOTES;
	  cc->token=TK_STR;
	  goto lex_end;
	case '\'':
	  if (cc->flags&CCF_NO_CHAR_CONST)
	    break;
	  k=0;
	  for (j=0;j<8;j++) {
	    if (!(ch=LexGetChar(cc)) || ch=='\'')
	      break;
	    if (ch=='\\') {
	      switch (ch=LexGetChar(cc)) {
		case '0':	  k.u8[j]=0;	  break;
		case '\'':	  k.u8[j]='\'';   break;
		case 0x60:	  k.u8[j]=0x60;   break;
		case '"':	  k.u8[j]='"';	  break;
		case '\\':	  k.u8[j]='\\';   break;
		case 'd':	  k.u8[j]='$$';   break;
		case 'n':	  k.u8[j]='\n';   break;
		case 'r':	  k.u8[j]='\r';   break;
		case 't':	  k.u8[j]='\t';   break;
		case 'x':
		case 'X':
		  i=0;
		  for (l=0;l<2;l++) {
		    ch=ToUpper(LexGetChar(cc));
		    if (Bt(char_bmp_hex_numeric,ch)) {
		      if (ch<='9')
			i=i<<4+ch-'0';
		      else
			i=i<<4+ch-'A'+10;
		    } else {
		      cc->flags|=CCF_USE_LAST_U16;
		      break;
		    }
		  }
		  k.u8[j]=i;
		  break;
		default:
		  k.u8[j]='\\';
		  cc->flags|=CCF_USE_LAST_U16;
	      }
	    } else if (ch=='$$') {
	      ch=LexGetChar(cc);
	      k.u8[j]='$$';
	      if (ch!='$$')
		cc->flags|=CCF_USE_LAST_U16;
	    } else
	      k.u8[j]=ch;
	  }
	  if (ch!='\'' && (ch=LexGetChar(cc)) && ch!='\'')
	    LexHostFail(cc,"Char const limited to 8 chars at ");
	  cc->cur_i64=k;
	  cc->token=TK_CHAR_CONST;
	  goto lex_end;
	case '#':
	  if (cc->flags&CCF_KEEP_SIGN_NUM) {
	    cc->token=ch;
	    goto lex_end;
	  }
	  LexHostFail(cc,"Compiler directives require native execution",
		'LexCaps');
	  break;
	case '\n':
	  if (!(cc->flags&CCF_KEEP_NEW_LINES))
	    break; //else fall through
	case TK_INS_BIN:
	case TK_INS_BIN_SIZE:
	  cc->token=ch;
	  goto lex_end;
	case '.':
	  if (cc->flags&CCF_KEEP_DOT) {
	    cc->token=ch;
	    goto lex_end;
	  }
	  if (cc->flags&CCF_LAST_WAS_DOT) {
	    cc->flags&=~CCF_LAST_WAS_DOT;
	    goto lex_dot_dot;
	  }
	  ch=LexGetChar(cc);
	  if ('0'<=ch<='9') {
	    i=0;
	    goto lex_float_start;
	  } else if (ch=='.') {
lex_dot_dot:
	    cc->token=TK_DOT_DOT;
	    if (LexGetChar(cc)=='.')
	      cc->token=TK_ELLIPSIS;
	    else
	      cc->flags|=CCF_USE_LAST_U16;
	    goto lex_end;
	  }
	  cc->flags|=CCF_USE_LAST_U16;
	  cc->token='.';
	  goto lex_end;
	case '!':
	case '$$'...'&':
	case '('...'-':
	case '/':
	case ':'...'?':
	case '[':
	case ']'...'^':
	case '{'...'~':
	case 0x60:
	  if (!(i=cmp.dual_U16_tokens1[ch])) {
	    if (ch=='$$') {
	      ch=LexGetChar(cc);
	      if (ch=='$$') {
		cc->token='$$';
		goto lex_end;
	      } else if (ch) {
		do ch=LexGetChar(cc);
		while (ch && ch!='$$');
		if (!ch) {
		  cc->token=TK_EOF;
		  goto lex_end;
		} else
		  goto lex_cont;
	      } else {
		cc->flags|=CCF_USE_LAST_U16;
		cc->token='$$';
		goto lex_end;
	      }
	    } else {
	      cc->token=ch;
	      goto lex_end;
	    }
	  } else {
	    j=LexGetChar(cc);
	    if (i.u16[0]==j) {
	      i>>=16;
	      if (!i) {//Block comment.
		j=1;
		do {
		  if (!(ch=LexGetChar(cc)))
		    return cc->token=TK_EOF;
lex_check_comment:
		  if (ch=='*') {
		    if (!(ch=LexGetChar(cc)))
		      return cc->token=TK_EOF;
		    if (ch=='/')
		      j--;
		    else
		      goto lex_check_comment;
		  } else if (ch=='/') {
		    if (!(ch=LexGetChar(cc)))
		      return cc->token=TK_EOF;
		    if (ch=='*')
		      j++;
		    else
		      goto lex_check_comment;
		  }
		} while (j);
		goto lex_cont;
	      } else {
		cc->token=i;
		goto lex_end;
	      }
	    }
	    if (i=cmp.dual_U16_tokens2[ch]) {
	      if (i.u16[0]==j) {
		i>>=16;
		if (!i) {//Line comment.
		  LexSkipEol(cc);
		  if (cc->flags&CCF_KEEP_NEW_LINES) {
		    cc->token='\n';
		    goto lex_end;
		  } else
		    goto lex_cont;
		} else {
		  if (i==TK_SHL || i==TK_SHR) {
		    j=LexGetChar(cc);
		    if (j=='=') {
		      if (i==TK_SHL)
			i=TK_SHL_EQU;
		      else
			i=TK_SHR_EQU;
		    } else
		      cc->flags|=CCF_USE_LAST_U16;
		  }
		  cc->token=i;
		  goto lex_end;
		}
	      }
	      if (i=cmp.dual_U16_tokens3[ch]) {
		if (i.u16[0]==j) {
		  cc->token=i.u16[1];
		  goto lex_end;
		}
	      }
	    }
	    cc->flags|=CCF_USE_LAST_U16;
	    cc->token=ch;
	    goto lex_end;
	  }
	case TK_TKS_NUM:
	  break;
      }
    }
lex_end:
    LexGetChar(cc); //Do this so WAS_NEW_LINE is right
    cc->flags|=CCF_USE_LAST_U16;
    return cc->token;
  } catch {
    Free(buf2);
    Free(buf3);
  }
  return TK_EOF;
}
`;
