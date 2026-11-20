//Kernel/StrA.HC: the char_bmp_ tables, as the chars 0-511 each one holds.

U0 BmpPrint(U8 *name,U32 *bmp)
{
  I64 i;
  "%s:",name;
  for (i=0;i<512;i++)
    if (Bt(bmp,i))
      " %X",i;
  '\n';
}

U0 CharBmp()
{
  BmpPrint("alpha",char_bmp_alpha);
  BmpPrint("alpha_numeric",char_bmp_alpha_numeric);
  BmpPrint("alpha_numeric_no_at",char_bmp_alpha_numeric_no_at);
  BmpPrint("word",char_bmp_word);
  BmpPrint("filename",char_bmp_filename);
  BmpPrint("dec_numeric",char_bmp_dec_numeric);
  BmpPrint("hex_numeric",char_bmp_hex_numeric);
  BmpPrint("white_space",char_bmp_white_space);
  BmpPrint("non_eol_white_space",char_bmp_non_eol_white_space);
  BmpPrint("zero_cr_nl_cursor",char_bmp_zero_cr_nl_cursor);
  BmpPrint("zero_tab_cr_nl_cursor",char_bmp_zero_tab_cr_nl_cursor);
  BmpPrint("zero_tab_cr_nl_cursor_dollar",
	char_bmp_zero_tab_cr_nl_cursor_dollar);
  BmpPrint("macro",char_bmp_macro);
  BmpPrint("printable",char_bmp_printable);
  BmpPrint("displayable",char_bmp_displayable);
  BmpPrint("safe_dollar",char_bmp_safe_dollar);
  BmpPrint("non_eol",char_bmp_non_eol);
}

CharBmp;
