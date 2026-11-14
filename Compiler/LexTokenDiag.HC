
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
