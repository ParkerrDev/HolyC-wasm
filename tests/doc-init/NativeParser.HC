I64 PrsDocFlagSingle(CCmpCtrl *cc,I64 *_de_flags,U32 *_type,Bool turn_on)
{
  I64 res=-1;
  CHashGeneric *tmph;
  if (cc->token==TK_IDENT &&
	(tmph=HashFind(cc->cur_str,doldoc.hash,DHT_DOC_FLAG))) {
    res=tmph->user_data0;
    if (res<64) {
      BEqu(_de_flags,res,turn_on);
      switch (res) {
	case DOCEf_BLINK:
	case DOCEf_INVERT:
	case DOCEf_UNDERLINE:
	case DOCEf_SEL:
	  BEqu(_type,res,turn_on);
	  break;
      }
    }
    Lex(cc);	//skip flag
  }
  return res;
}

I64 PrsDocFlags(CCmpCtrl *cc,I64 *_de_flags,U32 *_type)
{
  I64 res=-1;
  Bool turn_on;
  while (TRUE) {
    if (cc->token=='+')
      turn_on=TRUE;
    else if (cc->token=='-')
      turn_on=FALSE;
    else
      break;
    Lex(cc);
    res=PrsDocFlagSingle(cc,_de_flags,_type,turn_on);
  }
  return res;
}
