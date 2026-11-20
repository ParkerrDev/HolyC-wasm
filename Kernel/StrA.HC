//V5.03 Kernel/StrA.HC's compares are asm (LODSB from st2, SCASB on st1).
//These walk the same bytes in the same order and return -1, 0 or 1.

public I64 StrCmp(U8 *st1,U8 *st2)
{//Compare two strings.
  I64 ch;
  while (ch=*st2++) {
    if (ch!=*st1)
      goto sc_ne;
    st1++;
  }
  if (*st1)
    return 1;
  return 0;
sc_ne:
  if (ch>*st1)
    return -1;
  return 1;
}

public I64 StrNCmp(U8 *st1,U8 *st2,I64 n)
{//Compare N bytes in two strings.
  I64 ch;
  while (n--) {
    if (!(ch=*st2++)) {
      if (*st1)
	return 1;
      return 0;
    }
    if (ch!=*st1)
      goto sn_ne;
    st1++;
  }
  return 0;
sn_ne:
  if (ch>*st1)
    return -1;
  return 1;
}

public I64 StrICmp(U8 *st1,U8 *st2)
{//Compare two strings, ignoring case.
  I64 ch1,ch2;
  while (ch2=ToUpper(*st2++)) {
    ch1=ToUpper(*st1++);
    if (ch2!=ch1)
      goto si_ne;
  }
  if (*st1)
    return 1;
  return 0;
si_ne:
  if (ch2>ch1)
    return -1;
  return 1;
}

public I64 StrNICmp(U8 *st1,U8 *st2,I64 n)
{//Compare N bytes in two strings, ignoring case.
  I64 ch1,ch2;
  while (n--) {
    if (!(ch2=ToUpper(*st2++))) {
      if (*st1)
	return 1;
      return 0;
    }
    ch1=ToUpper(*st1++);
    if (ch2!=ch1)
      goto sni_ne;
  }
  return 0;
sni_ne:
  if (ch2>ch1)
    return -1;
  return 1;
}

//_STRMATCH and _STRIMATCH LODSB through the haystack for the needle's first
//byte, then compare the rest from there.

public U8 *StrMatch(U8 *needle,U8 *haystack_str)
{//Scan for string in string.
  I64 i;
  if (!haystack_str || !needle)
    return NULL;
  if (!*needle)
    return haystack_str;
  for (;*haystack_str;haystack_str++)
    if (*haystack_str==*needle) {
      for (i=1;needle[i] && needle[i]==haystack_str[i];i++);
      if (!needle[i])
	return haystack_str;
    }
  return NULL;
}

public U8 *StrIMatch(U8 *needle,U8 *haystack_str)
{//Scan for string in string, ignoring case.
  I64 i;
  if (!haystack_str || !needle)
    return NULL;
  if (!*needle)
    return haystack_str;
  for (;*haystack_str;haystack_str++)
    if (ToUpper(*haystack_str)==ToUpper(*needle)) {
      for (i=1;needle[i] && ToUpper(needle[i])==ToUpper(haystack_str[i]);i++);
      if (!needle[i])
	return haystack_str;
    }
  return NULL;
}

//Flags for StrFind
#define SFF_IGNORE_CASE		1
#define SFF_WHOLE_LABELS_BEFORE	2
#define SFF_WHOLE_LABELS_AFTER	4
#define SFG_WHOLE_LABELS	(SFF_WHOLE_LABELS_BEFORE|SFF_WHOLE_LABELS_AFTER)

U8 *StrFind(U8 *needle,U8 *haystack_str,I64 flags=0)
{//Find needle_str in haystack_str with options.
  Bool cont;
  U8 *saved_haystack_str=haystack_str;
  I64 plen=StrLen(needle);
  do {
    cont=FALSE;
    if (flags & SFF_IGNORE_CASE)
      haystack_str=StrIMatch(needle,haystack_str);
    else
      haystack_str=StrMatch(needle,haystack_str);
    if (haystack_str && flags & SFF_WHOLE_LABELS_BEFORE &&
	  haystack_str!=saved_haystack_str &&
	  Bt(char_bmp_alpha_numeric,*(haystack_str-1))) {
      haystack_str++;
      if (*haystack_str)
	cont=TRUE;
      else
	haystack_str=NULL;
    }
    if (haystack_str && flags & SFF_WHOLE_LABELS_AFTER &&
	  Bt(char_bmp_alpha_numeric,*(haystack_str+plen))) {
      haystack_str++;
      if (*haystack_str)
	cont=TRUE;
      else
	haystack_str=NULL;
    }
  } while (cont);
  return haystack_str;
}

