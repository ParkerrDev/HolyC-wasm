//V5.03 Adam/Gr/GrGlbls.HC's CGrGlbls: its layout, what GrInit2 sets in it
//and GrComposites.HC's DrawStdMs as gr.fp_draw_ms. Grid.HC swaps that.

U0 DrawMyMs(CDC *,I64,I64)
{
}

U0 GrGlblsChk()
{
  U0 (*old_draw_ms)(CDC *dc,I64 x,I64 y);
  "%d %d %d %d\n",offset(CGrGlbls.scrn_image),offset(CGrGlbls.dc),
	offset(CGrGlbls.text_base),offset(CGrGlbls.sprite_hash);
  "%d %d %d %d\n",offset(CGrGlbls.fp_final_scrn_update),
	offset(CGrGlbls.fp_draw_ms),offset(CGrGlbls.empty_sprite),
	offset(CGrGlbls.pen_brushes);
  "%d %d %d %d\n",offset(CGrGlbls.circle_lo),offset(CGrGlbls.scrn_zoom_tables),
	offset(CGrGlbls.scrn_zoom),offset(CGrGlbls.hide_col);
  "%d\n",sizeof(CGrGlbls);
  "%d %d\n",gr.scrn_zoom,gr.fp_draw_ms==&DrawStdMs;
  "%X %X %X\n",gr.to_8_bits[0x81],gr.to_8_colors[3],gr.to_8_colors[0xF0];
  old_draw_ms=gr.fp_draw_ms;
  gr.fp_draw_ms=&DrawMyMs;
  "%d\n",gr.fp_draw_ms==&DrawMyMs;
  gr.fp_draw_ms=old_draw_ms;
  "%d\n",gr.fp_draw_ms==&DrawStdMs;
}

GrGlblsChk;