Bool WildMatch(U8 *test_str,U8 *wild_str)
{//Wildcard match with '*' and '?'.
  I64 ch1,ch2;
  U8 *fall_back_src=NULL,*fall_back_wild=NULL;
  while (TRUE) {
    if (!(ch1=*test_str++)) {
      if (*wild_str && *wild_str!='*')
	return FALSE;
      else
	return TRUE;
    } else {
      if (!(ch2=*wild_str++))
	return FALSE;
      else {
	if (ch2=='*') {
	  fall_back_wild=wild_str-1;
	  fall_back_src=test_str;
	  if (!(ch2=*wild_str++))
	    return TRUE;
	  while (ch2!=ch1)
	    if (!(ch1=*test_str++))
	      return FALSE;
	} else
	  if (ch2!='?' && ch1!=ch2) {
	    if (fall_back_wild) {
	      wild_str=fall_back_wild;
	      test_str=fall_back_src;
	      fall_back_wild=NULL;
	      fall_back_src=NULL;
	    } else
	      return FALSE;
	  }
      }
    }
  }
}

//These bitmaps go to 0-511 so that $LK,"Lex",A="MN:Lex"$() can use them with $LK,"Token Codes",A="MN:TK_EOF"$.
U32
  char_bmp_alpha[16]=
  {0x0000000,0x00000000,0x87FFFFFF,0x07FFFFFE,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},

  char_bmp_alpha_numeric[16]=
  {0x0000000,0x03FF0000,0x87FFFFFF,0x07FFFFFE,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},

  char_bmp_alpha_numeric_no_at[16]=
  {0x0000000,0x03FF0000,0x87FFFFFE,0x07FFFFFE,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},

  char_bmp_word[16]=
  {0x0000000,0x03FF0080,0x87FFFFFE,0x07FFFFFE,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},

  char_bmp_filename[16]=
  {0x0000000,0x03FF73FB,0xEFFFFFFF,0x6FFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},

  char_bmp_dec_numeric[16]=
  {0x0000000,0x03FF0000,0,0,0,0,0,0,0,0,0,0,0,0,0,0},

  char_bmp_hex_numeric[16]=
  {0x0000000,0x03FF0000,0x7E,0x7E,0,0,0,0,0,0,0,0,0,0,0,0},

  char_bmp_white_space[16]=
  {0x80002600,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0},

  char_bmp_non_eol_white_space[16]=
  {0x80000200,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0},

  char_bmp_zero_cr_nl_cursor[16]=
  {0x00002421,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0},

  char_bmp_zero_tab_cr_nl_cursor[16]=
  {0x00002621,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0},

  char_bmp_zero_tab_cr_nl_cursor_dollar[16]=
  {0x00002621,0x10,0,0,0,0,0,0,0,0,0,0,0,0,0,0},

  char_bmp_macro[16]=
  {0x80002600,0xFFFFFFDF,0xFFFFFFFF,0x7FFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},

  char_bmp_printable[16]=
  {0x80002600,0xFFFFFFFF,0xFFFFFFFF,0x7FFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},

  char_bmp_displayable[16]=
  {0x80000000,0xFFFFFFFF,0xFFFFFFFF,0x7FFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},

  char_bmp_safe_dollar[16]=
  {0x80000000,0xFFFFFFEF,0xFFFFFFFF,0x7FFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0,0,0,0,0,0,0,0},//same but no dollar sign

  char_bmp_non_eol[16]=
  {0xFFFFDBFE,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF};
